package models

import "time"

const TableNameTeamWriteup = "team_writeups"

// TeamWriteup mapped from table <team_writeups>
type TeamWriteup struct {
	WriteupID   int64     `gorm:"column:writeup_id;primaryKey;autoIncrement" json:"writeup_id"`
	GameID      int64     `gorm:"column:game_id;not null" json:"game_id"`
	TeamID      int64     `gorm:"column:team_id;not null" json:"team_id"`
	UploadID    string    `gorm:"column:upload_id;not null" json:"upload_id"`
	SubmittedBy *string   `gorm:"column:submitted_by" json:"submitted_by"`
	FileName    string    `gorm:"column:file_name;not null" json:"file_name"`
	FileSize    int64     `gorm:"column:file_size;not null" json:"file_size"`
	FileType    string    `gorm:"column:file_type;not null" json:"file_type"`
	CreatedAt   time.Time `gorm:"column:created_at;not null" json:"created_at"`
	UpdatedAt   time.Time `gorm:"column:updated_at;not null" json:"updated_at"`

	Team *Team `gorm:"foreignKey:TeamID;references:team_id" json:"team,omitempty"`
}

// TableName TeamWriteup's table name
func (*TeamWriteup) TableName() string {
	return TableNameTeamWriteup
}
