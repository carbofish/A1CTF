package models

import (
	"database/sql/driver"
	"errors"
	"time"

	"github.com/bytedance/sonic"
)

const TableNameGameChallenge = "game_challenges"

type Hint struct {
	Content    string    `json:"content"`
	CreateTime time.Time `json:"create_time"`
	Visible    bool      `json:"visible"`
	// ReleaseTime 定时放出时间（绝对时间，可选）。为 nil 表示不定时，保持原有行为；
	// 非 nil 时，即使 Visible 为 true，也要到该时间之后才对选手可见。
	ReleaseTime *time.Time `json:"release_time"`
}

// IsReleased 判断 hint 在 now 时刻是否已到放出时间，未设置放出时间的 hint 视为已放出
func (h Hint) IsReleased(now time.Time) bool {
	return h.ReleaseTime == nil || !now.Before(*h.ReleaseTime)
}

type Hints []Hint

// SplitByRelease 按 now 时刻把 hint 分为已放出和待放出两部分，返回已放出的 hint、
// 待放出 hint 的数量以及最近一次放出时间（没有待放出 hint 时为 nil）。
// 调用方应先过滤掉 Visible 为 false 的 hint，避免泄露隐藏 hint 的数量。
func (e Hints) SplitByRelease(now time.Time) (released Hints, pendingCount int, nextRelease *time.Time) {
	released = make(Hints, 0, len(e))
	for _, hint := range e {
		if hint.IsReleased(now) {
			released = append(released, hint)
			continue
		}
		pendingCount++
		if nextRelease == nil || hint.ReleaseTime.Before(*nextRelease) {
			t := *hint.ReleaseTime
			nextRelease = &t
		}
	}
	return released, pendingCount, nextRelease
}

func (e Hints) Value() (driver.Value, error) {
	return sonic.Marshal(e)
}

func (e *Hints) Scan(value interface{}) error {
	b, ok := value.([]byte)
	if !ok {
		return errors.New("type assertion to []byte failed")
	}
	return sonic.Unmarshal(b, e)
}

type GameChallenge struct {
	IngameID     int64        `gorm:"column:ingame_id;primaryKey;autoIncrement:true" json:"ingame_id"`
	GameID       int64        `gorm:"column:game_id;not null" json:"game_id"`
	Game         Game         `gorm:"foreignKey:GameID;references:game_id" json:"-"`
	ChallengeID  int64        `gorm:"column:challenge_id;not null" json:"challenge_id"`
	Challenge    Challenge    `gorm:"foreignKey:ChallengeID;references:challenge_id" json:"-"`
	TotalScore   float64      `gorm:"column:total_score;not null" json:"total_score"`
	CurScore     float64      `gorm:"column:cur_score;not null" json:"cur_score"`
	SolveCount   int32        `gorm:"column:solve_count" json:"solve_count"`
	MinimalScore float64      `gorm:"column:minimal_score" json:"minimal_score"`
	Difficulty   float64      `gorm:"column:difficulty" json:"difficulty"`
	Hints        *Hints       `gorm:"column:hints;default:{}" json:"hints"`
	JudgeConfig  *JudgeConfig `gorm:"column:judge_config" json:"judge_config"`
	BelongStage  *string      `gorm:"column:belong_stage" json:"belong_stage"`
	Visible      bool         `gorm:"column:visible" json:"visible"`

	BloodRewardEnabled bool `gorm:"column:enable_blood_reward" json:"enable_blood_reward"`
	// Challenge Challenge `gorm:"foreignKey:challenge_id;references:challenges.challenge_id"`
}

// TableName GameChallenge's table name
func (*GameChallenge) TableName() string {
	return TableNameGameChallenge
}
