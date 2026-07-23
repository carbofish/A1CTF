package tasks

import (
	"a1ctf/src/db/models"
	dbtool "a1ctf/src/utils/db_tool"
	"a1ctf/src/utils/ristretto_tool"
	"a1ctf/src/utils/zaphelper"
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/hibiken/asynq"
	"github.com/vmihailenco/msgpack/v5"
	"go.uber.org/zap"
)

type FlagAntiCheatPayload struct {
	Judge models.Judge `json:"judge"`
}

func NewFlagAntiCheatTask(judge models.Judge) error {
	payload, err := msgpack.Marshal(FlagAntiCheatPayload{Judge: judge})
	if err != nil {
		return err
	}

	task := asynq.NewTask(TypeAntiCheat, payload)
	// taskID 是为了防止重复创建任务
	_, err = client.Enqueue(task, asynq.TaskID(fmt.Sprintf("flag_antiCheat_%d_%d_%d", judge.TeamID, judge.GameID, judge.ChallengeID)),
		asynq.MaxRetry(100),
		asynq.Timeout(10*time.Second),
	)

	return err
}

func HandleFlagAntiCheatTask(ctx context.Context, t *asynq.Task) error {
	var p FlagAntiCheatPayload
	if err := msgpack.Unmarshal(t.Payload(), &p); err != nil {
		return fmt.Errorf("json.Unmarshal failed: %v: %w", err, asynq.SkipRetry)
	}

	var judge models.Judge
	dbtool.DB().Model(&models.Judge{}).Where("judge_id = ?", p.Judge.JudgeID).Preload("TeamFlag").Preload("Challenge").First(&judge)

	if judge.TeamFlag.FlagContent != judge.JudgeContent && judge.Challenge.FlagType == models.FlagTypeDynamic {
		// 如果 flag 不一致，需要检查是否是别的队伍的 Flag
		var teamFlag models.TeamFlag
		if err := dbtool.DB().Model(&models.TeamFlag{}).Where("flag_content = ? AND team_id != ?", judge.JudgeContent, judge.TeamID).Preload("Team").First(&teamFlag).Error; err == nil {
			// 找到了 flag 所属的队伍
			cheat := models.Cheat{
				CheatID:     uuid.NewString(),
				CheatType:   models.CheatSubmitSomeonesFlag,
				GameID:      judge.GameID,
				IngameID:    judge.IngameID,
				ChallengeID: judge.ChallengeID,
				TeamID:      judge.TeamID,
				FlagID:      &teamFlag.FlagID,
				JudgeID:     judge.JudgeID,
				SubmiterID:  judge.SubmiterID,
				CheatTime:   judge.JudgeTime,
				SubmiterIP:  judge.SubmiterIP,
				ExtraData: models.CheatExtraData{
					RelevantTeam:     teamFlag.TeamID,
					RelevantTeamName: teamFlag.Team.TeamName,
				},
			}

			if err := dbtool.DB().Create(cheat).Error; err != nil {
				zaphelper.Logger.Error("Failed to save cheat info for game ", zap.Error(err), zap.Int64("game_id", judge.GameID), zap.Any("cheat_data", cheat))
			}
		}
	}

	// Check if the team submitted the correct flag without downloading attachments
	if judge.JudgeStatus == models.JudgeAC || judge.TeamFlag.FlagContent == judge.JudgeContent {
		// Check if team has attachments for this challenge
		challengeAttachments, err := ristretto_tool.CachedChallengeAttachments(judge.ChallengeID)
		if err == nil && len(challengeAttachments) > 0 {
			// Check if any attachment was downloaded by this team
			hasDownloadedAttachment := false
			for _, attachment := range challengeAttachments {
				if attachment.AttachType == models.AttachmentTypeStaticFile || attachment.AttachType == models.AttachmentTypeDynamicFile {
					// Check download record
					var downloadRecord models.AttachmentDownload
					if err := dbtool.DB().Where("team_id = ? AND challenge_id = ? AND attach_id = ?", judge.TeamID, judge.ChallengeID, attachment.AttachID).First(&downloadRecord).Error; err == nil {
						hasDownloadedAttachment = true
						break
					}
				}
			}
			if !hasDownloadedAttachment {
				cheat := models.Cheat{
					CheatID:     uuid.NewString(),
					CheatType:   models.CheatSubmitWithoutDownloadAttachments,
					GameID:      judge.GameID,
					IngameID:    judge.IngameID,
					ChallengeID: judge.ChallengeID,
					TeamID:      judge.TeamID,
					FlagID:      &judge.TeamFlag.FlagID,
					JudgeID:     judge.JudgeID,
					SubmiterID:  judge.SubmiterID,
					CheatTime:   judge.JudgeTime,
					SubmiterIP:  judge.SubmiterIP,
					ExtraData: models.CheatExtraData{
						RelevantTeam:     judge.TeamID,
						RelevantTeamName: judge.Team.TeamName,
					},
				}
				if err := dbtool.DB().Create(&cheat).Error; err != nil {
					zaphelper.Logger.Error("Failed to save cheat info", zap.Error(err))
				}
			}
		}

		// Check if team submitted correct flag without starting container
		var containers []models.Container
		if err := dbtool.DB().Where("game_id = ? AND team_id = ? AND challenge_id = ? AND container_status != ? AND container_status != ?",
			judge.GameID, judge.TeamID, judge.ChallengeID, models.ContainerStopped, models.ContainerError).Find(&containers).Error; err == nil {
			if len(containers) == 0 {
				// No active container found - check if they ever started one
				var anyContainer models.Container
				if err := dbtool.DB().Where("game_id = ? AND team_id = ? AND challenge_id = ?", judge.GameID, judge.TeamID, judge.ChallengeID).First(&anyContainer).Error; err != nil {
					// Team never started a container but submitted correct flag
					cheat := models.Cheat{
						CheatID:     uuid.NewString(),
						CheatType:   models.CheatSubmitWithoutStartContainer,
						GameID:      judge.GameID,
						IngameID:    judge.IngameID,
						ChallengeID: judge.ChallengeID,
						TeamID:      judge.TeamID,
						FlagID:      &judge.TeamFlag.FlagID,
						JudgeID:     judge.JudgeID,
						SubmiterID:  judge.SubmiterID,
						CheatTime:   judge.JudgeTime,
						SubmiterIP:  judge.SubmiterIP,
						ExtraData: models.CheatExtraData{
							RelevantTeam:     judge.TeamID,
							RelevantTeamName: judge.Team.TeamName,
						},
					}
					if err := dbtool.DB().Create(&cheat).Error; err != nil {
						zaphelper.Logger.Error("Failed to save cheat info", zap.Error(err))
					}
				}
			}
		}
	}

	return nil
}
