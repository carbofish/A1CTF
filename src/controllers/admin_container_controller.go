package controllers

import (
	"a1ctf/src/db/models"
	"a1ctf/src/tasks"
	dbtool "a1ctf/src/utils/db_tool"
	i18ntool "a1ctf/src/utils/i18n_tool"
	"a1ctf/src/webmodels"
	"fmt"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/nicksnyder/go-i18n/v2/i18n"
	"gorm.io/gorm"
)

// AdminListContainers 获取容器列表
func AdminListContainers(c *gin.Context) {
	var payload webmodels.AdminListContainersPayload
	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    400,
			"message": i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "InvalidRequestPayload"}),
		})
		return
	}

	query := dbtool.DB().Model(&models.Container{})

	query = query.Joins("JOIN challenges challenge ON containers.challenge_id = challenge.challenge_id")
	query = query.Joins("JOIN teams team ON containers.team_id = team.team_id")

	// 如果提供了游戏ID，则按游戏ID过滤
	if payload.GameID > 0 {
		query = query.Where("containers.game_id = ? AND container_status NOT IN ?", payload.GameID, []models.ContainerStatus{models.ContainerStopped})
	}

	if payload.ChallengeID > 0 {
		query = query.Where("containers.challenge_id = ?", payload.ChallengeID)
	}

	// 如果有搜索关键词，添加搜索条件
	if payload.Search != "" {
		searchPattern := fmt.Sprintf("%%%s%%", payload.Search)
		query = query.Where(`challenge.name ILIKE ? 
		OR container_id::text = ? 
		OR team.team_name ILIKE ? 
		OR team.team_hash = ? 
		OR CONCAT('cl-', containers.ingame_id, '-', team.team_hash) = ? 
		OR containers.challenge_id::text = ? 
		OR containers.team_id::text = ?`, searchPattern, payload.Search, searchPattern, payload.Search, payload.Search, payload.Search, payload.Search)
	}

	if !payload.ShowFailed {
		query = query.Where("containers.container_status NOT IN ?", []models.ContainerStatus{models.ContainerError})
	}

	// 分页查询容器列表
	var total int64
	query.Count(&total)

	var containers []models.Container
	if err := query.Offset(payload.Offset).Limit(payload.Size).Order("start_time DESC").Find(&containers).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    500,
			"message": i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "FailedToLoadContainers"}),
		})
		return
	}

	// 查询相关的团队和游戏信息
	var teamIDs []int64
	var gameIDs []int64
	for _, container := range containers {
		teamIDs = append(teamIDs, container.TeamID)
		gameIDs = append(gameIDs, container.GameID)
	}

	var teams []models.Team
	if err := dbtool.DB().Where("team_id IN ?", teamIDs).Find(&teams).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    500,
			"message": i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "FailedToLoadTeams"}),
		})
		return
	}

	var games []models.Game
	if err := dbtool.DB().Where("game_id IN ?", gameIDs).Find(&games).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    500,
			"message": i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "FailedToLoadGames"}),
		})
		return
	}

	// 构建团队和游戏的映射关系
	teamMap := make(map[int64]models.Team)
	for _, team := range teams {
		teamMap[team.TeamID] = team
	}

	gameMap := make(map[int64]models.Game)
	for _, game := range games {
		gameMap[game.GameID] = game
	}

	// 如果有搜索关键词，需要进一步过滤团队名称和游戏名称
	var containerItems []webmodels.AdminContainerItem = make([]webmodels.AdminContainerItem, 0)
	for _, container := range containers {
		team, teamExists := teamMap[container.TeamID]
		game, gameExists := gameMap[container.GameID]

		var teamName, gameName string
		if teamExists {
			teamName = team.TeamName
		}
		if gameExists {
			gameName = game.Name
		}

		// 处理容器端口，返回所有容器的暴露端口信息
		var containerPorts models.ExposePorts
		for _, exposeInfo := range container.ContainerExposeInfos {
			containerPorts = append(containerPorts, exposeInfo.ExposePorts...)
		}

		podID := fmt.Sprintf("cl-%d-%s", container.InGameID, container.TeamHash)

		containerNameList := make([]string, 0)
		for _, exposeInfo := range container.ContainerConfig {
			containerNameList = append(containerNameList, exposeInfo.Name)
		}

		containerItems = append(containerItems, webmodels.AdminContainerItem{
			ContainerID:         container.ContainerID,
			ContainerName:       container.ChallengeName,
			ContainerStatus:     container.ContainerStatus,
			ContainerExpireTime: container.ExpireTime,
			ContainerType:       "动态容器", // 可以根据实际情况设置
			ContainerPorts:      containerPorts,
			ContainerNameList:   containerNameList,
			TeamName:            teamName,
			GameName:            gameName,
			ChallengeName:       container.ChallengeName,
			PodID:               podID,
			TeamID:              container.TeamID,
			ChallengeID:         container.ChallengeID,
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"code":  200,
		"data":  containerItems,
		"total": total, // 返回过滤后的总数
	})
}

// AdminDeleteContainer 删除容器
func AdminDeleteContainer(c *gin.Context) {
	var payload webmodels.AdminContainerOperationPayload
	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    400,
			"message": i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "InvalidRequestPayload"}),
		})
		return
	}

	// 开始事务
	tx := dbtool.DB().Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	// 查询容器
	var container models.Container
	if err := tx.Where("container_id = ?", payload.ContainerID).First(&container).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{
				"code":    404,
				"message": i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "ContainerNotFound"}),
			})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{
				"code":    500,
				"message": i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "FailedToQueryContainer"}),
			})
		}
		tx.Rollback()
		return
	}

	// 删除容器
	if err := tx.Model(&container).Update("container_status", models.ContainerStopping).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    500,
			"message": i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "FailedToDeleteContainer"}),
		})
		tx.Rollback()
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

	// 异步调用K8S删除容器的任务
	tasks.NewContainerStopTask(container)

	c.JSON(http.StatusOK, gin.H{
		"code":    200,
		"message": i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "ContainerDeleted"}),
	})
}

// AdminExtendContainer 延长容器生命周期
func AdminExtendContainer(c *gin.Context) {
	var payload webmodels.AdminExtendContainerPayload
	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    400,
			"message": i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "InvalidRequestPayload"}),
		})
		return
	}

	// 查询容器
	var container models.Container
	if err := dbtool.DB().Where("container_id = ?", payload.ContainerID).First(&container).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{
				"code":    404,
				"message": i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "ContainerNotFound"}),
			})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{
				"code":    500,
				"message": i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "FailedToQueryContainer"}),
			})
		}
		return
	}

	// 非运行中的容器禁止延长时间
	if container.ContainerStatus != models.ContainerRunning {
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    400,
			"message": i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "FailedToUpdateContainerExpireTime"}),
		})
		return
	}

	// 延长容器生命周期2小时
	newExpireTime := container.ExpireTime.Add(2 * time.Hour)

	// 更新容器过期时间
	if err := dbtool.DB().Model(&container).Update("expire_time", newExpireTime).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    500,
			"message": i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "FailedToUpdateContainerExpireTime"}),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code":            200,
		"message":         i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "ContainerLifetimeExtended"}),
		"new_expire_time": newExpireTime,
	})
}

// AdminGetContainerFlag 获取容器Flag
func AdminGetContainerFlag(c *gin.Context) {
	containerID := c.Query("container_id")
	if containerID == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    400,
			"message": i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "ContainerIDRequired"}),
		})
		return
	}

	// 查询容器
	var container models.Container
	if err := dbtool.DB().Where("container_id = ?", containerID).First(&container).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{
				"code":    404,
				"message": i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "ContainerNotFound"}),
			})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{
				"code":    500,
				"message": i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "FailedToQueryContainer"}),
			})
		}
		return
	}

	// 查询对应的Flag
	var teamFlag models.TeamFlag
	if err := dbtool.DB().Where("flag_id = ?", container.FlagID).First(&teamFlag).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{
				"code":    404,
				"message": i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "FlagNotFound"}),
			})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{
				"code":    500,
				"message": i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "FailedToQueryFlag"}),
			})
		}
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code": 200,
		"data": gin.H{
			"flag_content": teamFlag.FlagContent,
		},
	})
}
