package controllers

import (
	"a1ctf/src/db/models"
	"a1ctf/src/tasks"
	dbtool "a1ctf/src/utils/db_tool"
	i18ntool "a1ctf/src/utils/i18n_tool"
	"a1ctf/src/webmodels"
	"fmt"
	"net/http"
	"slices"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/nicksnyder/go-i18n/v2/i18n"
	"gorm.io/gorm"
)

func AdminListTeams(c *gin.Context) {

	var payload webmodels.AdminListTeamsPayload
	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, webmodels.ErrorMessage{
			Code:    400,
			Message: i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "InvalidRequestPayload"}),
		})
		return
	}

	query := dbtool.DB().Where("game_id = ?", payload.GameID)

	// 如果有搜索关键词，添加搜索条件
	if payload.Search != "" {
		searchPattern := fmt.Sprintf("%%%s%%", payload.Search)

		if uuid, err := uuid.Parse(payload.Search); err == nil {
			query = query.Where(`team_name ILIKE ? 
			OR team_slogan ILIKE ? OR team_id::text = ? 
			OR team_hash = ? 
			OR ? = ANY(team_members) 
			OR invite_code = ?
			OR EXISTS (
				SELECT 1 FROM users u 
				WHERE u.user_id = ANY(teams.team_members) 
				AND u.username ILIKE ?
			)`, searchPattern, searchPattern, payload.Search, payload.Search, uuid, payload.Search, searchPattern)
		} else {
			query = query.Where(`team_name ILIKE ? 
			OR team_slogan ILIKE ? 
			OR team_id::text = ? OR team_hash = ? 
			OR invite_code = ?
			OR group_id::text = ?
			OR EXISTS (
				SELECT 1 FROM users u 
				WHERE u.user_id = ANY(teams.team_members) 
				AND u.username ILIKE ?
			)`, searchPattern, searchPattern, payload.Search, payload.Search, payload.Search, payload.Search, searchPattern)
		}
	}

	query = query.Order("team_id ASC")

	var teams []models.Team
	if err := query.Offset(payload.Offset).Limit(payload.Size).Preload("Group").Find(&teams).Error; err != nil {
		c.JSON(http.StatusInternalServerError, webmodels.ErrorMessage{
			Code:    500,
			Message: i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "FailedToFetchTeams"}),
		})
		return
	}

	// 计算总数时也要应用搜索条件
	var count int64
	countQuery := dbtool.DB().Model(&models.Team{}).Where("game_id = ?", payload.GameID)
	if payload.Search != "" {
		searchPattern := "%" + payload.Search + "%"
		countQuery = countQuery.Where("team_name LIKE ? OR team_slogan LIKE ?", searchPattern, searchPattern)
	}
	if err := countQuery.Count(&count).Error; err != nil {
		c.JSON(http.StatusInternalServerError, webmodels.ErrorMessage{
			Code:    500,
			Message: i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "FailedToCountTeams"}),
		})
		return
	}

	var users []models.User
	if err := dbtool.DB().Find(&users).Error; err != nil {
		c.JSON(http.StatusInternalServerError, webmodels.ErrorMessage{
			Code:    500,
			Message: i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "FailedToFetchUsers"}),
		})
		return
	}

	var userMap = make(map[string]models.User)
	for _, user := range users {
		userMap[user.UserID] = user
	}

	teamItems := make([]webmodels.AdminListTeamItem, 0, len(teams))

	for _, team := range teams {

		var tmpMembers []webmodels.AdminSimpleTeamMemberInfo = make([]webmodels.AdminSimpleTeamMemberInfo, 0)

		for _, member := range team.TeamMembers {
			if user, ok := userMap[member]; ok {
				tmpMembers = append(tmpMembers, webmodels.AdminSimpleTeamMemberInfo{
					UserID:   user.UserID,
					UserName: user.Username,
					Avatar:   user.Avatar,
				})
			}
		}

		record := webmodels.AdminListTeamItem{
			TeamID:     team.TeamID,
			TeamName:   team.TeamName,
			TeamAvatar: team.TeamAvatar,
			TeamSlogan: team.TeamSlogan,
			GroupName:  nil,
			GroupID:    team.GroupID,
			Members:    tmpMembers,
			Status:     team.TeamStatus,
			Score:      team.TeamScore,
		}

		if team.Group != nil {
			record.GroupName = &team.Group.GroupName
		}

		teamItems = append(teamItems, record)
	}

	c.JSON(http.StatusOK, gin.H{
		"code":  200,
		"data":  teamItems,
		"total": count,
	})
}

// AdminApproveTeam 批准队伍
func AdminApproveTeam(c *gin.Context) {
	var payload webmodels.AdminTeamOperationPayload
	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, webmodels.ErrorMessage{
			Code:    400,
			Message: i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "InvalidRequestPayload"}),
		})
		return
	}

	// 查找队伍
	var team models.Team
	if err := dbtool.DB().Where("team_id = ?", payload.TeamID).First(&team).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, webmodels.ErrorMessage{
				Code:    404,
				Message: i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "TeamNotFound"}),
			})
		} else {
			c.JSON(http.StatusInternalServerError, webmodels.ErrorMessage{
				Code:    500,
				Message: i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "DatabaseError"}),
			})
		}
		return
	}

	// 更新队伍状态为已批准
	oldStatus := team.TeamStatus
	if err := dbtool.DB().Model(&team).Update("team_status", models.ParticipateApproved).Error; err != nil {
		// 记录批准队伍失败日志
		tasks.LogAdminOperationWithError(c, models.ActionApprove, models.ResourceTypeTeam, &team.TeamName, map[string]interface{}{
			"team_id":    team.TeamID,
			"team_name":  team.TeamName,
			"game_id":    team.GameID,
			"old_status": oldStatus,
		}, err)

		c.JSON(http.StatusInternalServerError, webmodels.ErrorMessage{
			Code:    500,
			Message: i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "FailedToApproveTeam"}),
		})
		return
	}

	// 记录批准队伍成功日志
	tasks.LogAdminOperation(c, models.ActionApprove, models.ResourceTypeTeam, &team.TeamName, map[string]interface{}{
		"team_id":    team.TeamID,
		"team_name":  team.TeamName,
		"game_id":    team.GameID,
		"old_status": oldStatus,
		"new_status": models.ParticipateApproved,
	})

	c.JSON(http.StatusOK, gin.H{
		"code":    200,
		"message": i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "TeamApproved"}),
	})
}

// AdminBanTeam 禁赛队伍
func AdminBanTeam(c *gin.Context) {
	var payload webmodels.AdminTeamOperationPayload
	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, webmodels.ErrorMessage{
			Code:    400,
			Message: i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "InvalidRequestPayload"}),
		})
		return
	}

	// 查找队伍
	var team models.Team
	if err := dbtool.DB().Where("team_id = ?", payload.TeamID).First(&team).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, webmodels.ErrorMessage{
				Code:    404,
				Message: i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "TeamNotFound"}),
			})
		} else {
			c.JSON(http.StatusInternalServerError, webmodels.ErrorMessage{
				Code:    500,
				Message: i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "DatabaseError"}),
			})
		}
		return
	}

	// 管理员队伍无法被禁赛
	if team.TeamType == models.TeamTypeAdmin {
		c.JSON(http.StatusForbidden, gin.H{
			"code":    403,
			"message": i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "CannotBanAdminTeam"}),
		})
		return
	}

	solveList := []models.Solve{}
	if err := dbtool.DB().Where("team_id = ?", team.TeamID).Find(&solveList).Error; err != nil {
		// 记录禁赛队伍失败日志
		tasks.LogAdminOperationWithError(c, models.ActionBan, models.ResourceTypeTeam, &team.TeamName, map[string]interface{}{
			"team_id":   team.TeamID,
			"team_name": team.TeamName,
			"game_id":   team.GameID,
			"type":      "FailedToFetchSolvesBeforeBan",
		}, err)

		c.JSON(http.StatusInternalServerError, webmodels.ErrorMessage{
			Code:    500,
			Message: i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "FailedToBanTeam"}),
		})
		return
	}

	challengeSolvedList := make([]int64, 0)
	for _, solve := range solveList {
		if slices.Contains(challengeSolvedList, solve.ChallengeID) {
			continue
		}
		challengeSolvedList = append(challengeSolvedList, solve.ChallengeID)
	}

	// 更新队伍状态为禁赛
	oldStatus := team.TeamStatus
	if err := dbtool.DB().Model(&team).Update("team_status", models.ParticipateBanned).Error; err != nil {
		// 记录禁赛队伍失败日志
		tasks.LogAdminOperationWithError(c, models.ActionBan, models.ResourceTypeTeam, &team.TeamName, map[string]interface{}{
			"team_id":    team.TeamID,
			"team_name":  team.TeamName,
			"game_id":    team.GameID,
			"old_status": oldStatus,
		}, err)

		c.JSON(http.StatusInternalServerError, webmodels.ErrorMessage{
			Code:    500,
			Message: i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "FailedToBanTeam"}),
		})
		return
	}

	tasks.NewRecalculateRankForAChallengeTask(payload.GameID, challengeSolvedList)

	// 记录禁赛队伍成功日志
	tasks.LogAdminOperation(c, models.ActionBan, models.ResourceTypeTeam, &team.TeamName, map[string]interface{}{
		"team_id":    team.TeamID,
		"team_name":  team.TeamName,
		"game_id":    team.GameID,
		"old_status": oldStatus,
		"new_status": models.ParticipateBanned,
	})

	c.JSON(http.StatusOK, gin.H{
		"code":    200,
		"message": i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "TeamBanned"}),
	})
}

// AdminUnbanTeam 解禁队伍
func AdminUnbanTeam(c *gin.Context) {
	var payload webmodels.AdminTeamOperationPayload
	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, webmodels.ErrorMessage{
			Code:    400,
			Message: i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "InvalidRequestPayload"}),
		})
		return
	}

	// 查找队伍
	var team models.Team
	if err := dbtool.DB().Where("team_id = ?", payload.TeamID).First(&team).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, webmodels.ErrorMessage{
				Code:    404,
				Message: i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "TeamNotFound"}),
			})
		} else {
			c.JSON(http.StatusInternalServerError, webmodels.ErrorMessage{
				Code:    500,
				Message: i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "DatabaseError"}),
			})
		}
		return
	}

	// 检查当前状态
	if team.TeamStatus != models.ParticipateBanned {
		c.JSON(http.StatusBadRequest, webmodels.ErrorMessage{
			Code:    400,
			Message: i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "TeamIsNotBanned"}),
		})
		return
	}

	solveList := []models.Solve{}
	if err := dbtool.DB().Where("team_id = ?", team.TeamID).Find(&solveList).Error; err != nil {
		// 记录禁赛队伍失败日志
		tasks.LogAdminOperationWithError(c, models.ActionBan, models.ResourceTypeTeam, &team.TeamName, map[string]interface{}{
			"team_id":   team.TeamID,
			"team_name": team.TeamName,
			"game_id":   team.GameID,
			"type":      "FailedToFetchSolvesBeforeBan",
		}, err)

		c.JSON(http.StatusInternalServerError, webmodels.ErrorMessage{
			Code:    500,
			Message: i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "FailedToBanTeam"}),
		})
		return
	}

	challengeSolvedList := make([]int64, 0)
	for _, solve := range solveList {
		if slices.Contains(challengeSolvedList, solve.ChallengeID) {
			continue
		}
		challengeSolvedList = append(challengeSolvedList, solve.ChallengeID)
	}

	// 更新队伍状态为已批准
	oldStatus := team.TeamStatus
	if err := dbtool.DB().Model(&team).Update("team_status", models.ParticipateApproved).Error; err != nil {
		// 记录解禁队伍失败日志
		tasks.LogAdminOperationWithError(c, models.ActionUnban, models.ResourceTypeTeam, &team.TeamName, map[string]interface{}{
			"team_id":    team.TeamID,
			"team_name":  team.TeamName,
			"game_id":    team.GameID,
			"old_status": oldStatus,
		}, err)

		c.JSON(http.StatusInternalServerError, webmodels.ErrorMessage{
			Code:    500,
			Message: i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "FailedToUnbanTeam"}),
		})
		return
	}

	tasks.NewRecalculateRankForAChallengeTask(payload.GameID, challengeSolvedList)

	// 记录解禁队伍成功日志
	tasks.LogAdminOperation(c, models.ActionUnban, models.ResourceTypeTeam, &team.TeamName, map[string]interface{}{
		"team_id":    team.TeamID,
		"team_name":  team.TeamName,
		"game_id":    team.GameID,
		"old_status": oldStatus,
		"new_status": models.ParticipateApproved,
	})

	c.JSON(http.StatusOK, gin.H{
		"code":    200,
		"message": i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "TeamUnbanned"}),
	})
}

// AdminDeleteTeam 删除队伍
func AdminDeleteTeam(c *gin.Context) {
	var payload webmodels.AdminTeamOperationPayload
	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, webmodels.ErrorMessage{
			Code:    400,
			Message: i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "InvalidRequestPayload"}),
		})
		return
	}

	// 查找队伍
	var team models.Team
	if err := dbtool.DB().Where("team_id = ?", payload.TeamID).First(&team).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, webmodels.ErrorMessage{
				Code:    404,
				Message: i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "TeamNotFound"}),
			})
		} else {
			c.JSON(http.StatusInternalServerError, webmodels.ErrorMessage{
				Code:    500,
				Message: i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "DatabaseError"}),
			})
		}
		return
	}

	// 管理员队伍无法被删除
	if team.TeamType == models.TeamTypeAdmin {
		c.JSON(http.StatusForbidden, gin.H{
			"code":    403,
			"message": i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "CannotDeleteAdminTeam"}),
		})
		return
	}

	// 开始事务删除相关数据
	tx := dbtool.DB().Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	// 删除队伍
	if err := tx.Delete(&team).Error; err != nil {
		tx.Rollback()

		// 记录删除队伍失败日志
		tasks.LogAdminOperationWithError(c, models.ActionDelete, models.ResourceTypeTeam, &team.TeamName, map[string]interface{}{
			"team_id":     team.TeamID,
			"team_name":   team.TeamName,
			"game_id":     team.GameID,
			"team_status": team.TeamStatus,
		}, err)

		c.JSON(http.StatusInternalServerError, webmodels.ErrorMessage{
			Code:    500,
			Message: i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "FailedToDeleteTeam"}),
		})
		return
	}

	// 提交事务
	if err := tx.Commit().Error; err != nil {
		c.JSON(http.StatusInternalServerError, webmodels.ErrorMessage{
			Code:    500,
			Message: i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "TransactionFailed"}),
		})
		return
	}

	// 记录删除队伍成功日志
	tasks.LogAdminOperation(c, models.ActionDelete, models.ResourceTypeTeam, &team.TeamName, map[string]interface{}{
		"team_id":      team.TeamID,
		"team_name":    team.TeamName,
		"game_id":      team.GameID,
		"team_status":  team.TeamStatus,
		"member_count": len(team.TeamMembers),
	})

	c.JSON(http.StatusOK, gin.H{
		"code":    200,
		"message": i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "TeamDeleted"}),
	})
}
