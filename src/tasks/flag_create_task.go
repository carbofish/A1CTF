package tasks

import (
	"a1ctf/src/db/models"
	dbtool "a1ctf/src/utils/db_tool"
	"a1ctf/src/utils/general"
	"context"
	"errors"
	"fmt"
	"slices"
	"time"

	"a1ctf/src/utils/zaphelper"

	"github.com/hibiken/asynq"
	"github.com/vmihailenco/msgpack/v5"
	"go.uber.org/zap"
	"gorm.io/gorm"
)

type CreateTeamFlagPayload struct {
	FlagTemplate string
	TeamID       int64
	GameID       int64
	ChallengeID  int64
	TeamHash     string
	TeamName     string
	FlagType     models.FlagType
}

func NewTeamFlagCreateTask(flagTemplate string, teamID int64, gameID int64, challengeID int64, teamHash string, teamName string, flagType models.FlagType) error {
	payload, err := msgpack.Marshal(CreateTeamFlagPayload{FlagTemplate: flagTemplate, TeamID: teamID, GameID: gameID, ChallengeID: challengeID, TeamHash: teamHash, TeamName: teamName, FlagType: flagType})
	if err != nil {
		return err
	}

	task := asynq.NewTask(TypeNewTeamFlag, payload)
	// taskID 是为了防止重复创建任务
	_, err = client.Enqueue(task, asynq.TaskID(fmt.Sprintf("teamFlag_create_%d_%d_%d", teamID, gameID, challengeID)),
		asynq.MaxRetry(100),
		asynq.Timeout(10*time.Second),
	)

	return err
}

func HandleTeamCreateTask(ctx context.Context, t *asynq.Task) error {
	var p CreateTeamFlagPayload
	if err := msgpack.Unmarshal(t.Payload(), &p); err != nil {
		return fmt.Errorf("json.Unmarshal failed: %v: %w", err, asynq.SkipRetry)
	}

	var existingFlag models.TeamFlag
	result := dbtool.DB().Where("team_id = ? AND game_id = ? AND challenge_id = ?", p.TeamID, p.GameID, p.ChallengeID).First(&existingFlag)
	if result.Error == nil {
		// 已经有 FLAG
		return fmt.Errorf("[TeamID: %d, GameID: %d, ChallengeID: %d] team already has the flag: %w", p.TeamID, p.GameID, p.ChallengeID, asynq.SkipRetry)
	}

	var flags []string
	if err := dbtool.DB().Model(&models.TeamFlag{}).Where("game_id = ? AND challenge_id = ?", p.GameID, p.ChallengeID).Pluck("flag_content", &flags).Error; err != nil {
		return fmt.Errorf("failed to get flags: %w", err)
	}

	flagFounded := false
	flag := ""
	maxTryTimes := 100

	for !flagFounded {

		if maxTryTimes <= 0 {
			err := fmt.Errorf("[TeamID: %d, GameID: %d, ChallengeID: %d] leet space don't enough for template %s %w", p.TeamID, p.GameID, p.ChallengeID, p.FlagTemplate, asynq.SkipRetry)
			zaphelper.Logger.Error("Failed to create flag for team", zap.Int64("team_id", p.TeamID), zap.Int64("game_id", p.GameID), zap.Int64("challenge_id", p.ChallengeID), zap.Error(err))
			return err
		}

		flag = general.ProcessFlag(p.FlagTemplate, map[string]string{
			"team_id":      fmt.Sprintf("%d", p.TeamID),
			"game_id":      fmt.Sprintf("%d", p.GameID),
			"challenge_id": fmt.Sprintf("%d", p.ChallengeID),
			"team_hash":    p.TeamHash,
			"team_name":    p.TeamName,
		}, p.FlagType == models.FlagTypeDynamic)

		if slices.Contains(flags, flag) {
			maxTryTimes--
			continue
		}

		flagFounded = true
	}

	err := dbtool.DB().Create(&models.TeamFlag{
		GameID:      p.GameID,
		ChallengeID: p.ChallengeID,
		TeamID:      p.TeamID,
		FlagContent: flag,
	}).Error

	if err == nil {
		zaphelper.Logger.Info("Successfully created flag for team", zap.Int64("team_id", p.TeamID), zap.Int64("game_id", p.GameID), zap.Int64("challenge_id", p.ChallengeID))
		return nil
	}

	if errors.Is(err, gorm.ErrDuplicatedKey) {
		// 任务重试
		return fmt.Errorf("[TeamID: %d, GameID: %d, ChallengeID: %d] flag already exists for %s, retry", p.TeamID, p.GameID, p.ChallengeID, flag)
	}

	return fmt.Errorf("failed to create flag: %w", err)
}
