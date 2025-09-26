package controllers

import (
	"log"
	"net/http"
	"sort"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/nicksnyder/go-i18n/v2/i18n"
	"gorm.io/gorm"

	"a1ctf/src/db/models"
	dbtool "a1ctf/src/utils/db_tool"
	i18ntool "a1ctf/src/utils/i18n_tool"
	k8stool "a1ctf/src/utils/k8s_tool"
	"a1ctf/src/utils/ristretto_tool"
	"a1ctf/src/webmodels"
)

type ListChallengePayload struct {
	Size     int64                     `json:"size" binding:"required"`
	Offset   int64                     `json:"offset" binding:"min=0"`
	Category *models.ChallengeCategory `json:"category,omitempty"`
}

type DeleteChallengePayload struct {
	ChallengeID int64 `json:"challenge_id" binding:"required"`
}

type ChallengeSearchPayload struct {
	Keyword string `json:"keyword"`
}

func AdminListChallenges(c *gin.Context) {
	var payload ListChallengePayload
	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    400,
			"message": i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "InvalidRequestPayload"}),
		})
		return
	}

	var challenges []models.Challenge
	query := dbtool.DB().Offset(int(payload.Offset)).Limit(int(payload.Size))

	if payload.Category != nil {
		query = query.Where("category = ?", payload.Category)
	}

	query = query.Order("challenge_id ASC")

	if err := query.Find(&challenges).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    500,
			"message": i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "FailedToLoadChallenges"}),
		})
		return
	}

	data := make([]gin.H, 0)
	for _, challenge := range challenges {
		data = append(data, gin.H{
			"challenge_id": challenge.ChallengeID,
			"name":         challenge.Name,
			"description":  challenge.Description,
			"category":     challenge.Category,
			"create_time":  challenge.CreateTime,
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"code": 200,
		"data": data,
	})
}

func AdminGetChallenge(c *gin.Context) {
	challengeIDStr := c.Param("challenge_id")
	challengeID, err := strconv.ParseInt(challengeIDStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    400,
			"message": i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "InvalidChallengeID"}),
		})
		return
	}

	var challenge models.Challenge
	if err := dbtool.DB().Where("challenge_id = ?", challengeID).First(&challenge).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{
				"code":    404,
				"message": i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "ChallengeNotFound"}),
			})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{
				"code":    500,
				"message": i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "FailedToLoadChallenge"}),
			})
		}
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code": 200,
		"data": challenge,
	})
}

func AdminCreateChallenge(c *gin.Context) {
	var payload models.Challenge
	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    400,
			"message": i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "InvalidRequestPayload"}),
		})
		return
	}

	// 动态flag必须配置容器信息
	if payload.FlagType == models.FlagTypeDynamic && payload.ContainerConfig == nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    400,
			"message": i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "FailedToCreateWithoutContainer"}),
		})
		return
	}

	if payload.ContainerConfig != nil {
		if err := k8stool.ValidContainerConfig(*payload.ContainerConfig); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"code":    400,
				"message": err.Error(),
			})
			return
		}
	}

	payload.CreateTime = time.Now().UTC()
	payload.ChallengeID = nil

	if err := dbtool.DB().Create(&payload).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    500,
			"message": i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "FailedToCreateChallenge"}),
		})
		log.Panicf("%+v %v\n", payload, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code": 200,
		"data": gin.H{
			"challenge_id": payload.ChallengeID,
			"create_at":    payload.CreateTime,
		},
	})
}

func AdminDeleteChallenge(c *gin.Context) {
	challengeIDStr := c.Param("challenge_id")
	challengeID, err := strconv.ParseInt(challengeIDStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    400,
			"message": i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "InvalidChallengeID"}),
		})
		return
	}

	result := dbtool.DB().Where("challenge_id = ?", challengeID).Delete(&models.Challenge{})
	if result.Error != nil {
		// 外键关联
		if result.Error.(*pgconn.PgError).Code == "23503" {
			c.JSON(http.StatusInternalServerError, gin.H{
				"code":    400,
				"message": i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "ChallengeUsedInGame"}),
			})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{
				"code":    500,
				"message": i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "FailedToDeleteChallenge"}),
			})
		}
		return
	}

	if result.RowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{
			"code":    404,
			"message": i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "ChallengeNotFound"}),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code":    200,
		"message": i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "ChallengeDeleted"}),
	})
}

func AdminUpdateChallenge(c *gin.Context) {
	challengeIDStr := c.Param("challenge_id")
	challengeID, err := strconv.ParseInt(challengeIDStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    400,
			"message": i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "InvalidChallengeID"}),
		})
		return
	}

	var payload models.Challenge
	if err := c.ShouldBindJSON(&payload); err != nil || challengeID != *payload.ChallengeID {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    400,
			"message": i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "InvalidRequestPayload"}),
		})
		return
	}

	if payload.ContainerConfig != nil {
		if err := k8stool.ValidContainerConfig(*payload.ContainerConfig); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"code":    400,
				"message": err.Error(),
			})
			return
		}
	}

	var existingChallenge models.Challenge
	if err := dbtool.DB().Where("challenge_id = ?", payload.ChallengeID).First(&existingChallenge).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{
				"code":    404,
				"message": i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "ChallengeNotFound"}),
			})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{
				"code":    500,
				"message": i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "FailedToUpdateChallenge"}),
			})
		}
		return
	}

	if err := dbtool.DB().Model(&models.Challenge{}).Where("challenge_id = ?", payload.ChallengeID).Select("*").Updates(payload).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    500,
			"message": i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "FailedToUpdateChallenge"}),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code":    200,
		"message": i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "Updated"}),
	})
}

func AdminGetSimpleGameChallenges(c *gin.Context) {
	game := c.MustGet("game").(models.Game)
	team := c.MustGet("team").(models.Team)
	// 查找队伍
	var tmpSimpleGameChallenges []webmodels.UserSimpleGameChallenge = make([]webmodels.UserSimpleGameChallenge, 0)
	var gameChallenges []models.GameChallenge

	// 使用 Preload 进行关联查询
	if err := dbtool.DB().Preload("Challenge").Where("game_id = ?", game.GameID).Find(&gameChallenges).Error; err != nil {
		c.JSON(http.StatusInternalServerError, webmodels.ErrorMessage{
			Code:    500,
			Message: i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "FailedToLoadChallenges"}),
		})
		return
	}

	sort.Slice(gameChallenges, func(i, j int) bool {
		return gameChallenges[i].Challenge.Name < gameChallenges[j].Challenge.Name
	})

	for _, gc := range gameChallenges {

		tmpSimpleGameChallenges = append(tmpSimpleGameChallenges, webmodels.UserSimpleGameChallenge{
			ChallengeID:   *gc.Challenge.ChallengeID,
			ChallengeName: gc.Challenge.Name,
			TotalScore:    gc.TotalScore,
			CurScore:      gc.CurScore,
			SolveCount:    gc.SolveCount,
			Category:      gc.Challenge.Category,
			Visible:       gc.Visible,
			BelongStage:   gc.BelongStage,
		})
	}

	solveMap, err := ristretto_tool.CachedSolvedChallengesForGame(game.GameID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, webmodels.ErrorMessage{
			Code:    500,
			Message: i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "FailedToLoadSolves"}),
		})
		return
	}

	solves, ok := solveMap[team.TeamID]
	if !ok {
		solves = make([]models.Solve, 0)
	}

	var solved_challenges []webmodels.UserSimpleGameSolvedChallenge = make([]webmodels.UserSimpleGameSolvedChallenge, 0, len(solves))

	for _, solve := range solves {
		solved_challenges = append(solved_challenges, webmodels.UserSimpleGameSolvedChallenge{
			ChallengeID:   solve.ChallengeID,
			ChallengeName: solve.Challenge.Name,
			SolveTime:     solve.SolveTime,
			Rank:          solve.Rank,
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"code": 200,
		"data": gin.H{
			"challenges":        tmpSimpleGameChallenges,
			"solved_challenges": solved_challenges,
		},
	})
}

func AdminSearchChallenges(c *gin.Context) {
	var payload ChallengeSearchPayload
	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    400,
			"message": i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "InvalidRequestPayload"}),
		})
		return
	}

	var challenges []models.Challenge
	if err := dbtool.DB().Where("name LIKE ?", "%"+payload.Keyword+"%").Find(&challenges).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    500,
			"message": i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "FailedToLoadChallenges"}),
		})
		return
	}

	var data []gin.H = make([]gin.H, 0)
	for _, challenge := range challenges {
		data = append(data, gin.H{
			"challenge_id": challenge.ChallengeID,
			"name":         challenge.Name,
			"category":     challenge.Category,
			"create_time":  challenge.CreateTime,
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"code": 200,
		"data": data,
	})
}
