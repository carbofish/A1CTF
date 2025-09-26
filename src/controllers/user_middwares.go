package controllers

import (
	"a1ctf/src/db/models"
	clientconfig "a1ctf/src/modules/client_config"
	jwtauth "a1ctf/src/modules/jwt_auth"
	i18ntool "a1ctf/src/utils/i18n_tool"
	"a1ctf/src/utils/ristretto_tool"
	"a1ctf/src/webmodels"
	"fmt"
	"net/http"
	"reflect"
	"strconv"
	"strings"
	"time"

	jwt "github.com/appleboy/gin-jwt/v2"
	"github.com/gin-gonic/gin"
	"github.com/go-playground/validator/v10"
	"github.com/nicksnyder/go-i18n/v2/i18n"
)

type GameStatusMiddlewareProps struct {
	VisibleAfterEnded bool
	CheckGameStarted  bool
}

// 比赛状态检查中间件
func GameStatusMiddleware(props GameStatusMiddlewareProps) gin.HandlerFunc {
	return func(c *gin.Context) {
		gameIDStr := c.Param("game_id")
		gameID, err := strconv.ParseInt(gameIDStr, 10, 64)
		if err != nil {
			c.JSON(http.StatusBadRequest, webmodels.ErrorMessage{
				Code:    400,
				Message: i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "InvalidGameID"}),
			})
			c.Abort()
			return
		}

		game, err := ristretto_tool.CachedGameInfo(gameID)
		if err != nil {
			c.JSON(http.StatusNotFound, webmodels.ErrorMessage{
				Code:    404,
				Message: i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "GameNotFound"}),
			})
			c.Abort()
			return
		}

		// 获取一下当前账号信息
		user, exists := c.Get("user")

		// 再换一种方式获取登陆状态，给获取比赛信息接口用
		if (c.FullPath() == "/api/game/:game_id" && c.Request.Method == "GET") || (c.FullPath() == "/api/game/:game_id/desc" && c.Request.Method == "GET") || (c.FullPath() == "/api/game/:game_id/scoreboard" && c.Request.Method == "GET") {
			claims, errFromJwt := jwtauth.GetJwtMiddleWare().GetClaimsFromJWT(c)
			if errFromJwt == nil {
				user_id, userIDExists := claims["UserID"]
				if userIDExists {
					all_users, err := ristretto_tool.CachedMemberMap()
					if err == nil {
						tmpUser, userExists := all_users[user_id.(string)]
						if userExists {
							user = tmpUser
							exists = true
						}
					}
				}
			}
		}

		// 管理员是否绕过比赛状态检查（比赛是否开始）
		var skipTimeCheck bool = false

		if exists {
			cvt := user.(models.User)
			if cvt.Role == models.UserRoleAdmin {
				skipTimeCheck = true
			}
		}

		// 管理员跳过时间检查
		if !skipTimeCheck {
			// 普通用户需要检查比赛是否可见
			if !game.Visible {
				c.JSON(http.StatusNotFound, webmodels.ErrorMessage{
					Code:    404,
					Message: i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "GameNotFound"}),
				})
				c.Abort()
				return
			}

			// 检查比赛是否开始
			if props.CheckGameStarted && game.StartTime.After(time.Now().UTC()) {
				c.JSON(http.StatusForbidden, webmodels.ErrorMessage{
					Code:    403,
					Message: i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "GameNotStartedYet"}),
				})
				c.Abort()
				return
			}

			// 检查比赛在结束后是否可见，如果是练习模式就保持可见
			if !props.VisibleAfterEnded && !game.PracticeMode && game.EndTime.Before(time.Now().UTC()) {
				c.JSON(http.StatusForbidden, webmodels.ErrorMessage{
					Code:    403,
					Message: i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "GameHasEnded"}),
				})
				c.Abort()
				return
			}
		}

		// 将比赛信息存入上下文
		c.Set("game", *game)
		c.Next()
	}
}

func TeamStatusMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		game := c.MustGet("game").(models.Game)

		// TODO: 目前看来 这个队伍状态中间件都是在鉴权接口后的，所以应该能直接用鉴权接口设置的 user，避免直接从 jwt 里 extract
		claims := jwt.ExtractClaims(c)
		user_id := claims["UserID"].(string)

		memberBelongSearchMap, err := ristretto_tool.CachedMemberSearchTeamMap(game.GameID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, webmodels.ErrorMessage{
				Code:    500,
				Message: i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "FailedToLoadTeams"}),
			})
			c.Abort()
			return
		}

		team, ok := memberBelongSearchMap[user_id]
		if !ok {
			c.JSON(http.StatusForbidden, webmodels.ErrorMessage{
				Code:    403,
				Message: i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "YouMustJoinTeamInThisGame"}),
			})
			c.Abort()
			return
		}

		if team.TeamStatus == models.ParticipateParticipated || team.TeamStatus == models.ParticipatePending || team.TeamStatus == models.ParticipateRejected {
			c.JSON(http.StatusForbidden, webmodels.ErrorMessage{
				Code:    403,
				Message: i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "YouMustJoinTeamInThisGame"}),
			})
			c.Abort()
			return
		}

		if team.TeamStatus == models.ParticipateBanned {
			c.JSON(http.StatusBadRequest, webmodels.ErrorMessage{
				Code:    400,
				Message: i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "YouAreBannedFromThisGame"}),
			})
			c.Abort()
			return
		}

		c.Set("team", team)
		c.Next()
	}
}

// 邮箱未验证前不许操作中间件
func EmailVerifiedMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		user := c.MustGet("user").(models.User)

		// 检查邮箱验证状态
		if !user.EmailVerified && clientconfig.ClientConfig.AccountActivationMethod == "email" {
			c.JSON(421, webmodels.ErrorMessage{
				Code:    421,
				Message: i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "YouMustVerifyEmailFirst"}),
			})
			c.Abort()
			return
		}

		c.Next()
	}
}

// 比赛开始后不允许操作中间件
func OperationNotAllowedAfterGameStartMiddleWare() gin.HandlerFunc {
	return func(c *gin.Context) {
		game := c.MustGet("game").(models.Game)

		if game.StartTime.Before(time.Now().UTC()) {
			c.JSON(http.StatusForbidden, webmodels.ErrorMessage{
				Code:    403,
				Message: i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "OperationNotAllowedAfterGameStart"}),
			})
			c.Abort()
			return
		}

		c.Next()
	}
}

func ChallengeStatusCheckMiddleWare(accessableAfterStageEnded bool) gin.HandlerFunc {
	return func(c *gin.Context) {

		game := c.MustGet("game").(models.Game)

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

		gameChallenge, err := ristretto_tool.CachedGameChallengeDetail(game.GameID, challengeID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, webmodels.ErrorMessage{
				Code:    500,
				Message: i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "FailedToLoadChallengeDetails"}),
			})
			c.Abort()
			return
		}

		c.Set("game_challenge", *gameChallenge)
		c.Set("challenge_id", challengeID)

		user := c.MustGet("user").(models.User)

		skipCheck := user.Role == models.UserRoleAdmin

		if skipCheck {
			c.Next()
			return
		}

		now := time.Now().UTC()

		// 先用题目自身的 Visible 作为基础开关
		baseVisible := gameChallenge.Visible

		// 默认：未命中阶段限制时，按题目自身 Visible
		challengeVisible := baseVisible
		invisibleDueToStageOver := false
		checkedStage := false

		if game.Stages != nil && gameChallenge.BelongStage != nil {
			stages := *game.Stages
			if len(stages) > 0 {
				for _, stage := range stages {
					if stage.StageName != *gameChallenge.BelongStage {
						continue
					}
					checkedStage = true

					// 明确边界：采用 [start, end) 语义
					start := stage.StartTime.UTC()
					end := stage.EndTime.UTC()

					if !now.Before(end) { // now >= end 视为已结束
						if accessableAfterStageEnded {
							challengeVisible = baseVisible && true
						} else {
							challengeVisible = false
							invisibleDueToStageOver = true
						}
					} else if !now.Before(start) { // start <= now < end 进行中
						challengeVisible = baseVisible && true
					} else {
						// 未开始
						challengeVisible = false
					}
					break // 命中归属阶段后立即退出
				}
			} else {
				// 空切片：回退到题目 Visible
				challengeVisible = baseVisible
			}
		}

		if game.Stages != nil && gameChallenge.BelongStage != nil && !checkedStage {
			challengeVisible = baseVisible
		}

		if invisibleDueToStageOver {
			c.JSON(http.StatusConflict, webmodels.ErrorMessage{
				Code:    429,
				Message: i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "InVisibleDuetoStageOver"}),
			})
			c.Abort()
			return
		}

		if !challengeVisible {
			c.JSON(http.StatusBadRequest, webmodels.ErrorMessage{
				Code:    400,
				Message: i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "InvalidChallengeID"}),
			})
			c.Abort()
			return
		}

		c.Next()
	}
}

func PayloadValidator(model interface{}) gin.HandlerFunc {
	return func(c *gin.Context) {
		payload := reflect.New(reflect.TypeOf(model)).Interface()

		if err := c.ShouldBindJSON(payload); err != nil {
			if errors, ok := err.(validator.ValidationErrors); ok {
				errorMessages := make([]string, 0, len(errors))
				for _, error := range errors {
					errorMessages = append(errorMessages, error.Error())
				}

				errorMessage := fmt.Sprintf("[%s]", strings.Join(errorMessages, ", "))
				c.JSON(http.StatusBadRequest, webmodels.ErrorMessage{
					Code: 400,
					Message: i18ntool.Translate(c, &i18n.LocalizeConfig{
						MessageID: "InvalidRequestPayloadWithErrorMessage",
						TemplateData: map[string]string{
							"ErrorMessage": errorMessage,
						},
					}),
				})
			} else {
				c.JSON(http.StatusBadRequest, webmodels.ErrorMessage{
					Code: 400,
					Message: i18ntool.Translate(c, &i18n.LocalizeConfig{
						MessageID: "InvalidRequestPayload",
					}),
				})
			}
			c.Abort()
			return
		}

		c.Set("payload", payload)
		c.Next()
	}
}
