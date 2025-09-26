package models

import (
	"database/sql/driver"
	"errors"
	"time"

	"github.com/bytedance/sonic"
)

const TableNameGame = "games"

type GameStage struct {
	StageName string    `json:"stage_name"`
	StartTime time.Time `json:"start_time"`
	EndTime   time.Time `json:"end_time"`
}

type GameStages []GameStage

func (e GameStages) Value() (driver.Value, error) {
	return sonic.Marshal(e)
}

func (e *GameStages) Scan(value interface{}) error {
	b, ok := value.([]byte)
	if !ok {
		return errors.New("type assertion to []byte failed")
	}
	return sonic.Unmarshal(b, e)
}

type TeamPolicy string

const (
	TeamPolicyManual TeamPolicy = "Manual"
	TeamPolicyAuto   TeamPolicy = "Auto"
)

func (e TeamPolicy) Value() (driver.Value, error) {
	return sonic.Marshal(e)
}

func (e *TeamPolicy) Scan(value interface{}) error {
	b, ok := value.([]byte)
	if !ok {
		return errors.New("type assertion to []byte failed")
	}
	return sonic.Unmarshal(b, e)
}

// Game mapped from table <games>
type Game struct {
	GameID                 int64       `gorm:"column:game_id;primaryKey;autoIncrement:true" json:"game_id"`
	Name                   string      `gorm:"column:name;not null" json:"name"`
	Summary                *string     `gorm:"column:summary" json:"summary"`
	Description            *string     `gorm:"column:description" json:"description"`
	Poster                 *string     `gorm:"column:poster" json:"poster"`
	InviteCode             *string     `gorm:"column:invite_code" json:"invite_code"`
	StartTime              time.Time   `gorm:"column:start_time;not null" json:"start_time"`
	EndTime                time.Time   `gorm:"column:end_time;not null" json:"end_time"`
	PracticeMode           bool        `gorm:"column:practice_mode;not null" json:"practice_mode"`
	TeamNumberLimit        int32       `gorm:"column:team_number_limit;not null" json:"team_number_limit"`
	ContainerNumberLimit   int32       `gorm:"column:container_number_limit;not null" json:"container_number_limit"`
	RequireWp              bool        `gorm:"column:require_wp;not null" json:"require_wp"`
	WpExpireTime           time.Time   `gorm:"column:wp_expire_time;not null" json:"wp_expire_time"`
	Stages                 *GameStages `gorm:"column:stages;not null" json:"stages"`
	Visible                bool        `gorm:"column:visible;not null" json:"visible"`
	GameIconLight          *string     `gorm:"column:game_icon_light" json:"game_icon_light"`
	GameIconDark           *string     `gorm:"column:game_icon_dark" json:"game_icon_dark"`
	TeamPolicy             TeamPolicy  `gorm:"column:team_policy;not null" json:"team_policy"`
	GroupInviteCodeEnabled bool        `gorm:"column:group_invite_code_enable;default:false" json:"group_invite_code_enable"`

	FirstBloodReward  int64 `gorm:"column:first_blood_reward" json:"first_blood_reward"`
	SecondBloodReward int64 `gorm:"column:second_blood_reward" json:"second_blood_reward"`
	ThirdBloodReward  int64 `gorm:"column:third_blood_reward" json:"third_blood_reward"`
}

// TableName Game's table name
func (*Game) TableName() string {
	return TableNameGame
}
