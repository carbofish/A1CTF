package webmodels

import (
	"a1ctf/src/db/models"
)

// Game challenge payloads

type UserAttachmentConfig struct {
	AttachName   string                `json:"attach_name"`
	AttachType   models.AttachmentType `json:"attach_type"`
	AttachURL    *string               `json:"attach_url,omitempty"`
	AttachHash   *string               `json:"attach_hash,omitempty"`
	DownloadHash *string               `json:"download_hash,omitempty"`
}

type UserCreateTeamPayload struct {
	Name        string  `json:"name" binding:"required"`
	Description string  `json:"description"`
	Slogan      string  `json:"slogan"`
	GroupID     *int64  `json:"group_id"`
	InviteCode  *string `json:"invite_code"`
}

type UserSubmitFlagPayload struct {
	FlagContent string `json:"flag" binding:"required,printascii"`
}

// Authorization payloads

type RegisterPayload struct {
	Username string `json:"username" binding:"required,min=2,max=20"`
	Password string `json:"password" binding:"required,password"`
	Email    string `json:"email" binding:"required,email"`
	Captcha  string `json:"captcha"`
}

// Admin payloads

type AdminUpdateGamePayload struct {
	models.Game
	Challenges []models.GameChallenge `json:"challenges"`
}

type AdminUpdateGameChallengePayload struct {
	models.GameChallenge
}

type AdminListGamePayload struct {
	Size   int `json:"size" binding:"min=0"`
	Offset int `json:"offset"`
}

type AdminAddGameChallengePayload struct {
	GameID      int64 `json:"game_id" binding:"min=0"`
	ChallengeID int64 `json:"challenge_id" binding:"min=0"`
}

type AdminListUsersPayload struct {
	Size   int    `json:"size" binding:"min=0"`
	Offset int    `json:"offset"`
	Search string `json:"search"`
}

type AdminListTeamsPayload struct {
	GameID int    `json:"game_id"`
	Size   int    `json:"size" binding:"min=0"`
	Offset int    `json:"offset"`
	Search string `json:"search"`
}

type AdminTeamOperationPayload struct {
	TeamID int64 `json:"team_id" binding:"required"`
	GameID int64 `json:"game_id"`
}

// Admin Container payloads

// AdminUpdateUserPayload 用户管理的负载
type AdminUpdateUserPayload struct {
	UserID    string          `json:"user_id" binding:"required"`
	UserName  string          `json:"user_name" binding:"required"`
	RealName  *string         `json:"real_name"`
	StudentID *string         `json:"student_id"`
	Phone     *string         `json:"phone"`
	Slogan    *string         `json:"slogan"`
	Email     *string         `json:"email"`
	Avatar    *string         `json:"avatar"`
	Role      models.UserRole `json:"role" binding:"required"`
}

// AdminUserOperationPayload 用户操作的负载
type AdminUserOperationPayload struct {
	UserID string `json:"user_id" binding:"required"`
}

// 容器列表请求参数
type AdminListContainersPayload struct {
	GameID      int    `json:"game_id"`
	Size        int    `json:"size" binding:"min=0"`
	Offset      int    `json:"offset"`
	Search      string `json:"search"`
	ChallengeID int    `json:"challenge_id"`
	ShowFailed  bool   `json:"show_failed"`
}

// 容器操作请求参数
type AdminContainerOperationPayload struct {
	ContainerID string `json:"container_id" binding:"required"`
}

// 延长容器生命周期请求参数
type AdminExtendContainerPayload struct {
	ContainerID string `json:"container_id" binding:"required"`
}

// Team management payloads

type TeamJoinPayload struct {
	InviteCode string `json:"invite_code" binding:"required"`
}

type HandleJoinRequestPayload struct {
	Action string `json:"action" binding:"required,oneof=approve reject"` // "approve" or "reject"
}

type TransferCaptainPayload struct {
	NewCaptainID string `json:"new_captain_id" binding:"required"`
}

type UpdateTeamInfoPayload struct {
	TeamSlogan *string `json:"team_slogan"`
}

// 分组管理相关的请求模型
type CreateGameGroupPayload struct {
	GroupName   string `json:"group_name" binding:"required"`
	Description string `json:"description"`
}

type UpdateGameGroupPayload struct {
	GroupName   string `json:"group_name" binding:"required"`
	Description string `json:"description"`
}

// 公告管理相关的请求模型
type AdminCreateNoticePayload struct {
	GameID  int64  `json:"game_id" binding:"required"`
	Title   string `json:"title" binding:"required"`
	Content string `json:"content" binding:"required"`
}

type AdminListNoticesPayload struct {
	GameID int `json:"game_id" binding:"required"`
	Size   int `json:"size" binding:"min=0"`
	Offset int `json:"offset"`
}

type AdminDeleteNoticePayload struct {
	NoticeID int64 `json:"notice_id" binding:"required"`
}

// 分数修正管理相关的请求模型
type CreateScoreAdjustmentPayload struct {
	TeamID         int64   `json:"team_id" binding:"required"`
	AdjustmentType string  `json:"adjustment_type" binding:"required,oneof=cheat reward other"`
	ScoreChange    float64 `json:"score_change" binding:"required"`
	Reason         string  `json:"reason" binding:"required"`
}

type UpdateScoreAdjustmentPayload struct {
	AdjustmentType string  `json:"adjustment_type" binding:"required,oneof=cheat reward other"`
	ScoreChange    float64 `json:"score_change" binding:"required"`
	Reason         string  `json:"reason" binding:"required"`
}

type SystemResourceType string

const (
	SystemIconLight          SystemResourceType = "svgIconLight"
	SystemIconDark           SystemResourceType = "svgIconDark"
	TrophysGold              SystemResourceType = "trophysGold"
	TrophysSilver            SystemResourceType = "trophysSilver"
	TrophysBronze            SystemResourceType = "trophysBronze"
	SchoolLogo               SystemResourceType = "schoolLogo"
	SchoolSmallIcon          SystemResourceType = "schoolSmallIcon"
	FancyBackGroundIconWhite SystemResourceType = "fancyBackGroundIconWhite"
	FancyBackGroundIconBlack SystemResourceType = "fancyBackGroundIconBlack"
	GameIconLight            SystemResourceType = "gameIconLight"
	GameIconDark             SystemResourceType = "gameIconDark"
)

// 用户个人资料更新
type UpdateUserProfilePayload struct {
	RealName  *string `json:"realname"`
	StudentID *string `json:"student_number"`
	Phone     *string `json:"phone"`
	Slogan    *string `json:"slogan"`
	UserName  *string `json:"username" binding:"required,min=2,max=20"`
}

type UpdateUserEmailPayload struct {
	NewEmail string `json:"email" binding:"required,email"`
}

type EmailVerifyPayload struct {
	Code string `json:"code" binding:"required"`
}

type ChangePasswordPayload struct {
	OldPassword string `json:"old_password" binding:"required,password"`
	NewPassword string `json:"new_password" binding:"required,password"`
}

type ForgetPasswordWithVerifyCodePayload struct {
	Code        string `json:"code" binding:"required"`
	NewPassword string `json:"new_password" binding:"required,password"`
}

type ForgetPasswordSendMailPayload struct {
	Email string `json:"email" binding:"email"`
}

type UserGetGroupInviteCodeGroupPayload struct {
	InviteCode string `json:"invite_code" binding:"required,uuid4"`
}
