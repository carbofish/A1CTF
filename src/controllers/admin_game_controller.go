package controllers

import (
	"errors"
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/nicksnyder/go-i18n/v2/i18n"
	"gorm.io/gorm"

	"a1ctf/src/db/models"
	"a1ctf/src/tasks"
	dbtool "a1ctf/src/utils/db_tool"
	"a1ctf/src/utils/general"
	i18ntool "a1ctf/src/utils/i18n_tool"
	noticetool "a1ctf/src/utils/notice_tool"
	"a1ctf/src/webmodels"
	"mime"

	"github.com/bytedance/sonic"
	"github.com/google/uuid"
	"github.com/lib/pq"
)

// helper: convert slice of strings to LIKE patterns for ILIKE ANY
func mapSliceToLike(src []string) []string {
	var dst []string
	for _, s := range src {
		dst = append(dst, "%"+strings.ToLower(s)+"%")
	}
	return dst
}

// helper: extract keys from map[int64]struct{}
func keysInt64(m map[int64]struct{}) []int64 {
	res := make([]int64, 0, len(m))
	for k := range m {
		res = append(res, k)
	}
	return res
}

func AdminListGames(c *gin.Context) {
	var payload webmodels.AdminListGamePayload
	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    400,
			"message": i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "InvalidRequestPayload"}),
		})
		return
	}

	var games []models.Game
	query := dbtool.DB().Offset(payload.Offset).Limit(payload.Size)

	if err := query.Find(&games).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    500,
			"message": i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "FailedToLoadGames"}),
		})
		return
	}

	sort.Slice(games, func(i, j int) bool {
		return games[i].GameID < games[j].GameID
	})

	data := make([]gin.H, 0, len(games))
	for _, game := range games {
		data = append(data, gin.H{
			"game_id":    game.GameID,
			"name":       game.Name,
			"summary":    game.Summary,
			"start_time": game.StartTime,
			"end_time":   game.EndTime,
			"visible":    game.Visible,
			"poster":     game.Poster,
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"code": 200,
		"data": data,
	})
}

func AdminCreateGame(c *gin.Context) {
	var payload models.Game
	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    400,
			"message": i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "InvalidRequestPayload"}),
		})
		return
	}

	game := models.Game{
		Name:                 payload.Name,
		Summary:              payload.Summary,
		StartTime:            payload.StartTime,
		EndTime:              payload.EndTime,
		Visible:              payload.Visible,
		Poster:               payload.Poster,
		WpExpireTime:         payload.WpExpireTime,
		Stages:               payload.Stages,
		RequireWp:            payload.RequireWp,
		ContainerNumberLimit: payload.ContainerNumberLimit,
		TeamNumberLimit:      payload.TeamNumberLimit,
		PracticeMode:         payload.PracticeMode,
		InviteCode:           payload.InviteCode,
		Description:          payload.Description,
		TeamPolicy:           payload.TeamPolicy,
	}

	// 默认自动审核
	if game.TeamPolicy == "" {
		game.TeamPolicy = models.TeamPolicyAuto
	}

	if err := dbtool.DB().Create(&game).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    500,
			"message": i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "FailedToCreateGame"}),
		})
		return
	}

	// 创建管理员默认队伍
	adminTeam := models.Team{
		TeamID:          0,
		GameID:          game.GameID,
		TeamName:        "A1CTF-Admins",
		TeamDescription: nil,
		TeamAvatar:      nil,
		TeamSlogan:      nil,
		TeamMembers:     []string{},
		TeamScore:       0,
		TeamHash:        general.RandomHash(16),
		InviteCode:      nil,
		TeamStatus:      models.ParticipateApproved,
		GroupID:         nil,
		TeamType:        models.TeamTypeAdmin,
	}

	if err := dbtool.DB().Create(&adminTeam).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    500,
			"message": i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "FailedToCreateAdminTeam"}),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code": 200,
		"data": gin.H{
			"game_id": game.GameID,
		},
	})
}

func AdminGetGame(c *gin.Context) {
	game := c.MustGet("game").(models.Game)

	result := gin.H{
		"game_id":                  game.GameID,
		"name":                     game.Name,
		"summary":                  game.Summary,
		"description":              game.Description,
		"poster":                   game.Poster,
		"invite_code":              game.InviteCode,
		"start_time":               game.StartTime,
		"end_time":                 game.EndTime,
		"practice_mode":            game.PracticeMode,
		"team_number_limit":        game.TeamNumberLimit,
		"container_number_limit":   game.ContainerNumberLimit,
		"require_wp":               game.RequireWp,
		"wp_expire_time":           game.WpExpireTime,
		"stages":                   game.Stages,
		"visible":                  game.Visible,
		"game_icon_light":          game.GameIconLight,
		"game_icon_dark":           game.GameIconDark,
		"first_blood_reward":       game.FirstBloodReward,
		"second_blood_reward":      game.SecondBloodReward,
		"third_blood_reward":       game.ThirdBloodReward,
		"team_policy":              game.TeamPolicy,
		"group_invite_code_enable": game.GroupInviteCodeEnabled,
		"challenges":               make([]gin.H, 0),
	}

	// 查询所有 challenges
	var gameChallenges []models.GameChallenge

	if err := dbtool.DB().Preload("Challenge").
		Where("game_id = ?", game.GameID).
		Find(&gameChallenges).Error; err != nil {

		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    500,
			"message": "Failed to load game challenges",
		})
		return
	}

	// 避免因为更改先后造成顺序变动
	sort.Slice(gameChallenges, func(i, j int) bool {
		return gameChallenges[i].Challenge.Name < gameChallenges[j].Challenge.Name
	})

	for _, gc := range gameChallenges {
		judgeConfig := gc.JudgeConfig
		if judgeConfig == nil {
			judgeConfig = gc.Challenge.JudgeConfig
		}

		result["challenges"] = append(result["challenges"].([]gin.H), gin.H{
			"challenge_id":        gc.Challenge.ChallengeID,
			"challenge_name":      gc.Challenge.Name,
			"total_score":         gc.TotalScore,
			"cur_score":           gc.CurScore,
			"hints":               gc.Hints,
			"solve_count":         gc.SolveCount,
			"category":            gc.Challenge.Category,
			"judge_config":        judgeConfig,
			"belong_stage":        gc.BelongStage,
			"visible":             gc.Visible,
			"minimal_score":       gc.MinimalScore,
			"enable_blood_reward": gc.BloodRewardEnabled,
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"code": 200,
		"data": result,
	})
}

func AdminGetGameChallenge(c *gin.Context) {

	gc := c.MustGet("game_challenge").(models.GameChallenge)

	judgeConfig := gc.JudgeConfig
	if judgeConfig == nil {
		judgeConfig = gc.Challenge.JudgeConfig
	}

	result := gin.H{
		"challenge_id":        gc.Challenge.ChallengeID,
		"challenge_name":      gc.Challenge.Name,
		"total_score":         gc.TotalScore,
		"cur_score":           gc.CurScore,
		"hints":               gc.Hints,
		"solve_count":         gc.SolveCount,
		"category":            gc.Challenge.Category,
		"judge_config":        judgeConfig,
		"belong_stage":        gc.BelongStage,
		"visible":             gc.Visible,
		"minimal_score":       gc.MinimalScore,
		"difficulty":          gc.Difficulty,
		"enable_blood_reward": gc.BloodRewardEnabled,
	}

	c.JSON(http.StatusOK, gin.H{
		"code": 200,
		"data": result,
	})
}

func AdminUpdateGameChallenge(c *gin.Context) {

	gameID := c.MustGet("game_id").(int64)
	// 实际上是 challenge_id
	challengeID := c.MustGet("game_challenge_id").(int64)
	game := c.MustGet("game").(models.Game)
	existingGameChallenge := c.MustGet("game_challenge").(models.GameChallenge)

	// 使用 map 来接收部分字段更新
	var payload map[string]interface{}
	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    400,
			"message": i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "InvalidRequestPayload"}),
		})
		return
	}

	shouldSendNotice := false
	noticeData := []string{}

	// 检测新增的Hint（如果payload中包含hints字段）
	if hintsData, hasHints := payload["hints"]; hasHints {
		existingHints := existingGameChallenge.Hints

		// 将interface{}转换为Hints类型
		var newHints models.Hints
		if hintsBytes, err := sonic.Marshal(hintsData); err == nil {
			if err := sonic.Unmarshal(hintsBytes, &newHints); err == nil {
				// 如果存在新增的可见Hint，发送通知
				if existingHints != nil {
					existingVisibleCount := 0
					newVisibleCount := 0

					// 计算现有可见Hint数量
					for _, hint := range *existingHints {
						if hint.Visible {
							existingVisibleCount++
						}
					}

					// 计算新的可见Hint数量
					for _, hint := range newHints {
						if hint.Visible {
							newVisibleCount++
						}
					}

					// 如果新的可见Hint数量大于现有的，说明有新增的可见Hint
					if newVisibleCount > existingVisibleCount {
						var challenge models.Challenge
						if err := dbtool.DB().Where("challenge_id = ?", challengeID).First(&challenge).Error; err == nil {
							shouldSendNotice = true
							noticeData = append(noticeData, challenge.Name)
						}
					}
				}
			}
		}
	}

	// 构建更新数据和字段列表
	updateData := make(map[string]interface{})
	updateFields := make([]string, 0)

	// 根据payload中的字段动态构建更新数据
	if totalScore, ok := payload["total_score"]; ok {
		updateData["total_score"] = totalScore

		existingGameChallenge.TotalScore = totalScore.(float64)

		updateFields = append(updateFields, "total_score")
	}

	// 比赛开始前，题目的 cur_store 永远等于总分
	if game.StartTime.Before(time.Now().UTC()) {
		updateData["cur_score"] = existingGameChallenge.TotalScore
		updateFields = append(updateFields, "cur_score")
	}
	if hintsData, ok := payload["hints"]; ok {
		// 将 hints 数据转换为正确的 Hints 类型
		var hints models.Hints
		if hintsBytes, err := sonic.Marshal(hintsData); err == nil {
			if err := sonic.Unmarshal(hintsBytes, &hints); err == nil {
				updateData["hints"] = hints
				updateFields = append(updateFields, "hints")
			}
		}
	}
	if judgeConfigData, ok := payload["judge_config"]; ok {
		// 将 judge_config 数据转换为正确的 JudgeConfig 类型
		var judgeConfig models.JudgeConfig
		if judgeConfigBytes, err := sonic.Marshal(judgeConfigData); err == nil {
			if err := sonic.Unmarshal(judgeConfigBytes, &judgeConfig); err == nil {
				// FlagTemplate 必须存在，且长度不少于3个字符
				if judgeConfig.FlagTemplate == nil || *judgeConfig.FlagTemplate == "" || len(*judgeConfig.FlagTemplate) < 4 {
					c.JSON(http.StatusBadRequest, gin.H{
						"code":    400,
						"message": i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "InvalidFlagTemplate"}),
					})
					return
				}
				updateData["judge_config"] = judgeConfig
				updateFields = append(updateFields, "judge_config")
			}
		}
	}
	if visible, ok := payload["visible"]; ok {
		updateData["visible"] = visible
		updateFields = append(updateFields, "visible")
	}
	if belongStage, ok := payload["belong_stage"]; ok {
		updateData["belong_stage"] = belongStage
		updateFields = append(updateFields, "belong_stage")
	}
	if difficulty, ok := payload["difficulty"]; ok {
		updateData["difficulty"] = difficulty
		updateFields = append(updateFields, "difficulty")
	}
	if minimalScore, ok := payload["minimal_score"]; ok {
		updateData["minimal_score"] = minimalScore
		updateFields = append(updateFields, "minimal_score")
	}
	if bloodRewardEnabled, ok := payload["enable_blood_reward"]; ok {
		updateData["enable_blood_reward"] = bloodRewardEnabled
		updateFields = append(updateFields, "enable_blood_reward")
	}

	// 如果没有要更新的字段，直接返回
	if len(updateFields) == 0 {
		c.JSON(http.StatusOK, gin.H{
			"code": 200,
		})
		return
	}

	// 执行数据库更新
	if err := dbtool.DB().Model(&models.GameChallenge{}).
		Select(updateFields).
		Where("challenge_id = ? AND game_id = ?", challengeID, gameID).Updates(updateData).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    500,
			"message": i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "FailedToSaveChallenge"}),
		})
		return
	}

	if shouldSendNotice {
		noticetool.InsertNotice(gameID, models.NoticeNewHint, noticeData)
	}

	c.JSON(http.StatusOK, gin.H{
		"code": 200,
	})
}

func AdminUpdateGame(c *gin.Context) {
	game := c.MustGet("game").(models.Game)

	var payload webmodels.AdminUpdateGamePayload
	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    400,
			"message": i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "InvalidRequestPayload"}),
		})
		return
	}

	// 更新比赛信息
	game.Name = payload.Name
	game.Summary = payload.Summary
	game.Description = payload.Description
	game.Poster = payload.Poster
	game.InviteCode = payload.InviteCode
	game.StartTime = payload.StartTime
	game.EndTime = payload.EndTime
	game.PracticeMode = payload.PracticeMode
	game.TeamNumberLimit = payload.TeamNumberLimit
	game.ContainerNumberLimit = payload.ContainerNumberLimit
	game.RequireWp = payload.RequireWp
	game.WpExpireTime = payload.WpExpireTime
	game.Stages = payload.Stages
	game.Visible = payload.Visible
	game.TeamPolicy = payload.TeamPolicy
	// 三血比例
	game.FirstBloodReward = payload.FirstBloodReward
	game.SecondBloodReward = payload.SecondBloodReward
	game.ThirdBloodReward = payload.ThirdBloodReward
	game.GroupInviteCodeEnabled = payload.GroupInviteCodeEnabled

	// 更新 Belong stage
	for _, chal := range payload.Challenges {

		updateModel := models.GameChallenge{
			BelongStage: chal.BelongStage,
		}

		if err := dbtool.DB().Model(&models.GameChallenge{}).
			Select("belong_stage").
			Where("challenge_id = ? AND game_id = ?", chal.ChallengeID, game.GameID).Updates(updateModel).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"code":    500,
				"message": "Failed to save challenge",
			})
			return
		}
	}

	if err := dbtool.DB().Save(&game).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    500,
			"message": i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "FailedToSaveGame"}),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code": 200,
	})
}

func AdminAddGameChallenge(c *gin.Context) {
	gameID := c.MustGet("game_id").(int64)
	challenge := c.MustGet("challenge").(models.Challenge)
	challengeID := c.MustGet("challenge_id").(int64)

	var gameChallenges []models.GameChallenge
	if err := dbtool.DB().Where("challenge_id = ? AND game_id = ?", challengeID, gameID).Find(&gameChallenges).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    500,
			"message": i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "ServerError"}),
		})
	}

	if len(gameChallenges) > 0 {
		c.JSON(http.StatusConflict, gin.H{
			"code":    409,
			"message": i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "ChallengeAlreadyAddedToGame"}),
		})
		return
	}

	gameChallenge := models.GameChallenge{
		GameID:             gameID,
		ChallengeID:        challengeID,
		TotalScore:         500,
		CurScore:           500,
		Difficulty:         5,
		Hints:              &models.Hints{},
		JudgeConfig:        challenge.JudgeConfig,
		BelongStage:        nil,
		Visible:            false,
		BloodRewardEnabled: true,
	}

	if err := dbtool.DB().Create(&gameChallenge).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    500,
			"message": i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "FailedToAddChallengeToGame"}),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code": 200,
		"data": gin.H{
			"challenge_id":   challenge.ChallengeID,
			"challenge_name": challenge.Name,
			"total_score":    gameChallenge.TotalScore,
			"cur_score":      gameChallenge.CurScore,
			"hints":          gameChallenge.Hints,
			"solve_count":    gameChallenge.SolveCount,
			"category":       challenge.Category,
			"judge_config":   gameChallenge.JudgeConfig,
			"belong_stage":   gameChallenge.BelongStage,
		},
	})
}

func AdminDeleteGameChallenge(c *gin.Context) {
	gameID := c.MustGet("game_id").(int64)
	challengeID := c.MustGet("challenge_id").(int64)

	if err := dbtool.DB().Where("game_id = ? AND challenge_id = ?", gameID, challengeID).Delete(&models.GameChallenge{}).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusBadRequest, gin.H{
				"code":    400,
				"message": i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "ChallengeNotFound"}),
			})
			return
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"code": 200,
	})
}

// AdminCreateNotice 创建公告
func AdminCreateNotice(c *gin.Context) {
	gameIDStr := c.Param("game_id")
	gameID, err := strconv.ParseInt(gameIDStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    400,
			"message": i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "InvalidGameID"}),
		})
		return
	}

	var payload struct {
		Title   string `json:"title" binding:"required"`
		Content string `json:"content" binding:"required"`
	}
	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    400,
			"message": i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "InvalidRequestPayload"}),
		})
		return
	}

	// 验证游戏是否存在
	var game models.Game
	if err := dbtool.DB().Where("game_id = ?", gameID).First(&game).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{
				"code":    404,
				"message": i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "GameNotFound"}),
			})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{
				"code":    500,
				"message": i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "FailedToVerifyGame"}),
			})
		}
		return
	}

	// 使用 notice_tool 插入公告
	noticetool.InsertNotice(gameID, models.NoticeNewAnnounce, []string{payload.Title, payload.Content})

	c.JSON(http.StatusOK, gin.H{
		"code":    200,
		"message": "公告创建成功",
	})
}

// AdminListNotices 获取公告列表
func AdminListNotices(c *gin.Context) {
	gameIDStr := c.Param("game_id")
	gameID, err := strconv.ParseInt(gameIDStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    400,
			"message": i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "InvalidGameID"}),
		})
		return
	}

	var payload struct {
		Size   int `json:"size" binding:"min=0"`
		Offset int `json:"offset"`
	}
	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    400,
			"message": i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "InvalidRequestPayload"}),
		})
		return
	}

	var notices []models.Notice
	query := dbtool.DB().Where("game_id = ? AND notice_category = ?", gameID, models.NoticeNewAnnounce).
		Order("create_time DESC").
		Offset(payload.Offset).
		Limit(payload.Size)

	if err := query.Find(&notices).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    500,
			"message": i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "FailedToLoadNotices"}),
		})
		return
	}

	// 获取总数
	var total int64
	if err := dbtool.DB().Model(&models.Notice{}).
		Where("game_id = ? AND notice_category = ?", gameID, models.NoticeNewAnnounce).
		Count(&total).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    500,
			"message": i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "FailedToCountNotices"}),
		})
		return
	}

	data := make([]gin.H, 0, len(notices))
	for _, notice := range notices {
		title := ""
		content := ""
		if len(notice.Data) >= 2 {
			title = notice.Data[0]
			content = notice.Data[1]
		}

		data = append(data, gin.H{
			"notice_id":   notice.NoticeID,
			"title":       title,
			"content":     content,
			"create_time": notice.CreateTime,
			"announced":   notice.Announced,
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"code":  200,
		"data":  data,
		"total": total,
	})
}

// AdminDeleteNotice 删除公告
func AdminDeleteNotice(c *gin.Context) {
	var payload webmodels.AdminDeleteNoticePayload
	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    400,
			"message": i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "InvalidRequestPayload"}),
		})
		return
	}

	// 验证公告是否存在
	var notice models.Notice
	if err := dbtool.DB().Where("notice_id = ?", payload.NoticeID).First(&notice).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{
				"code":    404,
				"message": i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "NoticeNotFound"}),
			})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{
				"code":    500,
				"message": i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "FailedToVerifyNotice"}),
			})
		}
		return
	}

	// 删除公告
	if err := dbtool.DB().Delete(&notice).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    500,
			"message": i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "FailedToDeleteNotice"}),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code":    200,
		"message": "公告删除成功",
	})
}

// AdminUploadGamePoster 上传比赛海报
func AdminUploadGamePoster(c *gin.Context) {
	gameIDStr := c.Param("game_id")
	gameID, err := strconv.ParseInt(gameIDStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    400,
			"message": i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "InvalidGameID"}),
		})
		return
	}

	// 验证游戏是否存在
	var game models.Game
	if err := dbtool.DB().Where("game_id = ?", gameID).First(&game).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{
				"code":    404,
				"message": i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "GameNotFound"}),
			})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{
				"code":    500,
				"message": i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "FailedToVerifyGame"}),
			})
		}
		return
	}

	// 获取上传的海报文件
	file, err := c.FormFile("poster")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    400,
			"message": i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "NoPosterFileUploaded"}),
		})
		return
	}

	// 检查文件类型是否为图片
	fileType, err := validateImageFile(file)
	if err != nil {
		c.JSON(http.StatusUnsupportedMediaType, gin.H{
			"code":    415,
			"message": i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "UploadedFileIsNotAnImage"}),
		})
		return
	}

	// 生成唯一的文件ID
	var fileID uuid.UUID
	for {
		fileID = uuid.New()
		var existingUpload models.Upload
		result := dbtool.DB().Where("file_id = ?", fileID).First(&existingUpload)
		if result.Error == gorm.ErrRecordNotFound {
			break
		} else if result.Error != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"code":    500,
				"message": i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "DatabaseQueryFailed"}),
			})
			return
		}
	}

	// 创建存储目录
	now := time.Now().UTC()
	storePath := filepath.Join("data", "uploads", "posters", fmt.Sprintf("%d", now.Year()), fmt.Sprintf("%d", now.Month()))
	if err := os.MkdirAll(storePath, 0755); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    500,
			"message": i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "FailedToCreateUploadDirectory"}),
		})
		return
	}

	// 保存文件
	newFilePath := filepath.Join(storePath, fileID.String())
	if err := c.SaveUploadedFile(file, newFilePath); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    500,
			"message": i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "FailedToSavePosterFile"}),
		})
		return
	}

	// 设置文件类型（如果为空）
	if fileType == "" {
		fileType = mime.TypeByExtension(filepath.Ext(file.Filename))
		if fileType == "" {
			fileType = "image/jpeg" // 默认类型
		}
	}

	// 获取用户信息
	users, _ := c.Get("UserID")
	userClaims := users.(*models.JWTUser)
	userID, err := uuid.Parse(userClaims.UserID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    400,
			"message": i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "InvalidUserID"}),
		})
		return
	}

	// 创建上传记录
	newUpload := models.Upload{
		FileID:     fileID.String(),
		UserID:     userID.String(),
		FileName:   file.Filename,
		FilePath:   newFilePath,
		FileHash:   "", // 可以添加文件哈希计算
		FileType:   fileType,
		FileSize:   file.Size,
		UploadTime: now,
	}

	// 开始数据库事务
	tx := dbtool.DB().Begin()

	// 保存上传记录
	if err := tx.Create(&newUpload).Error; err != nil {
		tx.Rollback()
		_ = os.Remove(newFilePath)
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    500,
			"message": i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "FailedToSaveFileRecord"}),
		})
		return
	}

	// 构建海报URL
	posterURL := fmt.Sprintf("/api/file/download/%s", fileID.String())

	// 更新游戏海报字段
	if err := tx.Model(&models.Game{}).Where("game_id = ?", gameID).Update("poster", posterURL).Error; err != nil {
		tx.Rollback()
		_ = os.Remove(newFilePath)
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    500,
			"message": i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "FailedToUpdateGamePoster"}),
		})
		return
	}

	// 提交事务
	if err := tx.Commit().Error; err != nil {
		tx.Rollback()
		_ = os.Remove(newFilePath)
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    500,
			"message": i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "FailedToCommitTransaction"}),
		})
		return
	}

	// 返回成功响应
	c.JSON(http.StatusOK, gin.H{
		"code":       200,
		"message":    i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "GamePosterUploadedSuccessfully"}),
		"poster_url": posterURL,
	})
}

// AdminGetGameScoreAdjustments 获取比赛分数修正记录
func AdminGetGameScoreAdjustments(c *gin.Context) {
	gameIDStr := c.Param("game_id")
	gameID, err := strconv.ParseInt(gameIDStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    400,
			"message": i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "InvalidGameID"}),
		})
		return
	}

	// 验证游戏是否存在
	var game models.Game
	if err := dbtool.DB().Where("game_id = ?", gameID).First(&game).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{
				"code":    404,
				"message": i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "GameNotFound"}),
			})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{
				"code":    500,
				"message": i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "FailedToVerifyGame"}),
			})
		}
		return
	}

	// 获取分数修正记录
	var adjustments []models.ScoreAdjustment
	if err := dbtool.DB().Preload("Team").Preload("CreatedByUser").
		Where("game_id = ?", gameID).
		Order("created_at DESC").
		Find(&adjustments).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    500,
			"message": i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "FailedToLoadScoreAdjustments"}),
		})
		return
	}

	// 构建响应数据
	data := make([]gin.H, 0, len(adjustments))
	for _, adj := range adjustments {
		teamName := ""
		if adj.Team != nil {
			teamName = adj.Team.TeamName
		}

		createdByUsername := ""
		if adj.CreatedByUser != nil {
			createdByUsername = adj.CreatedByUser.Username
		}

		data = append(data, gin.H{
			"adjustment_id":       adj.AdjustmentID,
			"team_id":             adj.TeamID,
			"team_name":           teamName,
			"adjustment_type":     adj.AdjustmentType,
			"score_change":        adj.ScoreChange,
			"reason":              adj.Reason,
			"created_by":          adj.CreatedBy,
			"created_by_username": createdByUsername,
			"created_at":          adj.CreatedAt,
			"updated_at":          adj.UpdatedAt,
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"code": 200,
		"data": data,
	})
}

// AdminCreateScoreAdjustment 创建分数修正记录
func AdminCreateScoreAdjustment(c *gin.Context) {
	gameIDStr := c.Param("game_id")
	gameID, err := strconv.ParseInt(gameIDStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    400,
			"message": i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "InvalidGameID"}),
		})
		return
	}

	var payload webmodels.CreateScoreAdjustmentPayload
	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    400,
			"message": i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "InvalidRequestData", TemplateData: map[string]interface{}{"Error": err.Error()}}),
		})
		return
	}

	// 验证游戏是否存在
	var game models.Game
	if err := dbtool.DB().Where("game_id = ?", gameID).First(&game).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{
				"code":    404,
				"message": i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "GameNotFound"}),
			})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{
				"code":    500,
				"message": i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "FailedToVerifyGame"}),
			})
		}
		return
	}

	// 验证队伍是否存在且属于该比赛
	var team models.Team
	if err := dbtool.DB().Where("team_id = ? AND game_id = ?", payload.TeamID, gameID).First(&team).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{
				"code":    404,
				"message": i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "TeamNotFoundInThisGame"}),
			})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{
				"code":    500,
				"message": i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "FailedToVerifyTeam"}),
			})
		}
		return
	}

	// 获取当前用户信息
	users, _ := c.Get("UserID")
	userClaims := users.(*models.JWTUser)
	userID, err := uuid.Parse(userClaims.UserID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    400,
			"message": i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "InvalidUserID"}),
		})
		return
	}

	// 创建分数修正记录
	adjustment := models.ScoreAdjustment{
		TeamID:         payload.TeamID,
		GameID:         gameID,
		AdjustmentType: models.AdjustmentType(payload.AdjustmentType),
		ScoreChange:    payload.ScoreChange,
		Reason:         payload.Reason,
		CreatedBy:      userID,
		CreatedAt:      time.Now().UTC(),
		UpdatedAt:      time.Now().UTC(),
	}

	if err := dbtool.DB().Create(&adjustment).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    500,
			"message": i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "FailedToCreateScoreAdjustment"}),
		})
		return
	}

	// 更新队伍分数
	scoreChange := adjustment.ScoreChange
	if err := dbtool.DB().Model(&models.Team{}).
		Where("team_id = ?", payload.TeamID).
		Update("team_score", gorm.Expr("team_score + ?", scoreChange)).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    500,
			"message": i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "FailedToUpdateTeamScore"}),
		})
		return
	}

	// 获取创建的记录详情
	if err := dbtool.DB().Preload("Team").Preload("CreatedByUser").
		Where("adjustment_id = ?", adjustment.AdjustmentID).
		First(&adjustment).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    500,
			"message": i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "FailedToLoadCreatedAdjustment"}),
		})
		return
	}

	// 构建响应数据
	teamName := ""
	if adjustment.Team != nil {
		teamName = adjustment.Team.TeamName
	}

	createdByUsername := ""
	if adjustment.CreatedByUser != nil {
		createdByUsername = adjustment.CreatedByUser.Username
	}

	data := gin.H{
		"adjustment_id":       adjustment.AdjustmentID,
		"team_id":             adjustment.TeamID,
		"team_name":           teamName,
		"adjustment_type":     adjustment.AdjustmentType,
		"score_change":        adjustment.ScoreChange,
		"reason":              adjustment.Reason,
		"created_by":          adjustment.CreatedBy,
		"created_by_username": createdByUsername,
		"created_at":          adjustment.CreatedAt,
		"updated_at":          adjustment.UpdatedAt,
	}

	c.JSON(http.StatusOK, gin.H{
		"code": 200,
		"data": data,
	})
}

// AdminUpdateScoreAdjustment 更新分数修正记录
func AdminUpdateScoreAdjustment(c *gin.Context) {
	gameIDStr := c.Param("game_id")
	gameID, err := strconv.ParseInt(gameIDStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    400,
			"message": i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "InvalidGameID"}),
		})
		return
	}

	adjustmentIDStr := c.Param("adjustment_id")
	adjustmentID, err := strconv.ParseInt(adjustmentIDStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    400,
			"message": i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "InvalidAdjustmentID"}),
		})
		return
	}

	var payload webmodels.UpdateScoreAdjustmentPayload
	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    400,
			"message": i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "InvalidRequestData", TemplateData: map[string]interface{}{"Error": err.Error()}}),
		})
		return
	}

	// 获取原始记录
	var originalAdjustment models.ScoreAdjustment
	if err := dbtool.DB().Where("adjustment_id = ? AND game_id = ?", adjustmentID, gameID).
		First(&originalAdjustment).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{
				"code":    404,
				"message": i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "ScoreAdjustmentNotFound"}),
			})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{
				"code":    500,
				"message": i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "FailedToLoadScoreAdjustment"}),
			})
		}
		return
	}

	// 计算分数差异
	scoreDifference := payload.ScoreChange - originalAdjustment.ScoreChange

	// 开始事务
	tx := dbtool.DB().Begin()

	// 更新分数修正记录
	if err := tx.Model(&originalAdjustment).Updates(models.ScoreAdjustment{
		AdjustmentType: models.AdjustmentType(payload.AdjustmentType),
		ScoreChange:    payload.ScoreChange,
		Reason:         payload.Reason,
		UpdatedAt:      time.Now().UTC(),
	}).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    500,
			"message": i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "FailedToUpdateScoreAdjustment"}),
		})
		return
	}

	// 更新队伍分数
	if scoreDifference != 0 {
		if err := tx.Model(&models.Team{}).
			Where("team_id = ?", originalAdjustment.TeamID).
			Update("team_score", gorm.Expr("team_score + ?", scoreDifference)).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{
				"code":    500,
				"message": i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "FailedToUpdateTeamScore"}),
			})
			return
		}
	}

	// 提交事务
	if err := tx.Commit().Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    500,
			"message": i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "FailedToCommitTransaction"}),
		})
		return
	}

	// 获取更新后的记录详情
	var updatedAdjustment models.ScoreAdjustment
	if err := dbtool.DB().Preload("Team").Preload("CreatedByUser").
		Where("adjustment_id = ?", adjustmentID).
		First(&updatedAdjustment).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    500,
			"message": i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "FailedToLoadUpdatedAdjustment"}),
		})
		return
	}

	// 构建响应数据
	teamName := ""
	if updatedAdjustment.Team != nil {
		teamName = updatedAdjustment.Team.TeamName
	}

	createdByUsername := ""
	if updatedAdjustment.CreatedByUser != nil {
		createdByUsername = updatedAdjustment.CreatedByUser.Username
	}

	data := gin.H{
		"adjustment_id":       updatedAdjustment.AdjustmentID,
		"team_id":             updatedAdjustment.TeamID,
		"team_name":           teamName,
		"adjustment_type":     updatedAdjustment.AdjustmentType,
		"score_change":        updatedAdjustment.ScoreChange,
		"reason":              updatedAdjustment.Reason,
		"created_by":          updatedAdjustment.CreatedBy,
		"created_by_username": createdByUsername,
		"created_at":          updatedAdjustment.CreatedAt,
		"updated_at":          updatedAdjustment.UpdatedAt,
	}

	c.JSON(http.StatusOK, gin.H{
		"code": 200,
		"data": data,
	})
}

// AdminDeleteScoreAdjustment 删除分数修正记录
func AdminDeleteScoreAdjustment(c *gin.Context) {
	gameIDStr := c.Param("game_id")
	gameID, err := strconv.ParseInt(gameIDStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    400,
			"message": i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "InvalidGameID"}),
		})
		return
	}

	adjustmentIDStr := c.Param("adjustment_id")
	adjustmentID, err := strconv.ParseInt(adjustmentIDStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    400,
			"message": i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "InvalidAdjustmentID"}),
		})
		return
	}

	// 获取要删除的记录
	var adjustment models.ScoreAdjustment
	if err := dbtool.DB().Where("adjustment_id = ? AND game_id = ?", adjustmentID, gameID).
		First(&adjustment).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{
				"code":    404,
				"message": i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "ScoreAdjustmentNotFound"}),
			})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{
				"code":    500,
				"message": i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "FailedToLoadScoreAdjustment"}),
			})
		}
		return
	}

	// 开始事务
	tx := dbtool.DB().Begin()

	// 删除分数修正记录
	if err := tx.Delete(&adjustment).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    500,
			"message": i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "FailedToDeleteScoreAdjustment"}),
		})
		return
	}

	// 从队伍分数中减去该修正值
	if err := tx.Model(&models.Team{}).
		Where("team_id = ?", adjustment.TeamID).
		Update("team_score", gorm.Expr("team_score - ?", adjustment.ScoreChange)).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    500,
			"message": i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "FailedToUpdateTeamScore"}),
		})
		return
	}

	// 提交事务
	if err := tx.Commit().Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    500,
			"message": i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "FailedToCommitTransaction"}),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code":    200,
		"message": i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "ScoreAdjustmentDeletedSuccessfully"}),
	})
}

// AdminDeleteChallengeSolves 删除题目解题记录（支持删除所有或特定队伍）
func AdminDeleteChallengeSolves(c *gin.Context) {
	gameIDStr := c.Param("game_id")
	gameID, err := strconv.ParseInt(gameIDStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    400,
			"message": i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "InvalidGameID"}),
		})
		return
	}

	challengeIDStr := c.Param("challenge_id")
	challengeID, err := strconv.ParseInt(challengeIDStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    400,
			"message": i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "InvalidChallengeID"}),
		})
		return
	}

	var payload struct {
		TeamID *int64 `json:"team_id"` // 可选，如果不提供则删除所有
	}

	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    400,
			"message": i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "InvalidRequestData", TemplateData: map[string]interface{}{"Error": err.Error()}}),
		})
		return
	}

	// 验证比赛和题目是否存在
	var gameChallenge models.GameChallenge
	if err := dbtool.DB().Where("game_id = ? AND challenge_id = ?", gameID, challengeID).
		First(&gameChallenge).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{
				"code":    404,
				"message": i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "GameChallengeNotFound"}),
			})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{
				"code":    500,
				"message": i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "FailedToLoadGameChallenge"}),
			})
		}
		return
	}

	// 如果指定了队伍ID，验证队伍是否存在
	var team *models.Team
	if payload.TeamID != nil {
		team = &models.Team{}
		if err := dbtool.DB().Where("team_id = ?", *payload.TeamID).First(team).Error; err != nil {
			if err == gorm.ErrRecordNotFound {
				c.JSON(http.StatusNotFound, gin.H{
					"code":    404,
					"message": i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "TeamNotFound"}),
				})
			} else {
				c.JSON(http.StatusInternalServerError, gin.H{
					"code":    500,
					"message": i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "FailedToLoadTeam"}),
				})
			}
			return
		}
	}

	// 开始事务
	tx := dbtool.DB().Begin()

	// 构建查询条件
	query := tx.Where("game_id = ? AND challenge_id = ?", gameID, challengeID)
	if payload.TeamID != nil {
		query = query.Where("team_id = ?", *payload.TeamID)
	}

	// 获取要删除的解题记录
	var solves []models.Solve
	if err := query.Find(&solves).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    500,
			"message": i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "FailedToLoadSolves"}),
		})
		return
	}

	if len(solves) == 0 {
		tx.Rollback()
		messageID := "NoSolveRecordsFound"
		if payload.TeamID != nil {
			messageID = "NoSolveRecordsFoundForTeamAndChallenge"
		}
		c.JSON(http.StatusNotFound, gin.H{
			"code":    404,
			"message": i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: messageID}),
		})
		return
	}

	// 删除解题记录
	if err := query.Delete(&models.Solve{}).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    500,
			"message": i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "FailedToDeleteSolves"}),
		})
		return
	}

	// 提交事务
	if err := tx.Commit().Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    500,
			"message": i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "FailedToCommitTransaction"}),
		})
		return
	}

	tasks.NewRecalculateRankForAChallengeTask(gameID, []int64{challengeID})

	// 构建响应消息
	var message string
	var data gin.H
	if payload.TeamID != nil {
		message = fmt.Sprintf("Deleted %d solve records for team %s", len(solves), team.TeamName)
		data = gin.H{
			"deleted_count": len(solves),
			"team_name":     team.TeamName,
		}
	} else {
		message = fmt.Sprintf("Cleared %d solve records", len(solves))
		data = gin.H{
			"deleted_count": len(solves),
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"code":    200,
		"message": message,
		"data":    data,
	})
}

// AdminGetSubmits 获取指定比赛的提交记录（包含正确与错误）
func AdminGetSubmits(c *gin.Context) {
	// 解析并校验 game_id
	gameIDStr := c.Param("game_id")
	gameID, err := strconv.ParseInt(gameIDStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    400,
			"message": i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "InvalidGameID"}),
		})
		return
	}

	// 确认比赛存在
	var game models.Game
	if err := dbtool.DB().Where("game_id = ?", gameID).First(&game).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{
				"code":    404,
				"message": i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "GameNotFound"}),
			})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{
				"code":    500,
				"message": i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "FailedToVerifyGame"}),
			})
		}
		return
	}

	// 解析分页及过滤参数
	var payload struct {
		Size           int      `json:"size" binding:"min=0"`
		Offset         int      `json:"offset"`
		ChallengeIDs   []int64  `json:"challenge_ids"`   // 多个题目ID
		ChallengeNames []string `json:"challenge_names"` // 多个题目名称(模糊匹配，OR 关系)
		TeamIDs        []int64  `json:"team_ids"`        // 多个队伍ID
		TeamNames      []string `json:"team_names"`      // 多个队伍名称
		JudgeStatuses  []string `json:"judge_statuses"`  // 多个评测结果
		StartTime      *string  `json:"start_time"`      // 起始时间 (ISO8601)
		EndTime        *string  `json:"end_time"`        // 结束时间 (ISO8601)
	}
	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    400,
			"message": i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "InvalidRequestData", TemplateData: map[string]interface{}{"Error": err.Error()}}),
		})
		return
	}

	// 构建基础查询
	baseQuery := dbtool.DB().Model(&models.Judge{}).Where("game_id = ?", gameID)

	// 题目过滤
	challengeIDSet := make(map[int64]struct{})
	if len(payload.ChallengeIDs) > 0 {
		for _, id := range payload.ChallengeIDs {
			challengeIDSet[id] = struct{}{}
		}
	}
	if len(payload.ChallengeNames) > 0 {
		var ids []int64
		if err := dbtool.DB().Model(&models.Challenge{}).
			Where("lower(name) ILIKE ANY(?)", pq.Array(mapSliceToLike(payload.ChallengeNames))).
			Pluck("challenge_id", &ids).Error; err == nil {
			for _, id := range ids {
				challengeIDSet[id] = struct{}{}
			}
		}

		if len(ids) == 0 {
			c.JSON(http.StatusOK, gin.H{
				"code":  200,
				"data":  make([]gin.H, 0),
				"total": 0,
			})
			return
		}
	}
	if len(challengeIDSet) > 0 {
		idList := keysInt64(challengeIDSet)
		baseQuery = baseQuery.Where("challenge_id IN ?", idList)
	}

	// 队伍过滤
	teamIDSet := make(map[int64]struct{})
	for _, id := range payload.TeamIDs {
		teamIDSet[id] = struct{}{}
	}
	if len(payload.TeamNames) > 0 {
		var ids []int64
		if err := dbtool.DB().Model(&models.Team{}).
			Where("lower(team_name) ILIKE ANY(?)", pq.Array(mapSliceToLike(payload.TeamNames))).
			Pluck("team_id", &ids).Error; err == nil {
			for _, id := range ids {
				teamIDSet[id] = struct{}{}
			}
		}
	}
	if len(teamIDSet) > 0 {
		baseQuery = baseQuery.Where("team_id IN ?", keysInt64(teamIDSet))
	}

	// 评测结果过滤
	if len(payload.JudgeStatuses) > 0 {
		coveredStatus := make([]models.JudgeStatus, 0)
		for _, status := range payload.JudgeStatuses {
			switch status {
			case "JudgeAC":
				coveredStatus = append(coveredStatus, models.JudgeAC)
			case "JudgeWA":
				coveredStatus = append(coveredStatus, models.JudgeWA)
			}
		}
		baseQuery = baseQuery.Where("judge_status IN ?", coveredStatus)
	}

	// 时间范围过滤
	if payload.StartTime != nil && strings.TrimSpace(*payload.StartTime) != "" {
		if t, err := time.Parse(time.RFC3339, *payload.StartTime); err == nil {
			baseQuery = baseQuery.Where("judge_time >= ?", t)
		}
	}
	if payload.EndTime != nil && strings.TrimSpace(*payload.EndTime) != "" {
		if t, err := time.Parse(time.RFC3339, *payload.EndTime); err == nil {
			baseQuery = baseQuery.Where("judge_time <= ?", t)
		}
	}

	// 查询总数
	var total int64
	if err := baseQuery.Count(&total).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    500,
			"message": i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "FailedToCountSubmits"}),
		})
		return
	}

	// 查询具体记录
	var judges []models.Judge
	query := baseQuery.Preload("Team").Preload("Challenge").Order("judge_time DESC").Offset(payload.Offset)
	if payload.Size > 0 {
		query = query.Limit(payload.Size)
	}
	if err := query.Find(&judges).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    500,
			"message": i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "FailedToLoadSubmits"}),
		})
		return
	}

	// 批量获取提交者用户名
	submitterIDs := make([]string, 0, len(judges))
	unique := make(map[string]struct{})
	for _, j := range judges {
		if _, ok := unique[j.SubmiterID]; !ok {
			unique[j.SubmiterID] = struct{}{}
			submitterIDs = append(submitterIDs, j.SubmiterID)
		}
	}

	userMap := make(map[string]string) // user_id -> username
	if len(submitterIDs) > 0 {
		var users []models.User
		if err := dbtool.DB().Select("user_id", "username").Where("user_id IN ?", submitterIDs).Find(&users).Error; err == nil {
			for _, u := range users {
				userMap[u.UserID] = u.Username
			}
		}
	}

	// 构造响应数据
	data := make([]gin.H, 0, len(judges))
	for _, j := range judges {
		username := userMap[j.SubmiterID]
		teamName := ""
		if j.Team.TeamName != "" {
			teamName = j.Team.TeamName
		}
		challengeName := ""
		if j.Challenge.Name != "" {
			challengeName = j.Challenge.Name
		}

		data = append(data, gin.H{
			"judge_id":       j.JudgeID,
			"username":       username,
			"team_name":      teamName,
			"team_id":        j.TeamID,
			"challenge_id":   j.ChallengeID,
			"flag_content":   j.JudgeContent,
			"challenge_name": challengeName,
			"judge_status":   j.JudgeStatus,
			"judge_time":     j.JudgeTime,
		})
	}

	// 返回
	c.JSON(http.StatusOK, gin.H{
		"code":  200,
		"data":  data,
		"total": total,
	})
}

// AdminGetCheats 获取指定比赛的作弊记录
func AdminGetCheats(c *gin.Context) {
	// 解析并校验 game_id
	gameIDStr := c.Param("game_id")
	gameID, err := strconv.ParseInt(gameIDStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    400,
			"message": i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "InvalidGameID"}),
		})
		return
	}

	// 确认比赛存在
	var game models.Game
	if err := dbtool.DB().Where("game_id = ?", gameID).First(&game).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{
				"code":    404,
				"message": i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "GameNotFound"}),
			})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{
				"code":    500,
				"message": i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "FailedToVerifyGame"}),
			})
		}
		return
	}

	// 解析分页及过滤参数
	var payload struct {
		Size           int      `json:"size" binding:"min=0"`
		Offset         int      `json:"offset"`
		ChallengeIDs   []int64  `json:"challenge_ids"`   // 多个题目ID
		ChallengeNames []string `json:"challenge_names"` // 多个题目名称(模糊匹配，OR 关系)
		TeamIDs        []int64  `json:"team_ids"`        // 多个队伍ID
		TeamNames      []string `json:"team_names"`      // 多个队伍名称
		CheatTypes     []string `json:"cheat_types"`     // 多个作弊类型
		StartTime      *string  `json:"start_time"`      // 起始时间 (ISO8601)
		EndTime        *string  `json:"end_time"`        // 结束时间 (ISO8601)
	}
	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    400,
			"message": i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "InvalidRequestPayload"}),
		})
		return
	}

	// 构建基础查询
	baseQuery := dbtool.DB().Model(&models.Cheat{}).Where("game_id = ?", gameID)

	// 题目过滤
	challengeIDSet := make(map[int64]struct{})
	if len(payload.ChallengeIDs) > 0 {
		for _, id := range payload.ChallengeIDs {
			challengeIDSet[id] = struct{}{}
		}
	}
	if len(payload.ChallengeNames) > 0 {
		var ids []int64
		if err := dbtool.DB().Model(&models.Challenge{}).
			Where("lower(name) ILIKE ANY(?)", pq.Array(mapSliceToLike(payload.ChallengeNames))).
			Pluck("challenge_id", &ids).Error; err == nil {
			for _, id := range ids {
				challengeIDSet[id] = struct{}{}
			}
		}

		if len(ids) == 0 {
			c.JSON(http.StatusOK, gin.H{
				"code":  200,
				"data":  make([]gin.H, 0),
				"total": 0,
			})
			return
		}
	}
	if len(challengeIDSet) > 0 {
		idList := keysInt64(challengeIDSet)
		baseQuery = baseQuery.Where("challenge_id IN ?", idList)
	}

	// 队伍过滤
	teamIDSet := make(map[int64]struct{})
	for _, id := range payload.TeamIDs {
		teamIDSet[id] = struct{}{}
	}
	if len(payload.TeamNames) > 0 {
		var ids []int64
		if err := dbtool.DB().Model(&models.Team{}).
			Where("lower(team_name) ILIKE ANY(?)", pq.Array(mapSliceToLike(payload.TeamNames))).
			Pluck("team_id", &ids).Error; err == nil {
			for _, id := range ids {
				teamIDSet[id] = struct{}{}
			}
		}
	}
	if len(teamIDSet) > 0 {
		baseQuery = baseQuery.Where("team_id IN ?", keysInt64(teamIDSet))
	}

	// 作弊类型过滤
	if len(payload.CheatTypes) > 0 {
		coveredTypes := make([]models.CheatType, 0)
		for _, cheatType := range payload.CheatTypes {
			switch cheatType {
			case "SubmitSomeonesFlag":
				coveredTypes = append(coveredTypes, models.CheatSubmitSomeonesFlag)
			case "SubmitWithoutDownloadAttachments":
				coveredTypes = append(coveredTypes, models.CheatSubmitWithoutDownloadAttachments)
			case "SubmitWithoutStartContainer":
				coveredTypes = append(coveredTypes, models.CheatSubmitWithoutStartContainer)
			}
		}
		baseQuery = baseQuery.Where("cheat_type IN ?", coveredTypes)
	}

	// 时间范围过滤
	if payload.StartTime != nil && strings.TrimSpace(*payload.StartTime) != "" {
		if t, err := time.Parse(time.RFC3339, *payload.StartTime); err == nil {
			baseQuery = baseQuery.Where("cheat_time >= ?", t)
		}
	}
	if payload.EndTime != nil && strings.TrimSpace(*payload.EndTime) != "" {
		if t, err := time.Parse(time.RFC3339, *payload.EndTime); err == nil {
			baseQuery = baseQuery.Where("cheat_time <= ?", t)
		}
	}

	// 查询总数
	var total int64
	if err := baseQuery.Count(&total).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    500,
			"message": i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "FailedToCountCheats"}),
		})
		return
	}

	// 查询具体记录
	var cheats []models.Cheat
	query := baseQuery.Preload("Team").Preload("Challenge").Preload("Submiter").Order("cheat_time DESC").Offset(payload.Offset)
	if payload.Size > 0 {
		query = query.Limit(payload.Size)
	}
	if err := query.Find(&cheats).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    500,
			"message": i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "FailedToLoadCheats"}),
		})
		return
	}

	// 构造响应数据
	data := make([]gin.H, 0, len(cheats))
	for _, cheat := range cheats {
		username := ""
		if cheat.Submiter.Username != "" {
			username = cheat.Submiter.Username
		}
		teamName := ""
		if cheat.Team.TeamName != "" {
			teamName = cheat.Team.TeamName
		}
		challengeName := ""
		if cheat.Challenge.Name != "" {
			challengeName = cheat.Challenge.Name
		}

		data = append(data, gin.H{
			"cheat_id":       cheat.CheatID,
			"cheat_type":     cheat.CheatType,
			"username":       username,
			"team_name":      teamName,
			"team_id":        cheat.TeamID,
			"challenge_id":   cheat.ChallengeID,
			"challenge_name": challengeName,
			"judge_id":       cheat.JudgeID,
			"flag_id":        cheat.FlagID,
			"extra_data":     cheat.ExtraData,
			"cheat_time":     cheat.CheatTime,
			"submiter_ip":    cheat.SubmiterIP,
		})
	}

	// 返回
	c.JSON(http.StatusOK, gin.H{
		"code":  200,
		"data":  data,
		"total": total,
	})
}
