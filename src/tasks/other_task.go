package tasks

import (
	"a1ctf/src/db/models"
	dbtool "a1ctf/src/utils/db_tool"
	a1locks "a1ctf/src/utils/locks"
	"a1ctf/src/utils/zaphelper"
	"context"
	"fmt"
	"time"

	"github.com/hibiken/asynq"
	"github.com/vmihailenco/msgpack/v5"
	"go.uber.org/zap"
	"gorm.io/gorm"
)

type OtherTask string

const (
	RecalculateRankForAChallenge OtherTask = "recalculateRankForAChallenge"
)

type RecalculateRankForAChallengeData struct {
	ChallengeIDList []int64
	GameID          int64
}

func NewRecalculateRankForAChallengeTask(gameID int64, challengeIDList []int64) error {
	if err := checkEmailConfig(); err != nil {
		return err
	}

	payload, err := msgpack.Marshal(RecalculateRankForAChallengeData{
		ChallengeIDList: challengeIDList,
		GameID:          gameID,
	})

	if err != nil {
		return err
	}

	task := asynq.NewTask(TypeRecalculateRankForAChallenge, payload)
	// taskID 是为了防止重复创建任务
	_, err = client.Enqueue(task,
		asynq.MaxRetry(3),
		asynq.Timeout(10*time.Second),
	)

	return err
}

func HandleRecalculateRankForAChallengeTask(ctx context.Context, t *asynq.Task) error {
	var p RecalculateRankForAChallengeData
	if err := msgpack.Unmarshal(t.Payload(), &p); err != nil {
		return fmt.Errorf("json.Unmarshal failed: %v: %w", err, asynq.SkipRetry)
	}

	zaphelper.Logger.Info("recalculate rank start", zap.Any("rank_data", p))

	// 先上锁
	a1locks.RankRWLock.Lock()
	defer a1locks.RankRWLock.Unlock()

	return dbtool.DB().WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var game models.Game
		if err := tx.Where("game_id = ?", p.GameID).First(&game).Error; err != nil {
			zaphelper.Logger.Error("failed to fetch game for recalculating ranks", zap.Error(err), zap.Any("data", p))
			return fmt.Errorf("database error %w", asynq.SkipRetry)
		}

		for _, challengeID := range p.ChallengeIDList {
			var solves []models.Solve
			if err := tx.Where("game_id = ? AND challenge_id = ? AND solve_time >= ? AND solve_time <= ? AND solve_status = ?", p.GameID, challengeID, game.StartTime, game.EndTime, models.SolveCorrect).Order("solve_time ASC").Preload("Team").Find(&solves).Error; err != nil {
				zaphelper.Logger.Error("failed to fetch solves for recalculating ranks", zap.Error(err), zap.Any("data", p))
				return fmt.Errorf("database error %w", asynq.SkipRetry)
			}

			if len(solves) == 0 {
				zaphelper.Logger.Info("no solves to rank", zap.Int64("game_id", p.GameID), zap.Int64("challenge_id", challengeID))
				continue
			}

			var curRank int32 = 1
			for idx, solve := range solves {
				if solve.Team.TeamStatus != models.ParticipateApproved {
					continue
				}
				solves[idx].Rank = curRank
				curRank++
			}

			if err := tx.Save(&solves).Error; err != nil {
				zaphelper.Logger.Error("failed to update solves for recalculating ranks", zap.Error(err), zap.Any("data", p))
				return fmt.Errorf("database error: %w %w", err, asynq.SkipRetry)
			}

			zaphelper.Logger.Info("recalculated ranks for challenge",
				zap.Int64("game_id", p.GameID),
				zap.Int64("challenge_id", challengeID),
				zap.Int("num_solves", len(solves)),
			)
		}

		zaphelper.Logger.Info("recalculate rank finished", zap.Any("rank_data", p))
		return nil
	})
}
