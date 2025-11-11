package controllers

import (
	"a1ctf/src/db/models"
	clientconfig "a1ctf/src/modules/client_config"
	"a1ctf/src/tasks"
	dbtool "a1ctf/src/utils/db_tool"
	"a1ctf/src/utils/general"
	i18ntool "a1ctf/src/utils/i18n_tool"
	qqbottool "a1ctf/src/utils/qq_bot_tool"
	"a1ctf/src/webmodels"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/nicksnyder/go-i18n/v2/i18n"
)

// GetSystemSettings 获取系统设置
func GetSystemSettings(c *gin.Context) {
	settings, err := clientconfig.LoadSystemSettings()
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"code": 200,
			"data": clientconfig.DefaultSettings,
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code": 200,
		"data": settings,
	})
}

// UpdateSystemSettings 更新系统设置
func UpdateSystemSettings(c *gin.Context) {
	// 使用 map 来接收部分更新的数据
	var updateData map[string]interface{}
	if err := c.ShouldBindJSON(&updateData); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    400,
			"message": i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "InvalidRequestPayload"}),
		})
		return
	}

	// 加载现有设置
	existingSettings, err := clientconfig.LoadSystemSettings()
	if err != nil {
		// 如果加载失败，使用默认设置
		existingSettings = clientconfig.DefaultSettings
	}

	// 逐个更新提供的字段
	if value, exists := updateData["systemName"]; exists {
		if str, ok := value.(string); ok {
			existingSettings.SystemName = str
		}
	}
	if value, exists := updateData["systemSlogan"]; exists {
		if str, ok := value.(string); ok {
			existingSettings.SystemSlogan = str
		}
	}
	if value, exists := updateData["systemSummary"]; exists {
		if str, ok := value.(string); ok {
			existingSettings.SystemSummary = str
		}
	}
	if value, exists := updateData["systemFooter"]; exists {
		if str, ok := value.(string); ok {
			existingSettings.SystemFooter = str
		}
	}
	if value, exists := updateData["systemICP"]; exists {
		if str, ok := value.(string); ok {
			existingSettings.SystemICP = str
		}
	}
	if value, exists := updateData["systemOrganization"]; exists {
		if str, ok := value.(string); ok {
			existingSettings.SystemOrganization = str
		}
	}
	if value, exists := updateData["systemOrganizationURL"]; exists {
		if str, ok := value.(string); ok {
			existingSettings.SystemOrganizationURL = str
		}
	}

	// 主题设置
	if value, exists := updateData["themeColor"]; exists {
		if str, ok := value.(string); ok {
			existingSettings.ThemeColor = str
		}
	}
	if value, exists := updateData["darkModeDefault"]; exists {
		if b, ok := value.(bool); ok {
			existingSettings.DarkModeDefault = b
		}
	}
	if value, exists := updateData["allowUserTheme"]; exists {
		if b, ok := value.(bool); ok {
			existingSettings.AllowUserTheme = b
		}
	}
	if value, exists := updateData["svgAltData"]; exists {
		if str, ok := value.(string); ok {
			existingSettings.SVGAltData = str
		}
	}
	if value, exists := updateData["schoolUnionAuthText"]; exists {
		if str, ok := value.(string); ok {
			existingSettings.SchoolUnionAuthText = str
		}
	}
	if value, exists := updateData["bgAnimation"]; exists {
		if b, ok := value.(bool); ok {
			existingSettings.BGAnimation = b
		}
	}

	// SMTP设置
	if value, exists := updateData["smtpHost"]; exists {
		if str, ok := value.(string); ok {
			existingSettings.SmtpHost = str
		}
	}
	if value, exists := updateData["smtpPort"]; exists {
		if num, ok := value.(float64); ok {
			existingSettings.SmtpPort = int(num)
		}
	}
	if value, exists := updateData["smtpName"]; exists {
		if str, ok := value.(string); ok {
			existingSettings.SmtpName = str
		}
	}
	if value, exists := updateData["smtpPortType"]; exists {
		if str, ok := value.(string); ok {
			existingSettings.SmtpPortType = str
		}
	}
	if value, exists := updateData["smtpUsername"]; exists {
		if str, ok := value.(string); ok {
			existingSettings.SmtpUsername = str
		}
	}
	if value, exists := updateData["smtpPassword"]; exists {
		if str, ok := value.(string); ok {
			existingSettings.SmtpPassword = str
		}
	}
	if value, exists := updateData["smtpFrom"]; exists {
		if str, ok := value.(string); ok {
			existingSettings.SmtpFrom = str
		}
	}
	if value, exists := updateData["smtpEnabled"]; exists {
		if b, ok := value.(bool); ok {
			existingSettings.SmtpEnabled = b
		}
	}

	// 邮件模板测试
	if value, exists := updateData["verifyEmailTemplate"]; exists {
		if str, ok := value.(string); ok {
			existingSettings.VerifyEmailTemplate = str
		}
	}

	if value, exists := updateData["verifyEmailHeader"]; exists {
		if str, ok := value.(string); ok {
			existingSettings.VerifyEmailHeader = str
		}
	}

	if value, exists := updateData["forgetPasswordTemplate"]; exists {
		if str, ok := value.(string); ok {
			existingSettings.ForgetPasswordTemplate = str
		}
	}

	if value, exists := updateData["forgetPasswordHeader"]; exists {
		if str, ok := value.(string); ok {
			existingSettings.ForgetPasswordHeader = str
		}
	}

	// 其他设置
	if value, exists := updateData["captchaEnabled"]; exists {
		if b, ok := value.(bool); ok {
			existingSettings.CaptchaEnabled = b
		}
	}
	if value, exists := updateData["gameActivityMode"]; exists {
		if str, ok := value.(string); ok {
			existingSettings.GameActivityMode = str
		}
	}

	// QQ Bot 设置
	if value, exists := updateData["qqBotEnabled"]; exists {
		if b, ok := value.(bool); ok {
			existingSettings.QQBotEnabled = b
		}
	}
	if value, exists := updateData["qqBotType"]; exists {
		if str, ok := value.(string); ok {
			existingSettings.QQBotType = str
		}
	}
	if value, exists := updateData["qqBotApiBase"]; exists {
		if str, ok := value.(string); ok {
			existingSettings.QQBotApiBase = str
		}
	}
	if value, exists := updateData["qqBotAccessToken"]; exists {
		if str, ok := value.(string); ok {
			existingSettings.QQBotAccessToken = str
		}
	}
	if value, exists := updateData["qqBotGroupId"]; exists {
		if str, ok := value.(string); ok {
			existingSettings.QQBotGroupID = str
		}
	}
	if value, exists := updateData["qqBotPushAllSubmits"]; exists {
		if b, ok := value.(bool); ok {
			existingSettings.QQBotPushAllSubmits = b
		}
	}
	if value, exists := updateData["aboutus"]; exists {
		if str, ok := value.(string); ok {
			existingSettings.AboutUS = str
		}
	}
	if value, exists := updateData["accountActivationMethod"]; exists {
		if str, ok := value.(string); ok {
			existingSettings.AccountActivationMethod = str
		}
	}
	if value, exists := updateData["registrationEnabled"]; exists {
		if b, ok := value.(bool); ok {
			existingSettings.RegistrationEnabled = b
		}
	}
	if value, exists := updateData["defaultLanguage"]; exists {
		if str, ok := value.(string); ok {
			existingSettings.DefaultLanguage = str
		}
	}
	if value, exists := updateData["fancyBackGroundIconWidth"]; exists {
		if str, ok := value.(float64); ok {
			existingSettings.FancyBackGroundIconWidth = str
		}
	}
	if value, exists := updateData["fancyBackGroundIconHeight"]; exists {
		if str, ok := value.(float64); ok {
			existingSettings.FancyBackGroundIconHeight = str
		}
	}
	if value, exists := updateData["timeZone"]; exists {
		if str, ok := value.(string); ok {
			existingSettings.TimeZone = str
		}
	}
	if value, exists := updateData["maxUploadSize"]; exists {
		if num, ok := value.(float64); ok {
			existingSettings.MaxUploadSize = int(num)
		}
	}

	// 保存设置
	if err := clientconfig.SaveSystemSettings(existingSettings); err != nil {
		// 记录日志
		tasks.LogAdminOperationWithError(c, models.ActionUpdate, models.ResourceTypeSystem, nil, updateData, err)

		c.JSON(http.StatusInternalServerError, gin.H{
			"code": 500,
			"message": i18ntool.Translate(c, &i18n.LocalizeConfig{
				MessageID: "FailedToSaveSystemSettings",
				TemplateData: map[string]interface{}{
					"Error": err.Error(),
				},
			}),
		})
		return
	}

	// 记录成功日志
	tasks.LogAdminOperation(c, models.ActionUpdate, models.ResourceTypeSystem, nil, updateData)

	c.JSON(http.StatusOK, gin.H{
		"code":    200,
		"message": i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "SystemSettingsUpdated"}),
		"data":    existingSettings,
	})
}

// UploadSystemFile 上传系统文件（图片）
func UploadSystemFile(c *gin.Context) {
	user := c.MustGet("user").(models.User)

	file, err := c.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code": 400,
			"message": i18ntool.Translate(c, &i18n.LocalizeConfig{
				MessageID: "FileUploadFailed",
				TemplateData: map[string]interface{}{
					"Error": err.Error(),
				},
			}),
		})
		return
	}

	resourceText, exists := c.GetPostForm("resource_type")
	if !exists {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    400,
			"message": i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "InvalidResourceType"}),
		})
		return
	}
	resourceType := webmodels.SystemResourceType(resourceText)

	var gameID int64
	if resourceType == webmodels.GameIconLight || resourceType == webmodels.GameIconDark {
		tmpV, exists := c.GetPostForm("data")
		if !exists {
			c.JSON(http.StatusBadRequest, gin.H{
				"code":    400,
				"message": i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "InvalidRequestPayload"}),
			})
			return
		}
		gameID, err = strconv.ParseInt(tmpV, 10, 64)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"code":    400,
				"message": i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "InvalidRequestPayload"}),
			})
			return
		}
	}

	// 检查文件类型
	if !isValidFileType(file.Filename) {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    400,
			"message": i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "UnsupportedFileType"}),
		})
		return
	}

	// 创建上传目录
	uploadDir := "./data/uploads/system"
	if err := os.MkdirAll(uploadDir, 0755); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    500,
			"message": i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "FailedToCreateUploadDirectory"}),
		})
		return
	}

	// 生成唯一文件名
	fileName := uuid.New().String()
	filePath := filepath.Join(uploadDir, fileName)
	fileExt := filepath.Ext(file.Filename)

	// 保存文件
	if err := saveUploadedFile(file, filePath); err != nil {
		// 记录失败日志
		tasks.LogAdminOperationWithError(c, models.ActionUpload, models.ResourceTypeFile, &fileName, map[string]interface{}{
			"original_filename": file.Filename,
			"file_size":         file.Size,
		}, err)

		c.JSON(http.StatusInternalServerError, gin.H{
			"code": 500,
			"message": i18ntool.Translate(c, &i18n.LocalizeConfig{
				MessageID: "FailedToSaveFile",
				TemplateData: map[string]interface{}{
					"Error": err.Error(),
				},
			}),
		})
		return
	}

	// 将文件信息保存到数据库
	upload := models.Upload{
		FileID:     fileName,
		FileName:   file.Filename,
		FilePath:   filePath,
		FileSize:   file.Size,
		FileType:   file.Header.Get("Content-Type"),
		UserID:     user.UserID,
		UploadTime: time.Now().UTC(),
	}

	if err := dbtool.DB().Create(&upload).Error; err != nil {
		// 删除已保存的文件
		os.Remove(filePath)

		// 记录数据库保存失败日志
		tasks.LogUserOperationWithError(c, models.ActionUpload, models.ResourceTypeFile, &fileName, map[string]interface{}{
			"original_filename": file.Filename,
			"file_size":         file.Size,
			"file_extension":    fileExt,
			"error_type":        "database_save_failed",
		}, err)

		c.JSON(http.StatusInternalServerError, webmodels.ErrorMessage{
			Code:    500,
			Message: i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "FailedToSaveFileRecord"}),
		})
		return
	}

	// 记录成功日志
	tasks.LogAdminOperation(c, models.ActionUpload, models.ResourceTypeFile, &fileName, map[string]interface{}{
		"original_filename": file.Filename,
		"file_size":         file.Size,
		"saved_path":        filePath,
	})

	// 更新系统设置

	downloadPath := fmt.Sprintf("/api/file/download/%s", fileName)

	switch resourceType {
	case webmodels.SystemIconLight:
		clientconfig.ClientConfig.SVGIconLight = downloadPath
		clientconfig.SaveSystemSettings(clientconfig.ClientConfig)
	case webmodels.SystemIconDark:
		clientconfig.ClientConfig.SVGIconDark = downloadPath
		clientconfig.SaveSystemSettings(clientconfig.ClientConfig)
	case webmodels.TrophysGold:
		clientconfig.ClientConfig.TrophysGold = downloadPath
		clientconfig.SaveSystemSettings(clientconfig.ClientConfig)
	case webmodels.TrophysSilver:
		clientconfig.ClientConfig.TrophysSilver = downloadPath
		clientconfig.SaveSystemSettings(clientconfig.ClientConfig)
	case webmodels.TrophysBronze:
		clientconfig.ClientConfig.TrophysBronze = downloadPath
		clientconfig.SaveSystemSettings(clientconfig.ClientConfig)
	case webmodels.SchoolLogo:
		clientconfig.ClientConfig.SchoolLogo = downloadPath
		clientconfig.SaveSystemSettings(clientconfig.ClientConfig)
	case webmodels.SchoolSmallIcon:
		clientconfig.ClientConfig.SchoolSmallIcon = downloadPath
		clientconfig.SaveSystemSettings(clientconfig.ClientConfig)
	case webmodels.FancyBackGroundIconWhite:
		clientconfig.ClientConfig.FancyBackGroundIconWhite = downloadPath
		clientconfig.SaveSystemSettings(clientconfig.ClientConfig)
	case webmodels.FancyBackGroundIconBlack:
		clientconfig.ClientConfig.FancyBackGroundIconBlack = downloadPath
		clientconfig.SaveSystemSettings(clientconfig.ClientConfig)
	case webmodels.GameIconLight:
		dbtool.DB().Model(&models.Game{}).Where("game_id = ?", gameID).Update("game_icon_light", downloadPath)
	case webmodels.GameIconDark:
		dbtool.DB().Model(&models.Game{}).Where("game_id = ?", gameID).Update("game_icon_dark", downloadPath)
	}

	// 返回文件URL
	c.JSON(http.StatusOK, gin.H{
		"code": 200,
		"data": gin.H{
			"file_id": fileName,
		},
	})
}

// TestSMTPSettings 测试SMTP设置
func TestSMTPSettings(c *gin.Context) {
	var smtpConfig struct {
		To   string `json:"to"`
		Type string `json:"type"`
	}

	if err := c.ShouldBindJSON(&smtpConfig); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    400,
			"message": i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "InvalidRequestPayload"}),
		})
		return
	}

	// 判断邮箱SMTP是否配置成功
	if err := tasks.NewSendTestMailTask(smtpConfig.To, smtpConfig.Type); err != nil {
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

// GetSystemLogs 获取系统日志
func GetSystemLogs(c *gin.Context) {

	// 解析查询参数
	var params general.QueryLogParams

	// 分页参数
	if offsetStr := c.Query("offset"); offsetStr != "" {
		if offset, err := strconv.Atoi(offsetStr); err == nil {
			params.Offset = offset
		}
	}

	if sizeStr := c.Query("size"); sizeStr != "" {
		if size, err := strconv.Atoi(sizeStr); err == nil {
			params.Size = size
		}
	}

	// 默认分页
	if params.Size <= 0 {
		params.Size = 20
	}

	// 过滤参数
	if category := c.Query("category"); category != "" {
		logCategory := models.LogCategory(category)
		params.Category = &logCategory
	}

	if userID := c.Query("user_id"); userID != "" {
		params.UserID = &userID
	}

	if resourceType := c.Query("resource_type"); resourceType != "" {
		params.ResourceType = &resourceType
	}

	if status := c.Query("status"); status != "" {
		params.Status = &status
	}

	if ipAddress := c.Query("ip_address"); ipAddress != "" {
		params.IPAddress = &ipAddress
	}

	if gameIDStr := c.Query("game_id"); gameIDStr != "" {
		if gameID, err := strconv.ParseInt(gameIDStr, 10, 64); err == nil {
			params.GameID = &gameID
		}
	}

	if keyword := c.Query("keyword"); keyword != "" {
		params.Keyword = &keyword
	}

	// 时间范围
	if startTimeStr := c.Query("start_time"); startTimeStr != "" {
		if startTime, err := time.Parse(time.RFC3339, startTimeStr); err == nil {
			params.StartTime = &startTime
		}
	}

	if endTimeStr := c.Query("end_time"); endTimeStr != "" {
		if endTime, err := time.Parse(time.RFC3339, endTimeStr); err == nil {
			params.EndTime = &endTime
		}
	}

	// 查询日志
	logs, total, err := general.QuerySystemLogs(params)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"code": 500,
			"message": i18ntool.Translate(c, &i18n.LocalizeConfig{
				MessageID: "FailedToQuerySystemLogs",
				TemplateData: map[string]interface{}{
					"Error": err.Error(),
				},
			}),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code": 200,
		"data": gin.H{
			"logs":  logs,
			"total": total,
			"pagination": gin.H{
				"offset": params.Offset,
				"size":   params.Size,
				"total":  total,
			},
		},
	})
}

// 系统日志统计接口
func GetSystemLogStats(c *gin.Context) {
	// 统计最近24小时的日志
	last24h := time.Now().Add(-24 * time.Hour).UTC()

	var stats struct {
		TotalLogs    int64 `json:"total_logs"`
		SuccessLogs  int64 `json:"success_logs"`
		FailedLogs   int64 `json:"failed_logs"`
		AdminLogs    int64 `json:"admin_logs"`
		UserLogs     int64 `json:"user_logs"`
		SecurityLogs int64 `json:"security_logs"`
	}

	// 总日志数
	dbtool.DB().Model(&models.SystemLog{}).Where("create_time >= ?", last24h).Count(&stats.TotalLogs)

	// 成功日志数
	dbtool.DB().Model(&models.SystemLog{}).Where("create_time >= ? AND status = ?", last24h, models.LogStatusSuccess).Count(&stats.SuccessLogs)

	// 失败日志数
	dbtool.DB().Model(&models.SystemLog{}).Where("create_time >= ? AND status = ?", last24h, models.LogStatusFailed).Count(&stats.FailedLogs)

	// 管理员操作日志数
	dbtool.DB().Model(&models.SystemLog{}).Where("create_time >= ? AND log_category = ?", last24h, models.LogCategoryAdmin).Count(&stats.AdminLogs)

	// 用户操作日志数
	dbtool.DB().Model(&models.SystemLog{}).Where("create_time >= ? AND log_category = ?", last24h, models.LogCategoryUser).Count(&stats.UserLogs)

	// 安全相关日志数
	dbtool.DB().Model(&models.SystemLog{}).Where("create_time >= ? AND log_category = ?", last24h, models.LogCategorySecurity).Count(&stats.SecurityLogs)

	c.JSON(http.StatusOK, gin.H{
		"code": 200,
		"data": stats,
	})
}

func isValidFileType(filename string) bool {
	ext := filepath.Ext(filename)
	validExts := map[string]bool{
		".jpg":  true,
		".jpeg": true,
		".png":  true,
		".gif":  true,
		".svg":  true,
		".ico":  true,
	}
	return validExts[ext]
}

func saveUploadedFile(file *multipart.FileHeader, dst string) error {
	src, err := file.Open()
	if err != nil {
		return err
	}
	defer src.Close()

	out, err := os.Create(dst)
	if err != nil {
		return err
	}
	defer out.Close()

	_, err = io.Copy(out, src)
	return err
}

// TestQQBot 测试QQ Bot推送
func TestQQBot(c *gin.Context) {
	var payload struct {
		Message     string `json:"message"`
		BaseURL     string `json:"base_url"`
		AccessToken string `json:"access_token"`
		GroupID     string `json:"group_id"`
	}
	if err := c.ShouldBindJSON(&payload); err != nil {
		payload.Message = "QQ Bot 测试消息"
	}
	if payload.Message == "" {
		payload.Message = "QQ Bot 测试消息"
	}

	// 未传入时使用系统配置
	if payload.BaseURL == "" || payload.GroupID == "" || payload.AccessToken == "" {
		cfg := clientconfig.ClientConfig
		if payload.BaseURL == "" {
			payload.BaseURL = cfg.QQBotApiBase
		}
		if payload.GroupID == "" {
			payload.GroupID = cfg.QQBotGroupID
		}
		if payload.AccessToken == "" {
			payload.AccessToken = cfg.QQBotAccessToken
		}
	}

	go qqbottool.SendGroupMessageWithConfig(payload.BaseURL, payload.AccessToken, payload.GroupID, payload.Message)

	c.JSON(http.StatusOK, gin.H{
		"code":    200,
		"message": "QQ Bot 测试消息已发送（请检查群消息）",
	})
}
