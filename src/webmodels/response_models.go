package webmodels

import (
	"a1ctf/src/db/models"
	"time"
)

// Error response

type ErrorMessage struct {
	Code    int64  `json:"code"`
	Message string `json:"message"`
}

// User Game Controller

type UserGameSimpleInfo struct {
	GameID                 int64     `json:"game_id"`
	Name                   string    `json:"name"`
	Summary                *string   `json:"summary"`
	StartTime              time.Time `json:"start_time"`
	GroupInviteCodeEnabled bool      `json:"group_invite_code_enabled"`
	EndTime                time.Time `json:"end_time"`
	Visible                bool      `json:"visible"`
	Poster                 *string   `json:"poster"`
	LightIcon              *string   `json:"light_icon"`
	DarkIcon               *string   `json:"dark_icon"`
}

type UserFullGameInfo struct {
	GameID               int64                      `json:"game_id"`
	Name                 string                     `json:"name"`
	Summary              *string                    `json:"summary"`
	Description          *string                    `json:"description"`
	Poster               *string                    `json:"poster"`
	StartTime            time.Time                  `json:"start_time"`
	EndTime              time.Time                  `json:"end_time"`
	PracticeMode         bool                       `json:"practice_mode"`
	TeamNumberLimit      int32                      `json:"team_number_limit"`
	ContainerNumberLimit int32                      `json:"container_number_limit"`
	RequireWP            bool                       `json:"require_wp"`
	WPExpireTime         time.Time                  `json:"wp_expire_time"`
	Stages               *models.GameStages         `json:"stages"`
	Visible              bool                       `json:"visible"`
	TeamStatus           models.ParticipationStatus `json:"team_status"`
	TeamInfo             *models.Team               `json:"team_info"`
}

type UserSimpleGameSolvedChallenge struct {
	ChallengeID   int64     `json:"challenge_id"`
	ChallengeName string    `json:"challenge_name"`
	SolveTime     time.Time `json:"solve_time"`
	Rank          int32     `json:"rank"`
}

type UserSimpleGameChallenge struct {
	ChallengeID   int64                    `json:"challenge_id"`
	ChallengeName string                   `json:"challenge_name"`
	TotalScore    float64                  `json:"total_score"`
	CurScore      float64                  `json:"cur_score"`
	SolveCount    int32                    `json:"solve_count"`
	Category      models.ChallengeCategory `json:"category"`
	Visible       bool                     `json:"visible"`
	BelongStage   *string                  `json:"belong_stage"`
}

type ExposePortInfo struct {
	ContainerName  string             `json:"container_name"`
	ContainerPorts models.ExposePorts `json:"container_ports"`
}

type UserDetailGameChallenge struct {
	ChallengeID         int64                         `json:"challenge_id"`
	ChallengeName       string                        `json:"challenge_name"`
	Description         string                        `json:"description"`
	TotalScore          float64                       `json:"total_score"`
	CurScore            float64                       `json:"cur_score"`
	Hints               models.Hints                  `json:"hints"`
	BelongStage         *string                       `json:"belong_stage"`
	SolveCount          int32                         `json:"solve_count"`
	Category            models.ChallengeCategory      `json:"category"`
	Attachments         []UserAttachmentConfig        `json:"attachments"`
	ContainerType       models.ChallengeContainerType `json:"container_type"`
	ContainerStatus     models.ContainerStatus        `json:"container_status"`
	ContainerExpireTime *time.Time                    `json:"container_expiretime"`
	Containers          []ExposePortInfo              `json:"containers"`
	Visible             bool                          `json:"visible"`
}

type GameNotice struct {
	NoticeID       int64                 `json:"notice_id"`
	NoticeCategory models.NoticeCategory `json:"notice_category"`
	Data           []string              `json:"data"`
	CreateTime     time.Time             `json:"create_time"`
}

type GameScoreboardData struct {
	GameID         int64                 `json:"game_id"`
	Name           string                `json:"name"`
	Top10TimeLines []TimeLineItemLowCost `json:"top10_timelines"`
	TeamScores     []TeamScoreItem       `json:"teams"`
	// TeamTimeLines        []TimeLineItemLowCost     `json:"team_timelines"`
	YourTeam             *TeamScoreItem            `json:"your_team"`
	SimpleGameChallenges []UserSimpleGameChallenge `json:"challenges"`
	Groups               []GameGroupSimple         `json:"groups"`
	CurrentGroup         *GameGroupSimple          `json:"current_group"`
	Pagination           *PaginationInfo           `json:"pagination"`
}

// Admin User Controller

type AdminListUserItem struct {
	UserID        string          `json:"user_id"`
	UserName      string          `json:"user_name"`
	RealName      *string         `json:"real_name"`
	StudentID     *string         `json:"student_id"`
	Phone         *string         `json:"phone"`
	Slogan        *string         `json:"slogan"`
	RegisterTime  time.Time       `json:"register_time"`
	LastLoginTime time.Time       `json:"last_login_time"`
	LastLoginIP   *string         `json:"last_login_ip"`
	Email         *string         `json:"email"`
	Avatar        *string         `json:"avatar"`
	Role          models.UserRole `json:"role"`
	EmailVerified bool            `json:"email_verified"`
	RegisterIP    *string         `json:"register_ip"`
}

type AdminSimpleTeamMemberInfo struct {
	Avatar   *string `json:"avatar"`
	UserName string  `json:"user_name"`
	UserID   string  `json:"user_id"`
}

// 添加一个新的结构体用于团队成员信息
type TeamMemberInfo struct {
	Avatar   *string `json:"avatar"`
	UserName string  `json:"user_name"`
	UserID   string  `json:"user_id"`
	Captain  bool    `json:"captain"`
}

type AdminListTeamItem struct {
	TeamID     int64                       `json:"team_id"`
	TeamName   string                      `json:"team_name"`
	TeamAvatar *string                     `json:"team_avatar"`
	TeamSlogan *string                     `json:"team_slogan"`
	GroupName  *string                     `json:"group_name"`
	GroupID    *int64                      `json:"group_id"`
	Members    []AdminSimpleTeamMemberInfo `json:"members"`
	Status     models.ParticipationStatus  `json:"status"`
	Score      float64                     `json:"score"`
}

type TimeLineScoreItem struct {
	RecordTime int64   `json:"record_time"`
	Score      float64 `json:"score"`
}

type TimeLineItem struct {
	TeamID   int64               `json:"team_id"`
	TeamName string              `json:"team_name"`
	Scores   []TimeLineScoreItem `json:"scores"`
}

// 减少传输占用的 model

type TimeLineItemLowCost struct {
	TeamID   int64   `json:"team_id"`
	TeamName string  `json:"team_name"`
	Scores   []int64 `json:"scores"`
	Times    []int64 `json:"times"`
	TimeBase int64   `json:"time_base"`
}

type TeamSolveItem struct {
	ChallengeID   int64     `json:"challenge_id"`
	Score         float64   `json:"score"`
	Solver        string    `json:"solver"`
	Rank          int64     `json:"rank"`
	SolveTime     time.Time `json:"solve_time"`
	BloodReward   float64   `json:"blood_reward"`
	ChallengeName string    `json:"challenge_name"`
}

type TeamScoreAdjustmentItem struct {
	AdjustmentID   int64     `json:"adjustment_id"`
	AdjustmentType string    `json:"adjustment_type"`
	ScoreChange    float64   `json:"score_change"`
	Reason         string    `json:"reason"`
	CreatedAt      time.Time `json:"created_at"`
}

type TeamScoreItem struct {
	TeamID           int64                     `json:"team_id"`
	TeamName         string                    `json:"team_name"`
	TeamAvatar       *string                   `json:"team_avatar"`
	TeamSlogan       *string                   `json:"team_slogan"`
	Members          []TeamMemberInfo          `json:"team_members"`
	TeamDescription  *string                   `json:"team_description"`
	Rank             int64                     `json:"rank"`
	Score            float64                   `json:"score"`
	Penalty          int64                     `json:"penalty"` // 罚时（秒）
	GroupID          *int64                    `json:"group_id"`
	GroupName        *string                   `json:"group_name"`
	SolvedChallenges []TeamSolveItem           `json:"solved_challenges"`
	ScoreAdjustments []TeamScoreAdjustmentItem `json:"score_adjustments"`
	LastSolveTime    int64                     `json:"last_solve_time"`
}

type CachedGameScoreBoardData struct {
	FinalScoreBoardMap map[int64]TeamScoreItem
	Top10TimeLines     []TimeLineItem
	Top10Teams         []TeamScoreItem
	AllTimeLines       []TimeLineItem
	TeamRankings       []TeamScoreItem
}

// Team management responses

// 分组相关的响应模型
type GameGroupSimple struct {
	GroupID   int64  `json:"group_id"`
	GroupName string `json:"group_name"`
	TeamCount int64  `json:"team_count"`
}

type PaginationInfo struct {
	CurrentPage int64 `json:"current_page"`
	PageSize    int64 `json:"page_size"`
	TotalCount  int64 `json:"total_count"`
	TotalPages  int64 `json:"total_pages"`
}

// 容器详情返回结构
type AdminContainerItem struct {
	ContainerID         string                 `json:"container_id"`
	ContainerName       string                 `json:"container_name"`
	ContainerStatus     models.ContainerStatus `json:"container_status"`
	ContainerExpireTime time.Time              `json:"container_expiretime"`
	ContainerType       string                 `json:"container_type"`
	ContainerPorts      models.ExposePorts     `json:"container_ports"`
	ContainerNameList   []string               `json:"container_name_list"`
	TeamName            string                 `json:"team_name"`
	GameName            string                 `json:"game_name"`
	ChallengeName       string                 `json:"challenge_name"`
	PodID               string                 `json:"pod_id"`
	TeamID              int64                  `json:"team_id"`
	ChallengeID         int64                  `json:"challenge_id"`
}

type AdminGameGroupItem struct {
	GroupID     int64     `json:"group_id"`
	GameID      int64     `json:"game_id"`
	GroupName   string    `json:"group_name"`
	InviteCode  string    `json:"invite_code"`
	Description *string   `json:"group_description"`
	PeopleCount int64     `json:"people_count"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}
