package jobs

import (
	"a1ctf/src/db/models"
	"a1ctf/src/tasks"
	dbtool "a1ctf/src/utils/db_tool"
	a1locks "a1ctf/src/utils/locks"
	noticetool "a1ctf/src/utils/notice_tool"
	"a1ctf/src/utils/zaphelper"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"go.uber.org/zap"
	"gorm.io/gorm"
)

func processQueueingJudge(judge *models.Judge) error {
	switch judge.JudgeType {
	case models.JudgeTypeDynamic:
		flagCorrect := false

		switch judge.Challenge.FlagType {
		case models.FlagTypeDynamic:
			// 动态和TeamFlag库里的比较
			flagCorrect = judge.JudgeContent == judge.TeamFlag.FlagContent
		case models.FlagTypeStatic:
			// 静态直接比较
			flagCorrect = judge.JudgeContent == *judge.GameChallenge.JudgeConfig.FlagTemplate
		}

		if flagCorrect {

			// 如果是系统管理员队伍，不插入 Solves，防止影响积分榜
			if judge.Team.TeamType == models.TeamTypeAdmin {
				judge.JudgeStatus = models.JudgeAC
				return nil
			}

			// 获取写锁, 防止与重算题目Rank的任务冲突
			a1locks.RankRWLock.Lock()
			defer a1locks.RankRWLock.Unlock()

			// 查询已经解出来的人
			var solves []models.Solve
			if err := dbtool.DB().Where("game_id = ? AND challenge_id = ? AND solve_time >= ? AND solve_time <= ? AND solve_status = ?", judge.GameID, judge.ChallengeID, judge.Game.StartTime, judge.Game.EndTime, models.SolveCorrect).Preload("Team").Find(&solves).Error; err != nil {
				judge.JudgeStatus = models.JudgeError
				if !errors.Is(err, gorm.ErrRecordNotFound) {
					// 记录错误
					tasks.LogJudgeOperation(nil, nil, models.ActionJudge, judge.JudgeID, map[string]interface{}{
						"team_id": judge.TeamID,
						"game_id": judge.GameID,
						"judge":   judge,
					}, err)
				}
				return fmt.Errorf("database error: %w data: %+v", err, judge)
			}

			// 过滤被封禁的队伍
			solves = filterValidSolves(solves)

			newSolve := models.Solve{
				IngameID:    judge.IngameID,
				JudgeID:     judge.JudgeID,
				SolveID:     uuid.NewString(),
				GameID:      judge.GameID,
				ChallengeID: judge.ChallengeID,
				TeamID:      judge.TeamID,
				SolveStatus: models.SolveCorrect,
				SolveTime:   time.Now().UTC(),
				SolverID:    judge.SubmiterID,
				Rank:        int32(len(solves) + 1),
			}

			if err := dbtool.DB().Create(&newSolve).Error; err != nil {
				judge.JudgeStatus = models.JudgeError
				return fmt.Errorf("database error: %w data: %+v", err, judge)
			}

			if newSolve.Rank <= 3 {
				var solveDetail = models.Solve{}

				if err := dbtool.DB().Where("solve_id = ?", newSolve.SolveID).Preload("Challenge").Preload("Team").First(&solveDetail).Error; err != nil {
					zaphelper.Logger.Error("Announce first blood error", zap.Error(err))
				}

				var noticeCate models.NoticeCategory

				// 现在由算分逻辑计算三血分数，不使用 score-adjustment

				if newSolve.Rank == 1 {
					noticeCate = models.NoticeFirstBlood
				} else if newSolve.Rank == 2 {
					noticeCate = models.NoticeSecondBlood
				} else {
					noticeCate = models.NoticeThirdBlood
				}

				go func() {
					noticetool.InsertNotice(judge.GameID, noticeCate, []string{solveDetail.Team.TeamName, solveDetail.Challenge.Name})
				}()
			}

			judge.JudgeStatus = models.JudgeAC
			return nil
		} else {
			judge.JudgeStatus = models.JudgeWA
			return nil
		}
	case models.JudgeTypeScript:
		judge.JudgeStatus = models.JudgeError
		return fmt.Errorf("dynamic judge not implemented now")
	default:
		judge.JudgeStatus = models.JudgeError
		return fmt.Errorf("unknown judge type: %s", judge.JudgeType)
	}
}

func FlagJudgeJob() {
	var judges []models.Judge
	if err := dbtool.DB().Where(
		"judge_status IN (?)",
		[]interface{}{models.JudgeQueueing, models.JudgeRunning},
	).Preload("TeamFlag").Preload("GameChallenge").Preload("Challenge").Preload("Team").Preload("Game").Find(&judges).Error; err != nil {
		fmt.Printf("database error: %v\n", err)
		return
	}

	for _, judge := range judges {
		if err := processQueueingJudge(&judge); err != nil {
			zaphelper.Logger.Error("Judge task failed", zap.Error(err), zap.Any("judge", judge))
		}

		if err := dbtool.DB().Save(&judge).Error; err != nil {
			fmt.Printf("database error: %v\n", err)
			continue
		}
	}
}
