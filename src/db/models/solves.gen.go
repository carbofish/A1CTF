package models

import (
	"database/sql/driver"
	"errors"
	"time"

	"github.com/bytedance/sonic"
)

const TableNameSolve = "solves"

type SolveStatus string

const (
	SolveCorrect SolveStatus = "SolveCorrect"
	SolveInvalid SolveStatus = "SolveInvalid"
)

func (e SolveStatus) Value() (driver.Value, error) {
	return sonic.Marshal(e)
}

func (e *SolveStatus) Scan(value interface{}) error {
	b, ok := value.([]byte)
	if !ok {
		return errors.New("type assertion to []byte failed")
	}
	return sonic.Unmarshal(b, e)
}

// Judge mapped from table <judges>
type Solve struct {
	JudgeID       string        `gorm:"column:judge_id;not null" json:"judge_id"`
	Judge         Judge         `gorm:"foreignKey:JudgeID;references:judge_id" json:"-"`
	SolveID       string        `gorm:"column:solve_id;primaryKey" json:"solve_id"`
	IngameID      int64         `gorm:"column:ingame_id;not null" json:"ingame_id"`
	GameChallenge GameChallenge `gorm:"foreignKey:IngameID;references:ingame_id" json:"-"`
	ChallengeID   int64         `gorm:"column:challenge_id;not null" json:"challenge_id"`
	Challenge     Challenge     `gorm:"foreignKey:ChallengeID;references:challenge_id" json:"-"`
	TeamID        int64         `gorm:"column:team_id;not null" json:"team_id"`
	Team          Team          `gorm:"foreignKey:TeamID;references:team_id" json:"-"`
	GameID        int64         `gorm:"column:game_id;not null" json:"game_id"`
	Game          Game          `gorm:"foreignKey:GameID;references:game_id" json:"-"`
	ContainerID   *string       `gorm:"column:container_id" json:"container_id"`
	SolveStatus   SolveStatus   `gorm:"column:solve_status" json:"solve_status"`
	SolverID      string        `gorm:"column:solver_id;not null" json:"solver_uuid"`
	Solver        User          `gorm:"foreignKey:SolverID;references:user_id" json:"-"`
	SolveTime     time.Time     `gorm:"column:solve_time;not null" json:"solve_time"`
	Rank          int32         `gorm:"column:rank" json:"rank"`
}

// TableName Judge's table name
func (*Solve) TableName() string {
	return TableNameSolve
}
