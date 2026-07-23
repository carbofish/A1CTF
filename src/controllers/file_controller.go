package controllers

import (
	"errors"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/nicksnyder/go-i18n/v2/i18n"

	"a1ctf/src/db/models"
	"a1ctf/src/tasks"
	dbtool "a1ctf/src/utils/db_tool"
	i18ntool "a1ctf/src/utils/i18n_tool"
	imagetool "a1ctf/src/utils/image_tool"
	"a1ctf/src/utils/ristretto_tool"
	securitytool "a1ctf/src/utils/security_tool"
	"a1ctf/src/webmodels"
)

func UploadFile(c *gin.Context) {
	user := c.MustGet("user").(models.User)

	// 从表单中获取文件
	file, err := c.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, webmodels.ErrorMessage{
			Code:    400,
			Message: i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "NoFileUploaded"}),
		})
		return
	}

	// 验证文件大小（限制为50MB）
	if file.Size > 50*1024*1024 {
		c.JSON(http.StatusBadRequest, webmodels.ErrorMessage{
			Code:    400,
			Message: i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "FileTooLarge"}),
		})
		return
	}

	// Generate unique file ID
	fileID := uuid.New().String()
	fileExt := strings.ToLower(filepath.Ext(file.Filename))

	// Validate file extension is allowed
	allowedExts := map[string]bool{
		".jpg": true, ".jpeg": true, ".png": true, ".gif": true,
		".webp": true, ".pdf": true, ".zip": true, ".tar": true,
		".gz": true, ".txt": true, ".md": true, ".csv": true,
	}
	if !allowedExts[fileExt] {
		c.JSON(http.StatusBadRequest, webmodels.ErrorMessage{
			Code:    400,
			Message: i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "UnsupportedFileType"}),
		})
		return
	}

	// Validate magic bytes to prevent fake extension uploads
	magicValidator := securitytool.NewMagicBytesValidator()
	if err := magicValidator.ValidateFile(file, fileExt); err != nil {
		c.JSON(http.StatusBadRequest, webmodels.ErrorMessage{
			Code:    400,
			Message: i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "InvalidFileContent"}),
		})
		return
	}

	// 创建上传目录
	uploadDir := "./data/uploads/files"
	if err := os.MkdirAll(uploadDir, 0755); err != nil {
		c.JSON(http.StatusInternalServerError, webmodels.ErrorMessage{
			Code:    500,
			Message: i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "FailedToCreateUploadDirectory"}),
		})
		return
	}

	// 保存文件
	savedFileName := fileID
	savedPath := filepath.Join(uploadDir, savedFileName)

	if err := saveUploadedFile(file, savedPath); err != nil {
		// 记录文件上传失败日志
		tasks.LogUserOperationWithError(c, models.ActionUpload, models.ResourceTypeFile, &fileID, map[string]interface{}{
			"original_filename": file.Filename,
			"file_size":         file.Size,
			"file_extension":    fileExt,
		}, err)

		c.JSON(http.StatusInternalServerError, webmodels.ErrorMessage{
			Code:    500,
			Message: i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "FailedToSaveFile"}),
		})
		return
	}

	// 将文件信息保存到数据库
	upload := models.Upload{
		FileID:     fileID,
		FileName:   file.Filename,
		FilePath:   savedPath,
		FileSize:   file.Size,
		FileType:   file.Header.Get("Content-Type"),
		UserID:     user.UserID,
		UploadTime: time.Now().UTC(),
	}

	if err := dbtool.DB().Create(&upload).Error; err != nil {
		// 删除已保存的文件
		os.Remove(savedPath)

		// 记录数据库保存失败日志
		tasks.LogUserOperationWithError(c, models.ActionUpload, models.ResourceTypeFile, &fileID, map[string]interface{}{
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

	// 记录文件上传成功日志
	tasks.LogUserOperation(c, models.ActionUpload, models.ResourceTypeFile, &fileID, map[string]interface{}{
		"original_filename": file.Filename,
		"file_size":         file.Size,
		"file_extension":    fileExt,
		"saved_path":        savedPath,
	})

	c.JSON(http.StatusOK, gin.H{
		"code":    200,
		"file_id": fileID,
	})
}

// Public file download
func DownloadFile(c *gin.Context) {
	fileIDStr := c.Param("file_id")
	fileID, err := uuid.Parse(fileIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    400,
			"message": i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "InvalidFileID"}),
		})
		return
	}

	filesMap, err := ristretto_tool.CachedFileMap()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    500,
			"message": i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "FailedToLoadFilesMap"}),
		})
	}

	uploadRecord, ok := filesMap[fileID.String()]
	if !ok {
		c.JSON(http.StatusNotFound, gin.H{
			"code":    404,
			"message": i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "FileNotFound"}),
		})
		return
	}

	// 安全检查
	// 获取上传目录的绝对路径
	uploadDirectionAbs, _ := filepath.Abs("./data/uploads")

	validator := securitytool.NewSecurePathValidator()
	filePath, err := validator.ValidatePathSafety(uploadDirectionAbs, uploadRecord.FilePath)
	if err != nil {
		c.JSON(http.StatusForbidden, gin.H{
			"code":    403,
			"message": i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "FileAccessDenied"}),
		})
		return
	}

	if _, err := os.Stat(filePath); os.IsNotExist(err) {
		c.JSON(http.StatusNotFound, gin.H{
			"code":    404,
			"message": i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "FileNotFoundOnServer"}),
		})
		return
	}

	file, err := os.Open(filePath)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    500,
			"message": i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "ErrorOpeningFile"}),
		})
		return
	}
	defer file.Close()

	fileState, err := file.Stat()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    500,
			"message": i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "ErrorOpeningFile"}),
		})
		return
	}

	// Escape filename to prevent Content-Disposition header injection
	safeFilename := strings.ReplaceAll(uploadRecord.FileName, `"`, `\"`)
	safeFilename = strings.ReplaceAll(safeFilename, `\`, `\\`)
	
	// 使用 c.DataFromReader 方法，它会正确设置 Content-Length
	c.DataFromReader(
		http.StatusOK,
		fileState.Size(),
		uploadRecord.FileType,
		file,
		map[string]string{
			"Content-Disposition": fmt.Sprintf(`attachment; filename="%s"`, safeFilename),
			"Cache-Control":       "public, max-age=36000",
		},
	)
}

func UploadUserAvatar(c *gin.Context) {
	user := c.MustGet("user").(models.User)

	// 获取上传的头像文件
	file, err := c.FormFile("avatar")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    400,
			"message": i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "NoAvatarFileUploaded"}),
		})
		return
	}

	// 检查文件类型是否为图片
	fileType, err := validateImageFile(file)
	if err != nil {
		c.JSON(http.StatusUnsupportedMediaType, gin.H{
			"code":    415,
			"message": i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "UploadedFileIsNotImage"}),
		})
		return
	}

	// 打开上传的文件
	src, err := file.Open()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    500,
			"message": i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "FailedToOpenUploadedFile"}),
		})
		return
	}
	defer src.Close()

	// 压缩图片为 WebP 格式
	compressedData, err := imagetool.CompressImageToWebP(src, fileType)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    500,
			"message": i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "FailedToCompressImage"}),
		})
		return
	}

	var fileID uuid.UUID = uuid.New()

	// 创建存储目录
	now := time.Now().UTC()
	storePath := filepath.Join("data", "uploads", "avatars", fmt.Sprintf("%d", now.Year()), fmt.Sprintf("%d", now.Month()))
	if err := os.MkdirAll(storePath, 0755); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    500,
			"message": i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "FailedToCreateUploadDirectory"}),
		})
		return
	}

	// 保存压缩后的文件（WebP格式）
	newFilePath := filepath.Join(storePath, fileID.String())
	if err := os.WriteFile(newFilePath, compressedData, 0644); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    500,
			"message": i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "FailedToSaveAvatarFile"}),
		})
		return
	}

	// 创建上传记录
	newUpload := models.Upload{
		FileID:     fileID.String(),
		UserID:     user.UserID,
		FileName:   strings.TrimSuffix(file.Filename, filepath.Ext(file.Filename)) + ".webp",
		FilePath:   newFilePath,
		FileHash:   "", // 可以添加文件哈希计算
		FileType:   "image/webp",
		FileSize:   int64(len(compressedData)),
		UploadTime: now,
	}

	if err := dbtool.DB().Create(&newUpload).Error; err != nil {
		_ = os.Remove(newFilePath)
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    500,
			"message": i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "FailedToSaveFileRecord"}),
		})
		return
	}

	// 构建头像URL
	avatarURL := fmt.Sprintf("/api/file/download/%s", fileID.String())

	if err := dbtool.DB().Model(&models.User{}).Where("user_id = ?", user.UserID).Update("avatar", avatarURL).Error; err != nil {
		_ = os.Remove(newFilePath)
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    500,
			"message": i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "FailedToUpdateUserAvatar"}),
		})
		return
	}

	// 返回成功响应
	c.JSON(http.StatusOK, gin.H{
		"code":       200,
		"message":    i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "AvatarUploadedSuccessfully"}),
		"avatar_url": avatarURL,
	})
}

func validateImageFile(file *multipart.FileHeader) (string, error) {
	src, err := file.Open()
	if err != nil {
		return "", err
	}
	defer src.Close()

	// 读取文件头部字节检测真实文件类型
	buffer := make([]byte, 512)
	n, err := src.Read(buffer)
	if err != nil && err != io.EOF {
		return "", err
	}

	// 检测MIME类型
	detectedType := http.DetectContentType(buffer[:n])
	if !strings.HasPrefix(detectedType, "image/") {
		return "", errors.New("not a valid image file")
	}

	return detectedType, nil
}

func UploadTeamAvatar(c *gin.Context) {
	// 只允许上传自己队伍的头像
	user := c.MustGet("user").(models.User)
	team := c.MustGet("team").(models.Team)

	file, err := c.FormFile("avatar")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    400,
			"message": i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "NoAvatarFileUploaded"}),
		})
		return
	}

	fileType, err := validateImageFile(file)
	if err != nil {
		c.JSON(http.StatusUnsupportedMediaType, gin.H{
			"code":    415,
			"message": i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "UploadedFileIsNotImage"}),
		})
		return
	}

	// 打开上传的文件
	src, err := file.Open()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    500,
			"message": i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "FailedToOpenUploadedFile"}),
		})
		return
	}
	defer src.Close()

	// 压缩图片为 WebP 格式
	compressedData, err := imagetool.CompressImageToWebP(src, fileType)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    500,
			"message": i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "FailedToCompressImage"}),
		})
		return
	}

	var fileID uuid.UUID = uuid.New()

	// 创建存储目录
	now := time.Now().UTC()
	storePath := filepath.Join("data", "uploads", "avatars", fmt.Sprintf("%d", now.Year()), fmt.Sprintf("%d", now.Month()))
	if err := os.MkdirAll(storePath, 0755); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    500,
			"message": i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "FailedToCreateUploadDirectory"}),
		})
		return
	}

	// 保存压缩后的文件（WebP格式）
	newFilePath := filepath.Join(storePath, fileID.String())
	if err := os.WriteFile(newFilePath, compressedData, 0644); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    500,
			"message": i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "FailedToSaveAvatarFile"}),
		})
		return
	}

	// 创建上传记录
	newUpload := models.Upload{
		FileID:     fileID.String(),
		UserID:     user.UserID,
		FileName:   strings.TrimSuffix(file.Filename, filepath.Ext(file.Filename)) + ".webp",
		FilePath:   newFilePath,
		FileHash:   "", // 可以添加文件哈希计算
		FileType:   "image/webp",
		FileSize:   int64(len(compressedData)),
		UploadTime: now,
	}

	if err := dbtool.DB().Create(&newUpload).Error; err != nil {
		_ = os.Remove(newFilePath)
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    500,
			"message": i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "FailedToSaveFileRecord"}),
		})
		return
	}

	// 构建头像URL
	avatarURL := fmt.Sprintf("/api/file/download/%s", fileID.String())

	if err := dbtool.DB().Model(&models.Team{}).Where("team_id = ?", team.TeamID).Update("team_avatar", avatarURL).Error; err != nil {
		_ = os.Remove(newFilePath)
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    500,
			"message": i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "FailedToUpdateTeamAvatar"}),
		})
		return
	}

	// 返回成功响应
	c.JSON(http.StatusOK, gin.H{
		"code":       200,
		"message":    i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "TeamAvatarUploadedSuccessfully"}),
		"avatar_url": avatarURL,
	})
}
