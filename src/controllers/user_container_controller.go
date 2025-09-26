package controllers

import (
	"a1ctf/src/db/models"
	"a1ctf/src/tasks"
	dbtool "a1ctf/src/utils/db_tool"
	i18ntool "a1ctf/src/utils/i18n_tool"
	redistool "a1ctf/src/utils/redis_tool"
	"a1ctf/src/webmodels"
	"errors"
	"fmt"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/nicksnyder/go-i18n/v2/i18n"
	"github.com/spf13/viper"
	"gorm.io/gorm"
)

func getTimeLimitConfig() time.Duration {
	var ret time.Duration
	if config := viper.Get("game-settings.container-cooldown-time"); config == nil {
		ret = time.Minute
	} else {
		ret = viper.GetDuration("game-settings.container-cooldown-time")
	}
	return ret
}

var timeLimit = getTimeLimitConfig()

func UserCreateGameContainer(c *gin.Context) {
	game := c.MustGet("game").(models.Game)
	team := c.MustGet("team").(models.Team)
	user := c.MustGet("user").(models.User)
	gameChallenge := c.MustGet("game_challenge").(models.GameChallenge)

	var containers []models.Container
	if err := dbtool.DB().Where("game_id = ? AND team_id = ? AND (container_status = ? or container_status = ? or container_status = ?)", game.GameID, team.TeamID, models.ContainerRunning, models.ContainerQueueing, models.ContainerStarting).Find(&containers).Error; err != nil {
		c.JSON(http.StatusInternalServerError, webmodels.ErrorMessage{
			Code:    500,
			Message: i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "FailedToLoadContainers"}),
		})
		return
	}

	for _, container := range containers {
		if container.ChallengeID == *gameChallenge.Challenge.ChallengeID && container.ContainerStatus == models.ContainerRunning {
			c.JSON(http.StatusBadRequest, webmodels.ErrorMessage{
				Code:    400,
				Message: i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "YouHaveCreatedContainerForChallenge"}),
			})
			return
		}

		if container.ChallengeID == *gameChallenge.Challenge.ChallengeID && container.ContainerStatus == models.ContainerQueueing {
			c.JSON(http.StatusBadRequest, webmodels.ErrorMessage{
				Code:    400,
				Message: i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "YourContainerIsQueueing"}),
			})
			return
		}
	}

	if len(containers) >= int(game.ContainerNumberLimit) {
		c.JSON(http.StatusConflict, webmodels.ErrorMessage{
			Code:    409,
			Message: i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "YouHaveCreatedTooManyContainers"}),
		})
		return
	}

	var flag models.TeamFlag
	if err := dbtool.DB().Where("game_id = ? AND team_id = ? AND challenge_id = ?", game.GameID, team.TeamID, gameChallenge.Challenge.ChallengeID).First(&flag).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusForbidden, webmodels.ErrorMessage{
				Code:    403,
				Message: i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "FlagHaventBeenCreatedYet"}),
			})
			return
		} else {
			c.JSON(http.StatusInternalServerError, webmodels.ErrorMessage{
				Code:    500,
				Message: i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "SystemError"}),
			})
			return
		}
	}

	clientIP := c.ClientIP()
	now := time.Now()

	// 加入数据库
	newContainer := models.Container{
		ContainerID:          uuid.NewString(),
		GameID:               game.GameID,
		FlagID:               flag.FlagID,
		TeamID:               team.TeamID,
		ChallengeID:          *gameChallenge.Challenge.ChallengeID,
		InGameID:             gameChallenge.IngameID,
		StartTime:            now.UTC(),
		ExpireTime:           now.Add(time.Duration(2) * time.Hour).UTC(),
		ContainerExposeInfos: make(models.ContainerExposeInfos, 0),
		ContainerStatus:      models.ContainerQueueing,
		ContainerConfig:      *gameChallenge.Challenge.ContainerConfig,
		ChallengeName:        gameChallenge.Challenge.Name,
		TeamHash:             team.TeamHash,
		SubmiterIP:           &clientIP,
	}

	// 用户操作靶机的 60 秒 CD
	operationName := fmt.Sprintf("%s:containerOperation", user.UserID)
	timeLimit = getTimeLimitConfig()
	locked := redistool.LockForATime(operationName, timeLimit)

	if !locked {
		c.JSON(http.StatusTooManyRequests, webmodels.ErrorMessage{
			Code:    429,
			Message: i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "RequestTooFast", TemplateData: map[string]interface{}{"Time": timeLimit.Seconds()}}),
		})
		return
	}

	if err := dbtool.DB().Create(&newContainer).Error; err != nil {

		if errors.Is(err, gorm.ErrDuplicatedKey) {
			c.JSON(http.StatusBadRequest, webmodels.ErrorMessage{
				Code:    400,
				Message: i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "YouHaveCreatedContainerForChallenge"}),
			})
			return
		}

		// 记录创建容器失败日志
		tasks.LogUserOperationWithError(c, models.ActionStartContainer, models.ResourceTypeContainer, &newContainer.ContainerID, map[string]interface{}{
			"game_id":        game.GameID,
			"user_id":        user.UserID,
			"team_id":        team.TeamID,
			"challenge_id":   gameChallenge.ChallengeID,
			"challenge_name": gameChallenge.Challenge.Name,
		}, err)

		c.JSON(http.StatusInternalServerError, webmodels.ErrorMessage{
			Code:    500,
			Message: i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "SystemError"}),
		})
		return
	}

	// k8s 开启 pod 需要 Challenge的AllowWAN/AllowDNS 和 TeamFlag的FlagContent 的信息
	newContainer.Challenge = gameChallenge.Challenge
	newContainer.TeamFlag = flag

	// 异步开启k8s的pod任务
	tasks.NewContainerStartTask(newContainer)

	// 记录创建容器请求
	tasks.LogUserOperation(c, models.ActionStartContainer, models.ResourceTypeContainer, &newContainer.ContainerID, map[string]interface{}{
		"game_id":        game.GameID,
		"user_id":        user.UserID,
		"team_id":        team.TeamID,
		"challenge_id":   gameChallenge.ChallengeID,
		"challenge_name": gameChallenge.Challenge.Name,
		"expire_time":    newContainer.ExpireTime,
		"flag":           newContainer.TeamFlag.FlagContent,
	})

	c.JSON(http.StatusOK, gin.H{
		"code":    200,
		"message": "OK",
	})
}

func UserCloseGameContainer(c *gin.Context) {
	game := c.MustGet("game").(models.Game)
	team := c.MustGet("team").(models.Team)
	user := c.MustGet("user").(models.User)

	challengeIDStr := c.Param("challenge_id")
	challengeID, err := strconv.ParseInt(challengeIDStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, webmodels.ErrorMessage{
			Code:    400,
			Message: i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "InvalidChallengeID"}),
		})
		c.Abort()
		return
	}

	var containers []models.Container
	if err := dbtool.DB().Where("challenge_id = ? AND team_id = ? AND container_status = ?", challengeID, team.TeamID, models.ContainerRunning).Find(&containers).Error; err != nil {
		c.JSON(http.StatusInternalServerError, webmodels.ErrorMessage{
			Code:    500,
			Message: i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "FailedToLoadContainers"}),
		})
		return
	}

	if len(containers) == 0 {
		c.JSON(http.StatusBadRequest, webmodels.ErrorMessage{
			Code:    400,
			Message: i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "LaunchContainerFirst"}),
		})
		return
	}

	if len(containers) != 1 {
		c.JSON(http.StatusBadRequest, webmodels.ErrorMessage{
			Code:    400,
			Message: i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "SystemError"}),
		})
		return
	}

	curContainer := containers[0]

	// 用户操作靶机的 60 秒 CD
	operationName := fmt.Sprintf("%s:containerOperation", user.UserID)
	timeLimit = getTimeLimitConfig()
	locked := redistool.LockForATime(operationName, timeLimit)

	if !locked {
		c.JSON(http.StatusTooManyRequests, webmodels.ErrorMessage{
			Code:    429,
			Message: i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "RequestTooFast", TemplateData: map[string]interface{}{"Time": timeLimit.Seconds()}}),
		})
		return
	}

	// 锁住对一个容器ID的操作
	operationNameForContainer := fmt.Sprintf("containerLock:%s", curContainer.ContainerID)
	lockedForContainer := redistool.LockForATime(operationNameForContainer, timeLimit)

	if !lockedForContainer {
		c.JSON(http.StatusTooManyRequests, webmodels.ErrorMessage{
			Code:    429,
			Message: i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "RequestTooFast", TemplateData: map[string]interface{}{"Time": timeLimit.Seconds()}}),
		})
		return
	}

	if err := dbtool.DB().Model(&curContainer).Updates(map[string]interface{}{
		"container_status": models.ContainerStopping,
	}).Error; err != nil {
		// 记录停止容器失败日志
		tasks.LogUserOperationWithError(c, models.ActionStopContainer, models.ResourceTypeContainer, &curContainer.ContainerID, map[string]interface{}{
			"game_id":        game.GameID,
			"user_id":        user.UserID,
			"team_id":        team.TeamID,
			"challenge_id":   challengeID,
			"challenge_name": curContainer.ChallengeName,
			"container_id":   curContainer.ContainerID,
		}, err)

		c.JSON(http.StatusInternalServerError, webmodels.ErrorMessage{
			Code:    501,
			Message: i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "SystemError"}),
		})
		return
	}

	// 记录停止容器成功日志
	tasks.LogUserOperation(c, models.ActionStopContainer, models.ResourceTypeContainer, &curContainer.ContainerID, map[string]interface{}{
		"game_id":        game.GameID,
		"user_id":        user.UserID,
		"team_id":        team.TeamID,
		"challenge_id":   challengeID,
		"challenge_name": curContainer.ChallengeName,
		"container_id":   curContainer.ContainerID,
	})

	// 异步调用k8s删除pod任务
	tasks.NewContainerStopTask(curContainer)

	c.JSON(http.StatusOK, gin.H{
		"code":    200,
		"message": "OK",
	})
}

func UserExtendGameContainer(c *gin.Context) {
	game := c.MustGet("game").(models.Game)
	team := c.MustGet("team").(models.Team)
	user := c.MustGet("user").(models.User)
	challengeID := c.MustGet("challenge_id").(int64)

	operationName := fmt.Sprintf("%s:containerOperation", user.UserID)
	timeLimit = getTimeLimitConfig()
	locked := redistool.LockForATime(operationName, timeLimit)

	if !locked {
		c.JSON(http.StatusTooManyRequests, webmodels.ErrorMessage{
			Code:    429,
			Message: i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "RequestTooFast", TemplateData: map[string]interface{}{"Time": timeLimit.Seconds()}}),
		})
		return
	}

	var containers []models.Container
	if err := dbtool.DB().Where("challenge_id = ? AND team_id = ? AND container_status = ?", challengeID, team.TeamID, models.ContainerRunning).Find(&containers).Error; err != nil {
		c.JSON(http.StatusInternalServerError, webmodels.ErrorMessage{
			Code:    500,
			Message: i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "FailedToLoadContainers"}),
		})
		return
	}

	if len(containers) == 0 {
		c.JSON(http.StatusBadRequest, webmodels.ErrorMessage{
			Code:    400,
			Message: i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "LaunchContainerFirst"}),
		})
		return
	}

	if len(containers) != 1 {
		c.JSON(http.StatusBadRequest, webmodels.ErrorMessage{
			Code:    400,
			Message: i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "SystemError"}),
		})
		return
	}

	curContainer := containers[0]

	// 锁住对一个容器ID的操作
	operationNameForContainer := fmt.Sprintf("containerLock:%s", curContainer.ContainerID)
	lockedForContainer := redistool.LockForATime(operationNameForContainer, timeLimit)

	if !lockedForContainer {
		c.JSON(http.StatusTooManyRequests, webmodels.ErrorMessage{
			Code:    429,
			Message: i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "RequestTooFast", TemplateData: map[string]interface{}{"Time": timeLimit.Seconds()}}),
		})
		return
	}

	// 到期时间大于半小时的不可延长
	if curContainer.ExpireTime.Sub(time.Now().UTC()) > time.Minute*30 {
		c.JSON(http.StatusBadRequest, webmodels.ErrorMessage{
			Code:    400,
			Message: i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "ContainerExpireTimeTooShort"}),
		})
		return
	}

	// 记录旧的容器到期时间，Updates更新后会改变该值
	oldExpireTime := curContainer.ExpireTime
	// 延长时间为当前时间的2小时之后
	newExpireTime := time.Now().Add(time.Duration(2) * time.Hour).UTC()

	if err := dbtool.DB().Model(&curContainer).Updates(map[string]interface{}{
		"expire_time": newExpireTime,
	}).Error; err != nil {
		tasks.LogUserOperationWithError(c, models.ActionExtendContainer, models.ResourceTypeContainer, &curContainer.ContainerID, map[string]interface{}{
			"game_id":         game.GameID,
			"team_id":         team.TeamID,
			"user_id":         user.UserID,
			"challenge_id":    challengeID,
			"challenge_name":  curContainer.ChallengeName,
			"container_id":    curContainer.ContainerID,
			"old_expire_time": oldExpireTime,
			"new_expire_time": newExpireTime,
		}, err)

		c.JSON(http.StatusInternalServerError, webmodels.ErrorMessage{
			Code:    501,
			Message: i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "SystemError"}),
		})
		return
	}

	tasks.LogUserOperation(c, models.ActionExtendContainer, models.ResourceTypeContainer, &curContainer.ContainerID, map[string]interface{}{
		"game_id":         game.GameID,
		"team_id":         team.TeamID,
		"user_id":         user.UserID,
		"challenge_id":    challengeID,
		"challenge_name":  curContainer.ChallengeName,
		"container_id":    curContainer.ContainerID,
		"old_expire_time": oldExpireTime,
		"new_expire_time": newExpireTime,
	})

	c.JSON(http.StatusOK, gin.H{
		"code": 200,
		"data": gin.H{
			"new_expire_time": newExpireTime,
		},
	})
}

func UserGetGameChallengeContainerInfo(c *gin.Context) {
	game := c.MustGet("game").(models.Game)
	team := c.MustGet("team").(models.Team)

	challengeIDStr := c.Param("challenge_id")
	challengeID, err := strconv.ParseInt(challengeIDStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, webmodels.ErrorMessage{
			Code:    400,
			Message: i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "InvalidChallengeID"}),
		})
		c.Abort()
		return
	}

	var containers []models.Container
	if err := dbtool.DB().Where("challenge_id = ? AND team_id = ? AND (container_status = ? OR container_status = ? OR container_status = ?)", challengeID, team.TeamID, models.ContainerRunning, models.ContainerQueueing, models.ContainerStarting).Find(&containers).Error; err != nil {
		c.JSON(http.StatusInternalServerError, webmodels.ErrorMessage{
			Code:    500,
			Message: i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "FailedToLoadContainers"}),
		})
		return
	}

	if len(containers) == 0 {
		c.JSON(http.StatusBadRequest, webmodels.ErrorMessage{
			Code:    400,
			Message: i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "LaunchContainerFirst"}),
		})
		return
	}

	if len(containers) != 1 {
		c.JSON(http.StatusBadRequest, webmodels.ErrorMessage{
			Code:    400,
			Message: i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "SystemError"}),
		})
		return
	}

	var gameChallenges []models.GameChallenge

	// 使用 Preload 进行关联查询
	if err := dbtool.DB().Preload("Challenge").
		Where("game_id = ? and game_challenges.challenge_id = ?", game.GameID, challengeID).
		Find(&gameChallenges).Error; err != nil {

		c.JSON(http.StatusInternalServerError, webmodels.ErrorMessage{
			Code:    500,
			Message: i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "FailedToLoadGameChallenges"}),
		})
		return
	}

	if len(gameChallenges) == 0 {
		c.JSON(http.StatusNotFound, webmodels.ErrorMessage{
			Code:    404,
			Message: i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "ChallengeNotFound"}),
		})
		return
	}

	gameChallenge := gameChallenges[0]

	result := gin.H{
		"container_status":     containers[0].ContainerStatus,
		"containers":           make([]gin.H, 0, len(*gameChallenge.Challenge.ContainerConfig)),
		"container_expiretime": containers[0].ExpireTime,
	}

	for _, container := range *gameChallenge.Challenge.ContainerConfig {
		tempConfig := gin.H{
			"container_name":  container.Name,
			"container_ports": make(models.ExposePorts, 0),
		}

		if len(containers) == 1 {
			for _, container_expose := range containers[0].ContainerExposeInfos {
				if container_expose.ContainerName == container.Name {
					tempConfig["container_ports"] = container_expose.ExposePorts
					break
				}
			}
		}

		result["containers"] = append(result["containers"].([]gin.H), tempConfig)
	}

	c.JSON(http.StatusOK, gin.H{
		"code": 200,
		"data": result,
	})
}
