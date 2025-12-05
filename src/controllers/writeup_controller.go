package controllers

import (
	"archive/zip"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/nicksnyder/go-i18n/v2/i18n"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"

	"a1ctf/src/db/models"
	dbtool "a1ctf/src/utils/db_tool"
	i18ntool "a1ctf/src/utils/i18n_tool"
	securitytool "a1ctf/src/utils/security_tool"
	"a1ctf/src/webmodels"
)

const (
	writeupDownloadBase = "./data/uploads"
)

var writeupNameSanitizer = regexp.MustCompile(`[^a-zA-Z0-9_-]+`)

func UserGetGameWriteup(c *gin.Context) {
	game := c.MustGet("game").(models.Game)
	team := c.MustGet("team").(models.Team)

	var writeup models.TeamWriteup
	if err := dbtool.DB().
		Where("game_id = ? AND team_id = ?", game.GameID, team.TeamID).
		First(&writeup).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusOK, gin.H{
				"code": 200,
				"data": gin.H{
					"writeup":        nil,
					"require_wp":     game.RequireWp,
					"wp_expire_time": game.WpExpireTime,
					"wp_start_time":  game.WpStartTime,
					"wp_formats":     resolveWriteupFormats(game),
				},
			})
			return
		}

		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    500,
			"message": i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "FailedToLoadWriteup"}),
		})
		return
	}

	info := buildUserWriteupInfo(&writeup)

	c.JSON(http.StatusOK, gin.H{
		"code": 200,
		"data": gin.H{
			"writeup":        info,
			"require_wp":     game.RequireWp,
			"wp_expire_time": game.WpExpireTime,
			"wp_start_time":  game.WpStartTime,
			"wp_formats":     resolveWriteupFormats(game),
		},
	})
}

func UserSubmitGameWriteup(c *gin.Context) {
	payload := c.MustGet("payload").(*webmodels.SubmitWriteupPayload)
	game := c.MustGet("game").(models.Game)
	team := c.MustGet("team").(models.Team)
	user := c.MustGet("user").(models.User)

	if !game.RequireWp {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    400,
			"message": i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "WriteupNotRequired"}),
		})
		return
	}

	now := time.Now().UTC()
	if game.WpStartTime != nil && now.Before(*game.WpStartTime) {
		c.JSON(http.StatusForbidden, gin.H{
			"code":    403,
			"message": i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "WriteupCollectionNotStarted"}),
		})
		return
	}
	if now.After(game.WpExpireTime) {
		c.JSON(http.StatusForbidden, gin.H{
			"code":    403,
			"message": i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "WriteupDeadlinePassed"}),
		})
		return
	}

	var upload models.Upload
	if err := dbtool.DB().Where("file_id = ?", payload.FileID).First(&upload).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusBadRequest, gin.H{
				"code":    400,
				"message": i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "UploadedFileNotFound"}),
			})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{
				"code":    500,
				"message": i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "FailedToLoadUpload"}),
			})
		}
		return
	}

	if upload.UserID != user.UserID {
		c.JSON(http.StatusForbidden, gin.H{
			"code":    403,
			"message": i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "WriteupUploadOwnerMismatch"}),
		})
		return
	}

	formats := resolveWriteupFormats(game)
	ext := normalizedExtension(upload.FileName)
	if ext == "" || !writeupFormatAllowed(formats, ext) {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    400,
			"message": i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "WriteupFormatNotAllowed"}),
		})
		return
	}

	var oldUploadID *string
	if err := dbtool.DB().Transaction(func(tx *gorm.DB) error {
		var existing models.TeamWriteup
		if err := tx.Where("game_id = ? AND team_id = ?", game.GameID, team.TeamID).
			Clauses(clause.Locking{Strength: "UPDATE"}).
			First(&existing).Error; err != nil {
			if err != gorm.ErrRecordNotFound {
				return err
			}
		} else {
			oldUploadID = &existing.UploadID
			if err := tx.Delete(&existing).Error; err != nil {
				return err
			}
		}

		newRecord := models.TeamWriteup{
			GameID:    game.GameID,
			TeamID:    team.TeamID,
			UploadID:  upload.FileID,
			FileName:  upload.FileName,
			FileSize:  upload.FileSize,
			FileType:  upload.FileType,
			CreatedAt: now,
			UpdatedAt: now,
		}
		newRecord.SubmittedBy = &user.UserID

		return tx.Create(&newRecord).Error
	}); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    500,
			"message": i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "FailedToSaveWriteup"}),
		})
		return
	}

	if oldUploadID != nil {
		go cleanupUpload(*oldUploadID)
	}

	c.JSON(http.StatusOK, gin.H{
		"code":    200,
		"message": i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "WriteupSubmittedSuccessfully"}),
	})
}

func UserUploadGameWriteupFile(c *gin.Context) {
	game := c.MustGet("game").(models.Game)
	user := c.MustGet("user").(models.User)
	team := c.MustGet("team").(models.Team)

	fileHeader, err := c.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    400,
			"message": i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "NoFileUploaded"}),
		})
		return
	}

	originalFilename := filepath.Base(fileHeader.Filename)
	if strings.Contains(originalFilename, "..") || strings.ContainsAny(originalFilename, "/\\") {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    400,
			"message": i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "InvalidFileName"}),
		})
		return
	}

	const maxWriteupFileSize = 50 * 1024 * 1024
	if fileHeader.Size > maxWriteupFileSize {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    400,
			"message": i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "FileTooLarge"}),
		})
		return
	}

	if fileHeader.Size == 0 {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    400,
			"message": i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "FileCannotBeEmpty"}),
		})
		return
	}

	formats := resolveWriteupFormats(game)
	ext := strings.ToLower(strings.TrimPrefix(filepath.Ext(originalFilename), "."))
	if !writeupFormatAllowed(formats, ext) {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    400,
			"message": i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "WriteupFormatNotAllowed"}),
		})
		return
	}

	storeDir := filepath.Join("data", "uploads", "writeups", fmt.Sprintf("%d", game.GameID), fmt.Sprintf("%d", team.TeamID))
	if err := os.MkdirAll(storeDir, 0755); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    500,
			"message": i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "FailedToCreateUploadDirectory"}),
		})
		return
	}

	storedName := uuid.New().String()
	savedPath := filepath.Join(storeDir, storedName)

	absStoreDir, err := filepath.Abs(storeDir)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    500,
			"message": i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "PathValidationFailed"}),
		})
		return
	}
	absSavedPath, err := filepath.Abs(savedPath)
	if err != nil || !strings.HasPrefix(absSavedPath, absStoreDir) {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    400,
			"message": i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "InvalidFilePath"}),
		})
		return
	}

	if err := saveUploadedFile(fileHeader, savedPath); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    500,
			"message": i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "FailedToSaveFile"}),
		})
		return
	}

	if err := os.Chmod(savedPath, 0644); err != nil {
		_ = os.Remove(savedPath)
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    500,
			"message": i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "FailedToSetFilePermissions"}),
		})
		return
	}

	safeContentType := sanitizeContentType(fileHeader.Header.Get("Content-Type"), ext)

	upload := models.Upload{
		FileID:     uuid.New().String(),
		FileName:   originalFilename,
		FilePath:   savedPath,
		FileHash:   "",
		FileType:   safeContentType,
		FileSize:   fileHeader.Size,
		UserID:     user.UserID,
		UploadTime: time.Now().UTC(),
	}

	if err := dbtool.DB().Create(&upload).Error; err != nil {
		_ = os.Remove(savedPath)
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    500,
			"message": i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "FailedToSaveFileRecord"}),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code":    200,
		"file_id": upload.FileID,
		"url":     fmt.Sprintf("/api/file/download/%s", upload.FileID),
	})
}

func AdminListGameWriteups(c *gin.Context) {
	gameID, err := strconv.ParseInt(c.Param("game_id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    400,
			"message": i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "InvalidGameID"}),
		})
		return
	}

	var writeups []models.TeamWriteup
	if err := dbtool.DB().
		Preload("Team").
		Where("game_id = ?", gameID).
		Order("created_at DESC").
		Find(&writeups).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    500,
			"message": i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "FailedToLoadWriteup"}),
		})
		return
	}

	result := make([]webmodels.AdminTeamWriteupInfo, 0, len(writeups))
	for idx := range writeups {
		result = append(result, buildAdminWriteupInfo(&writeups[idx]))
	}

	c.JSON(http.StatusOK, gin.H{
		"code": 200,
		"data": result,
	})
}

func AdminDownloadGameWriteup(c *gin.Context) {
	gameID, err := strconv.ParseInt(c.Param("game_id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    400,
			"message": i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "InvalidGameID"}),
		})
		return
	}

	writeupID, err := strconv.ParseInt(c.Param("writeup_id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    400,
			"message": i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "InvalidWriteupID"}),
		})
		return
	}

	var writeup models.TeamWriteup
	if err := dbtool.DB().
		Where("writeup_id = ? AND game_id = ?", writeupID, gameID).
		Preload("Team").
		First(&writeup).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{
				"code":    404,
				"message": i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "WriteupNotFound"}),
			})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{
				"code":    500,
				"message": i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "FailedToLoadWriteup"}),
			})
		}
		return
	}

	upload, err := fetchUpload(writeup.UploadID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    500,
			"message": i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "FailedToLoadUpload"}),
		})
		return
	}

	filePath, err := secureUploadPath(upload.FilePath)
	if err != nil {
		c.JSON(http.StatusForbidden, gin.H{
			"code":    403,
			"message": i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "FileAccessDenied"}),
		})
		return
	}

	file, err := os.Open(filePath)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    500,
			"message": i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "FailedToOpenWriteup"}),
		})
		return
	}
	defer file.Close()

	displayName := buildWriteupDisplayName(&writeup)

	c.Header("Content-Type", upload.FileType)
	c.Header("Content-Disposition", fmt.Sprintf("inline; filename=\"%s\"", displayName))
	c.Header("Cache-Control", "no-cache")
	c.Status(http.StatusOK)

	_, _ = io.Copy(c.Writer, file)
}

func AdminDownloadAllWriteups(c *gin.Context) {
	gameID, err := strconv.ParseInt(c.Param("game_id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    400,
			"message": i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "InvalidGameID"}),
		})
		return
	}

	var writeups []models.TeamWriteup
	if err := dbtool.DB().
		Where("game_id = ?", gameID).
		Preload("Team").
		Order("team_id ASC").
		Find(&writeups).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    500,
			"message": i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "FailedToLoadWriteup"}),
		})
		return
	}

	if len(writeups) == 0 {
		c.JSON(http.StatusNotFound, gin.H{
			"code":    404,
			"message": i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "WriteupNotFound"}),
		})
		return
	}

	archiveName := fmt.Sprintf("game_%d_writeups_%s.zip", gameID, time.Now().UTC().Format("20060102150405"))
	c.Header("Content-Type", "application/zip")
	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s\"", archiveName))
	c.Status(http.StatusOK)

	zipWriter := zip.NewWriter(c.Writer)
	defer zipWriter.Close()

	for idx := range writeups {
		writeup := writeups[idx]

		upload, err := fetchUpload(writeup.UploadID)
		if err != nil {
			continue
		}

		filePath, err := secureUploadPath(upload.FilePath)
		if err != nil {
			continue
		}

		file, err := os.Open(filePath)
		if err != nil {
			continue
		}

		header, err := zipWriter.Create(buildWriteupDisplayName(&writeup))
		if err != nil {
			file.Close()
			continue
		}

		_, _ = io.Copy(header, file)
		file.Close()
	}
}

func buildUserWriteupInfo(writeup *models.TeamWriteup) webmodels.TeamWriteupInfo {
	return webmodels.TeamWriteupInfo{
		WriteupID:   writeup.WriteupID,
		FileID:      writeup.UploadID,
		FileName:    writeup.FileName,
		FileSize:    writeup.FileSize,
		FileType:    writeup.FileType,
		SubmittedAt: writeup.CreatedAt,
		Url:         fmt.Sprintf("/api/file/download/%s?inline=true", writeup.UploadID),
	}
}

func buildAdminWriteupInfo(writeup *models.TeamWriteup) webmodels.AdminTeamWriteupInfo {
	teamName := ""
	var avatar *string
	if writeup.Team != nil {
		teamName = writeup.Team.TeamName
		avatar = writeup.Team.TeamAvatar
	}

	displayName := buildWriteupDisplayName(writeup)
	return webmodels.AdminTeamWriteupInfo{
		WriteupID:   writeup.WriteupID,
		GameID:      writeup.GameID,
		TeamID:      writeup.TeamID,
		TeamName:    teamName,
		TeamAvatar:  avatar,
		FileID:      writeup.UploadID,
		FileName:    writeup.FileName,
		FileSize:    writeup.FileSize,
		FileType:    writeup.FileType,
		SubmittedAt: writeup.CreatedAt,
		DisplayName: displayName,
		Url:         fmt.Sprintf("/api/file/download/%s?inline=true", writeup.UploadID),
	}
}

func buildWriteupDisplayName(writeup *models.TeamWriteup) string {
	var teamName string
	if writeup.Team != nil {
		teamName = writeup.Team.TeamName
	}
	if teamName == "" {
		teamName = fmt.Sprintf("team_%d", writeup.TeamID)
	}

	baseName := fmt.Sprintf("%d_%s_%s", writeup.TeamID, sanitizeTeamName(teamName), writeup.CreatedAt.UTC().Format("20060102150405"))
	ext := filepath.Ext(writeup.FileName)
	if ext == "" {
		ext = ".bin"
	}
	return fmt.Sprintf("%s%s", baseName, ext)
}

func resolveWriteupFormats(game models.Game) []string {
	if len(game.WpFormats) == 0 {
		return []string{"pdf"}
	}
	return append(make([]string, 0, len(game.WpFormats)), game.WpFormats...)
}

func normalizedExtension(name string) string {
	ext := strings.ToLower(filepath.Ext(name))
	return strings.TrimPrefix(ext, ".")
}

func writeupFormatAllowed(formats []string, ext string) bool {
	if ext == "" {
		return false
	}
	for _, format := range formats {
		if strings.EqualFold(format, ext) {
			return true
		}
	}
	return false
}

func sanitizeTeamName(name string) string {
	name = strings.ToLower(strings.TrimSpace(name))
	name = strings.ReplaceAll(name, " ", "_")
	return writeupNameSanitizer.ReplaceAllString(name, "_")
}

func secureUploadPath(path string) (string, error) {
	root, err := filepath.Abs(writeupDownloadBase)
	if err != nil {
		return "", err
	}

	validator := securitytool.NewSecurePathValidator()
	return validator.ValidatePathSafety(root, path)
}

func fetchUpload(uploadID string) (*models.Upload, error) {
	var upload models.Upload
	if err := dbtool.DB().Where("file_id = ?", uploadID).First(&upload).Error; err != nil {
		return nil, err
	}
	return &upload, nil
}

func cleanupUpload(uploadID string) {
	if uploadID == "" {
		return
	}

	upload, err := fetchUpload(uploadID)
	if err != nil {
		return
	}

	filePath, err := secureUploadPath(upload.FilePath)
	if err == nil {
		_ = os.Remove(filePath)
	}

	dbtool.DB().Where("file_id = ?", uploadID).Delete(&models.Upload{})
}

func sanitizeContentType(contentType string, ext string) string {
	extToContentType := map[string]string{
		"pdf":  "application/pdf",
		"doc":  "application/msword",
		"docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
		"txt":  "text/plain",
		"md":   "text/markdown",
		"zip":  "application/zip",
		"rar":  "application/x-rar-compressed",
		"7z":   "application/x-7z-compressed",
	}

	if safeType, ok := extToContentType[ext]; ok {
		return safeType
	}

	contentType = strings.ToLower(strings.TrimSpace(contentType))

	if idx := strings.Index(contentType, ";"); idx != -1 {
		contentType = contentType[:idx]
	}

	safeTypes := map[string]bool{
		"application/pdf":    true,
		"application/msword": true,
		"application/vnd.openxmlformats-officedocument.wordprocessingml.document": true,
		"text/plain":                   true,
		"text/markdown":                true,
		"application/zip":              true,
		"application/x-rar-compressed": true,
		"application/x-7z-compressed":  true,
	}

	if safeTypes[contentType] {
		return contentType
	}

	return "application/octet-stream"
}
