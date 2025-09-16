package controllers

import (
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/nicksnyder/go-i18n/v2/i18n"

	"a1ctf/src/db/models"
	clientconfig "a1ctf/src/modules/client_config"
	emailjwt "a1ctf/src/modules/jwt_email"
	proofofwork "a1ctf/src/modules/proof_of_work"
	"a1ctf/src/tasks"
	dbtool "a1ctf/src/utils/db_tool"
	general "a1ctf/src/utils/general"
	i18ntool "a1ctf/src/utils/i18n_tool"
	redistool "a1ctf/src/utils/redis_tool"
	"a1ctf/src/utils/ristretto_tool"
	"a1ctf/src/webmodels"
)

// GetProfile 获取用户的基本资料信息
func GetProfile(c *gin.Context) {
	user := c.MustGet("user").(models.User)

	userMap, err := ristretto_tool.CachedMemberMap()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    500,
			"message": i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "SystemError"}),
		})
		return
	}

	user, ok := userMap[user.UserID]
	if !ok {
		c.JSON(http.StatusNotFound, gin.H{
			"code":    404,
			"message": i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "UserNotFound"}),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code": 200,
		"data": gin.H{
			"user_id":               user.UserID,
			"username":              user.Username,
			"role":                  user.Role,
			"phone":                 user.Phone,
			"student_number":        user.StudentNumber,
			"realname":              user.Realname,
			"slogan":                user.Slogan,
			"avatar":                user.Avatar,
			"email":                 user.Email,
			"email_verified":        user.EmailVerified,
			"register_time":         user.RegisterTime,
			"last_login_time":       user.LastLoginTime,
			"last_login_ip":         user.LastLoginIP,
			"client_config_version": clientconfig.ClientConfig.UpdatedTime,
		},
	})
}

func Register(c *gin.Context) {
	payload := *c.MustGet("payload").(*webmodels.RegisterPayload)

	if clientconfig.ClientConfig.CaptchaEnabled {
		valid := proofofwork.CapInstance.ValidateToken(c.Request.Context(), payload.Captcha)

		if !valid {
			c.JSON(http.StatusBadRequest, gin.H{
				"code":    400,
				"message": i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "InvalidRequestPayload"}),
			})
			return
		}
	}

	var existingUsers []models.User
	if err := dbtool.DB().Where("username = ? OR email = ?", payload.Username, payload.Email).Find(&existingUsers).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    500,
			"message": i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "SystemError"}),
		})
		return
	}

	if len(existingUsers) > 0 {
		// 记录注册失败日志（用户名或邮箱已存在）
		tasks.LogFromGinContext(c, tasks.LogEntry{
			Category:     models.LogCategorySecurity,
			Action:       "REGISTER_FAILED",
			ResourceType: models.ResourceTypeUser,
			ResourceID:   &payload.Username,
			Details: map[string]interface{}{
				"username": payload.Username,
				"email":    payload.Email,
				"reason":   "username_or_email_exists",
			},
			Status: models.LogStatusFailed,
		})

		c.JSON(http.StatusConflict, gin.H{
			"code":    409,
			"message": i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "UsernameOrEmailExists"}),
		})
		return
	}

	// 判断是否为首个注册用户，若是则赋予管理员角色及已验证邮箱状态
	var userCount int64
	_ = dbtool.DB().Model(&models.User{}).Count(&userCount).Error
	role := models.UserRoleUser
	emailVerified := false
	if userCount == 0 {
		role = models.UserRoleAdmin
		emailVerified = true
	}

	

	newSalt := general.GenerateSalt()
	saltedPassword := general.SaltPassword(payload.Password, newSalt)

	// avoid attack
	loweredEmail := strings.ToLower(payload.Email)

	clientIP := c.ClientIP()

	newUser := models.User{
		UserID:        uuid.New().String(),
		Username:      payload.Username,
		Password:      saltedPassword,
		Salt:          newSalt,
		Role:          role,
		CurToken:      nil,
		Phone:         nil,
		StudentNumber: nil,
		Realname:      nil,
		Slogan:        nil,
		Avatar:        nil,
		SsoData:       nil,
		Email:         &loweredEmail,
		EmailVerified: emailVerified,
		JWTVersion:    general.RandomString(16),
		RegisterTime:  time.Now().UTC(),
		RegisterIP:    &clientIP,
	}

	if err := dbtool.DB().Create(&newUser).Error; err != nil {
		// 记录注册失败日志
		errMsg := err.Error()
		tasks.LogFromGinContext(c, tasks.LogEntry{
			Category:     models.LogCategorySecurity,
			Action:       "REGISTER_FAILED",
			ResourceType: models.ResourceTypeUser,
			ResourceID:   &newUser.UserID,
			Details: map[string]interface{}{
				"username": payload.Username,
				"email":    payload.Email,
				"reason":   "database_error",
			},
			Status:       models.LogStatusFailed,
			ErrorMessage: &errMsg,
		})

		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    500,
			"message": i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "SystemError"}),
		})
		return
	}

	// 发送账号验证邮件
	if clientconfig.ClientConfig.AccountActivationMethod == "email" {
		_ = tasks.NewEmailVerificationTask(newUser) // 忽略潜在的SMTP错误
	}

	// 记录注册成功日志
	tasks.LogFromGinContext(c, tasks.LogEntry{
		Category:     models.LogCategoryUser,
		Action:       "REGISTER",
		Username:     &payload.Username,
		ResourceType: models.ResourceTypeUser,
		ResourceID:   &newUser.UserID,
		Details: map[string]interface{}{
			"username": payload.Username,
			"email":    payload.Email,
		},
		Status: models.LogStatusSuccess,
	})

	c.JSON(http.StatusOK, gin.H{
		"code": 200,
	})
}

// GetClientConfig 获取客户端配置
func GetClientConfig(c *gin.Context) {

	ClientConfig := clientconfig.ClientConfig

	if ClientConfig.SystemName == "" {
		settings, err := clientconfig.LoadSystemSettings()
		if err != nil {
			settings = clientconfig.DefaultSettings
		}
		settings.UpdatedTime = time.Now().UTC()
		ClientConfig = settings
	}

	// 创建客户端配置
	clientConfig := map[string]interface{}{
		"systemName":    ClientConfig.SystemName,
		"systemLogo":    ClientConfig.SystemLogo,
		"systemFavicon": ClientConfig.SystemFavicon,
		"systemSlogan":  ClientConfig.SystemSlogan,
		"systemFooter":  ClientConfig.SystemFooter,

		"systemICP":             ClientConfig.SystemICP,
		"systemOrganization":    ClientConfig.SystemOrganization,
		"systemOrganizationURL": ClientConfig.SystemOrganizationURL,

		"themeColor":       ClientConfig.ThemeColor,
		"darkModeDefault":  ClientConfig.DarkModeDefault,
		"allowUserTheme":   ClientConfig.AllowUserTheme,
		"defaultLanguage":  ClientConfig.DefaultLanguage,
		"captchaEnabled":   ClientConfig.CaptchaEnabled,
		"AboutUS":          ClientConfig.AboutUS,
		"gameActivityMode": ClientConfig.GameActivityMode,

		// 品牌资源
		"FancyBackGroundIconWhite": ClientConfig.FancyBackGroundIconWhite,
		"FancyBackGroundIconBlack": ClientConfig.FancyBackGroundIconBlack,
		"DefaultBGImage":           ClientConfig.DefaultBGImage,
		"SVGIconLight":             ClientConfig.SVGIconLight,
		"SVGIconDark":              ClientConfig.SVGIconDark,
		"SVGAltData":               ClientConfig.SVGAltData,
		"TrophysGold":              ClientConfig.TrophysGold,
		"TrophysSilver":            ClientConfig.TrophysSilver,
		"TrophysBronze":            ClientConfig.TrophysBronze,
		"SchoolLogo":               ClientConfig.SchoolLogo,
		"SchoolSmallIcon":          ClientConfig.SchoolSmallIcon,
		"SchoolUnionAuthText":      ClientConfig.SchoolUnionAuthText,
		"BGAnimation":              ClientConfig.BGAnimation,

		"fancyBackGroundIconWidth":  ClientConfig.FancyBackGroundIconWidth,
		"fancyBackGroundIconHeight": ClientConfig.FancyBackGroundIconHeight,

		"updateVersion": ClientConfig.UpdatedTime,
	}

	c.JSON(http.StatusOK, gin.H{
		"code": 200,
		"data": clientConfig,
	})
}

func UpdateUserProfile(c *gin.Context) {
	payload := *c.MustGet("payload").(*webmodels.UpdateUserProfilePayload)

	user := c.MustGet("user").(models.User)

	if err := dbtool.DB().Model(&user).Updates(models.User{
		Realname:      payload.RealName,
		StudentNumber: payload.StudentID,
		Phone:         payload.Phone,
		Slogan:        payload.Slogan,
		Username:      *payload.UserName,
	}).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    500,
			"message": i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "SystemError"}),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code": 200,
	})
}

func UpdateUserEmail(c *gin.Context) {
	payload := *c.MustGet("payload").(*webmodels.UpdateUserEmailPayload)

	user := c.MustGet("user").(models.User)

	// avoid attack
	payload.NewEmail = strings.ToLower(payload.NewEmail)

	if *user.Email == payload.NewEmail {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    400,
			"message": i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "NewEmailSameAsOld"}),
		})
		return
	}

	if err := dbtool.DB().Model(&user).Select("email", "email_verified").Updates(models.User{
		Email:         &payload.NewEmail,
		EmailVerified: false,
	}).Error; err != nil {
		// 一般是邮箱地址重名了
		if dbtool.IsDuplicateKeyError(err) {
			c.JSON(http.StatusBadRequest, gin.H{
				"code":    400,
				"message": i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "EmailCannotBeUsed"}),
			})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    500,
			"message": i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "SystemError"}),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code": 200,
	})
}

func SendVerifyEmail(c *gin.Context) {
	user := c.MustGet("user").(models.User)

	if user.EmailVerified {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    400,
			"message": i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "EmailAlreadyVerified"}),
		})
		return
	}

	operationName := fmt.Sprintf("%s:sendMail", user.UserID)
	operationName2 := fmt.Sprintf("verificationMailSentTo:%s", *user.Email)
	locked := redistool.LockForATime(operationName, time.Minute*1) && redistool.LockForATime(operationName2, time.Minute*1)

	if !locked {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    400,
			"message": i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "SendEmailTooFast"}),
		})
		return
	}

	// 判断邮箱SMTP是否配置成功
	if err := tasks.NewEmailVerificationTask(user); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    400,
			"message": i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: err.Error()}),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code": 200,
	})
}

func VerifyEmailCode(c *gin.Context) {
	payload := *c.MustGet("payload").(*webmodels.EmailVerifyPayload)

	claims, err := emailjwt.GetEmailVerificationClaims(payload.Code)

	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    400,
			"message": i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "InvalidRequestPayload"}),
		})
		return
	}

	if claims.Usage != "email-verify" {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    400,
			"message": i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "InvalidRequestPayload"}),
		})
		return
	}

	userID := claims.UserID

	if err := dbtool.DB().Model(&models.User{}).Where("user_id = ?", userID).Updates(
		models.User{
			EmailVerified: true,
		}).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    500,
			"message": i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "SystemError"}),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code": 200,
	})
}

func UserChangePassword(c *gin.Context) {
	payload := *c.MustGet("payload").(*webmodels.ChangePasswordPayload)

	user := c.MustGet("user").(models.User)

	if user.Password != general.SaltPassword(payload.OldPassword, user.Salt) {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    400,
			"message": i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "OldPasswordIncorrect"}),
		})
		return
	}

	newSalt := general.GenerateSalt()
	saltedPassword := general.SaltPassword(payload.NewPassword, newSalt)

	if err := dbtool.DB().Model(&user).Updates(models.User{
		Password:   saltedPassword,
		Salt:       newSalt,
		JWTVersion: general.RandomPassword(16),
	}).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    500,
			"message": i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "SystemError"}),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code": 200,
	})
}

func UserForgetPassword(c *gin.Context) {
	payload := *c.MustGet("payload").(*webmodels.ForgetPasswordSendMailPayload)

	allUsers, err := ristretto_tool.CachedMemberMap()

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    500,
			"message": i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "SystemError"}),
		})
		return
	}

	for _, v := range allUsers {
		if *v.Email == payload.Email {

			operationName := fmt.Sprintf("verificationMailSentTo:%s", *v.Email)
			locked := redistool.LockForATime(operationName, time.Minute*1)

			if !locked {
				c.JSON(http.StatusBadRequest, gin.H{
					"code":    400,
					"message": i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "SendEmailTooFast"}),
				})
				return
			}

			// 判断邮箱SMTP是否配置成功
			if err := tasks.NewForgePasswordEmailTask(v); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{
					"code":    400,
					"message": i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: err.Error()}),
				})
				return
			}
			break
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"code": 200,
	})
}

func UserVerifyAndResetPassword(c *gin.Context) {
	payload := *c.MustGet("payload").(*webmodels.ForgetPasswordWithVerifyCodePayload)

	claims, err := emailjwt.GetEmailVerificationClaims(payload.Code)

	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    400,
			"message": i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "InvalidRequestPayload"}),
		})
		return
	}

	if claims.Usage != "reset-password" {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    400,
			"message": i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "InvalidRequestPayload"}),
		})
		return
	}

	newSalt := general.GenerateSalt()
	saltedPassword := general.SaltPassword(payload.NewPassword, newSalt)

	if err := dbtool.DB().Model(&models.User{}).Where("user_id = ?", claims.UserID).Updates(models.User{
		Password:   saltedPassword,
		Salt:       newSalt,
		JWTVersion: general.RandomPassword(16),
	}).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    500,
			"message": i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "SystemError"}),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code": 200,
	})
}
