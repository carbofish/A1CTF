package models

import (
	"time"
)

const TableNameGameGroup = "game_groups"

// GameGroup 比赛分组模型
type GameGroup struct {
	GroupID      int64     `gorm:"column:group_id;primaryKey;autoIncrement" json:"group_id"`
	GameID       int64     `gorm:"column:game_id;not null" json:"game_id"`
	GroupName    string    `gorm:"column:group_name;not null" json:"group_name"`
	InviteCode   string    `gorm:"column:invite_code;type:uuid;default:gen_random_uuid()" json:"invite_code"`
	Description  *string   `gorm:"column:group_description" json:"group_description"`
	DisplayOrder int32     `gorm:"column:display_order;default:0" json:"display_order"`
	CreatedAt    time.Time `gorm:"column:created_at;default:CURRENT_TIMESTAMP" json:"created_at"`
	UpdatedAt    time.Time `gorm:"column:updated_at;default:CURRENT_TIMESTAMP" json:"updated_at"`

	// 关联
	Game  Game   `gorm:"foreignKey:GameID;references:game_id" json:"-"`
	Teams []Team `gorm:"foreignKey:GroupID;references:group_id" json:"teams"`
}

// TableName GameGroup's table name
func (*GameGroup) TableName() string {
	return TableNameGameGroup
}
