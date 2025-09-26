package controllers

import (
	"a1ctf/src/db/models"
	dbtool "a1ctf/src/utils/db_tool"
	i18ntool "a1ctf/src/utils/i18n_tool"
	"a1ctf/src/webmodels"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/nicksnyder/go-i18n/v2/i18n"
	"gorm.io/gorm"
)

func AdminGetGameGroups(c *gin.Context) {
	gameIDStr := c.Param("game_id")
	gameID, err := strconv.ParseInt(gameIDStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, webmodels.ErrorMessage{
			Code:    400,
			Message: i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "InvalidGameID"}),
		})
		return
	}

	var groups []models.GameGroup
	if err := dbtool.DB().Where("game_id = ?", gameID).Order("display_order ASC, created_at ASC").Preload("Teams").Find(&groups).Error; err != nil {
		c.JSON(http.StatusInternalServerError, webmodels.ErrorMessage{
			Code:    500,
			Message: i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "FailedToLoadGameGroups"}),
		})
		return
	}

	result := make([]webmodels.AdminGameGroupItem, 0)

	for _, group := range groups {
		groupItem := webmodels.AdminGameGroupItem{
			GroupID:     group.GroupID,
			GameID:      group.GameID,
			GroupName:   group.GroupName,
			InviteCode:  group.InviteCode,
			Description: group.Description,
			PeopleCount: int64(len(group.Teams)),
			CreatedAt:   group.CreatedAt,
			UpdatedAt:   group.UpdatedAt,
		}
		result = append(result, groupItem)
	}

	c.JSON(http.StatusOK, gin.H{
		"code": 200,
		"data": result,
	})
}

func AdminCreateGameGroup(c *gin.Context) {
	gameIDStr := c.Param("game_id")
	gameID, err := strconv.ParseInt(gameIDStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, webmodels.ErrorMessage{
			Code:    400,
			Message: i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "InvalidGameID"}),
		})
		return
	}

	var payload webmodels.CreateGameGroupPayload
	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, webmodels.ErrorMessage{
			Code:    400,
			Message: i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "InvalidRequestPayload"}),
		})
		return
	}

	// 检查分组名称是否已存在
	var existingGroup models.GameGroup
	if err := dbtool.DB().Where("game_id = ? AND group_name = ?", gameID, payload.GroupName).First(&existingGroup).Error; err == nil {
		c.JSON(http.StatusConflict, webmodels.ErrorMessage{
			Code:    409,
			Message: i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "GroupNameAlreadyExists"}),
		})
		return
	}

	// 获取当前最大的显示顺序
	var maxOrder int32
	dbtool.DB().Model(&models.GameGroup{}).Where("game_id = ?", gameID).Select("COALESCE(MAX(display_order), 0)").Scan(&maxOrder)

	newGroup := models.GameGroup{
		GameID:       gameID,
		GroupName:    payload.GroupName,
		Description:  &payload.Description,
		DisplayOrder: maxOrder + 1,
		CreatedAt:    time.Now().UTC(),
		UpdatedAt:    time.Now().UTC(),
	}

	if err := dbtool.DB().Create(&newGroup).Error; err != nil {
		c.JSON(http.StatusInternalServerError, webmodels.ErrorMessage{
			Code:    500,
			Message: i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "FailedToCreateGroup"}),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code": 200,
		"data": newGroup,
	})
}

func AdminUpdateGameGroup(c *gin.Context) {
	gameIDStr := c.Param("game_id")
	gameID, err := strconv.ParseInt(gameIDStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, webmodels.ErrorMessage{
			Code:    400,
			Message: i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "InvalidGameID"}),
		})
		return
	}

	groupIDStr := c.Param("group_id")
	groupID, err := strconv.ParseInt(groupIDStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, webmodels.ErrorMessage{
			Code:    400,
			Message: i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "InvalidGroupID"}),
		})
		return
	}

	var payload webmodels.UpdateGameGroupPayload
	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, webmodels.ErrorMessage{
			Code:    400,
			Message: i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "InvalidRequestPayload"}),
		})
		return
	}

	// 检查分组是否存在
	var group models.GameGroup
	if err := dbtool.DB().Where("group_id = ? AND game_id = ?", groupID, gameID).First(&group).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, webmodels.ErrorMessage{
				Code:    404,
				Message: i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "GroupNotFound"}),
			})
		} else {
			c.JSON(http.StatusInternalServerError, webmodels.ErrorMessage{
				Code:    500,
				Message: i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "FailedToLoadGroup"}),
			})
		}
		return
	}

	// 检查新名称是否与其他分组冲突
	var existingGroup models.GameGroup
	if err := dbtool.DB().Where("game_id = ? AND group_name = ? AND group_id != ?", gameID, payload.GroupName, groupID).First(&existingGroup).Error; err == nil {
		c.JSON(http.StatusConflict, webmodels.ErrorMessage{
			Code:    409,
			Message: i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "GroupNameAlreadyExists"}),
		})
		return
	}

	// 更新分组信息
	if err := dbtool.DB().Model(&group).Updates(map[string]interface{}{
		"group_name":        payload.GroupName,
		"group_description": payload.Description,
		"updated_at":        time.Now().UTC(),
	}).Error; err != nil {
		c.JSON(http.StatusInternalServerError, webmodels.ErrorMessage{
			Code:    500,
			Message: i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "FailedToUpdateGroup"}),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code":    200,
		"message": i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "GroupUpdatedSuccessfully"}),
	})
}

func AdminDeleteGameGroup(c *gin.Context) {
	gameIDStr := c.Param("game_id")
	gameID, err := strconv.ParseInt(gameIDStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, webmodels.ErrorMessage{
			Code:    400,
			Message: i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "InvalidGameID"}),
		})
		return
	}

	groupIDStr := c.Param("group_id")
	groupID, err := strconv.ParseInt(groupIDStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, webmodels.ErrorMessage{
			Code:    400,
			Message: i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "InvalidGroupID"}),
		})
		return
	}

	// 检查分组是否存在
	var group models.GameGroup
	if err := dbtool.DB().Where("group_id = ? AND game_id = ?", groupID, gameID).First(&group).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, webmodels.ErrorMessage{
				Code:    404,
				Message: i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "GroupNotFound"}),
			})
		} else {
			c.JSON(http.StatusInternalServerError, webmodels.ErrorMessage{
				Code:    500,
				Message: i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "FailedToLoadGroup"}),
			})
		}
		return
	}

	// 检查是否有队伍在此分组中
	var teamCount int64
	if err := dbtool.DB().Model(&models.Team{}).Where("group_id = ?", groupID).Count(&teamCount).Error; err != nil {
		c.JSON(http.StatusInternalServerError, webmodels.ErrorMessage{
			Code:    500,
			Message: i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "FailedToCheckTeamsInGroup"}),
		})
		return
	}

	if teamCount > 0 {
		c.JSON(http.StatusBadRequest, webmodels.ErrorMessage{
			Code:    400,
			Message: i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "CannotDeleteGroupWithTeams"}),
		})
		return
	}

	// 删除分组
	if err := dbtool.DB().Delete(&group).Error; err != nil {
		c.JSON(http.StatusInternalServerError, webmodels.ErrorMessage{
			Code:    500,
			Message: i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "FailedToDeleteGroup"}),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code":    200,
		"message": i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "GroupDeletedSuccessfully"}),
	})
}
