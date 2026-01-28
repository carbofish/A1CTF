package controllers

import (
	"a1ctf/src/db/models"
	"a1ctf/src/tasks"
	dbtool "a1ctf/src/utils/db_tool"
	general "a1ctf/src/utils/general"
	i18ntool "a1ctf/src/utils/i18n_tool"
	"a1ctf/src/webmodels"
	"fmt"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/nicksnyder/go-i18n/v2/i18n"
	"gorm.io/gorm"
)

func AdminListUsers(c *gin.Context) {

	var payload webmodels.AdminListUsersPayload
	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "InvalidRequestPayload"})})
		return
	}

	query := dbtool.DB().Model(&models.User{})

	// 如果有搜索关键词，添加搜索条件
	if payload.Search != "" {
		searchPattern := fmt.Sprintf("%%%s%%", payload.Search)
		query = query.Where(`username ILIKE ? 
		OR email ILIKE ? OR realname ILIKE ? 
		OR student_number ILIKE ?
		OR slogan ILIKE ?
		OR user_id::text = ?
		OR last_login_ip = ?
		OR register_ip = ?`,
			searchPattern, searchPattern, searchPattern, searchPattern, searchPattern, payload.Search, payload.Search, payload.Search)
	}

	var users []models.User
	if err := query.Offset(payload.Offset).Limit(payload.Size).Find(&users).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "FailedToFetchUsers"})})
		return
	}

	var count int64
	countQuery := dbtool.DB().Model(&models.User{})
	if payload.Search != "" {
		searchPattern := fmt.Sprintf("%%%s%%", payload.Search)
		countQuery = countQuery.Where(`username ILIKE ? 
		OR email ILIKE ? OR realname ILIKE ? 
		OR student_number ILIKE ?
		OR slogan ILIKE ?
		OR user_id::text = ?
		OR last_login_ip = ?
		OR register_ip = ?`,
			searchPattern, searchPattern, searchPattern, searchPattern, searchPattern, payload.Search, payload.Search, payload.Search)
	}
	if err := countQuery.Count(&count).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "FailedToCountUsers"})})
		return
	}

	userItems := make([]webmodels.AdminListUserItem, 0, len(users))

	for _, user := range users {
		userItems = append(userItems, webmodels.AdminListUserItem{
			UserID:        user.UserID,
			UserName:      user.Username,
			RealName:      user.Realname,
			StudentID:     user.StudentNumber,
			Phone:         user.Phone,
			Slogan:        user.Slogan,
			RegisterTime:  user.RegisterTime,
			LastLoginTime: user.LastLoginTime,
			LastLoginIP:   user.LastLoginIP,
			Email:         user.Email,
			Avatar:        user.Avatar,
			Role:          user.Role,
			EmailVerified: user.EmailVerified,
			RegisterIP:    user.RegisterIP,
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"code":  200,
		"data":  userItems,
		"total": count,
	})
}

// VerifyUserByID 通过 user_id 查询并验证用户信息
func VerifyUserByID(c *gin.Context) {
	userID := c.Param("user_id")
	if strings.TrimSpace(userID) == "" {
		c.JSON(http.StatusBadRequest, webmodels.ErrorMessage{
			Code:    400,
			Message: i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "InvalidRequestPayload"}),
		})
		return
	}

	var user models.User
	if err := dbtool.DB().Where("user_id = ?", userID).First(&user).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, webmodels.ErrorMessage{
				Code:    404,
				Message: i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "UserNotFound"}),
			})
			return
		}
		c.JSON(http.StatusInternalServerError, webmodels.ErrorMessage{
			Code:    500,
			Message: i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "SystemError"}),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code": 200,
		"data": gin.H{
			"user_id":  user.UserID,
			"username": user.Username,
			"email":    user.Email,
			"avatar":   user.Avatar,
			"role":     user.Role,
			"verified": user.EmailVerified,
		},
	})
}

// AdminUpdateUser 更新用户信息
func AdminUpdateUser(c *gin.Context) {
	var payload webmodels.AdminUpdateUserPayload
	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    400,
			"message": i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "InvalidRequestParameters"}),
		})
		return
	}

	// 先检查用户是否存在
	var user models.User
	if err := dbtool.DB().First(&user, "user_id = ?", payload.UserID).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{
				"code":    404,
				"message": i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "UserNotFound"}),
			})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{
				"code":    500,
				"message": i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "FailedToQueryUser"}),
			})
		}
		return
	}

	// 更新用户信息
	updatedFields := make([]map[string]interface{}, 0)

	// 如果用户的角色被修改了，则需要重置这个用户的令牌
	if user.Role != payload.Role {
		// 无权修改管理员的角色
		if user.Role == models.UserRoleAdmin {
			c.JSON(http.StatusForbidden, gin.H{
				"code":    403,
				"message": i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "UpdateAdminRoleNotAllowed"}),
			})
			return
		}
		user.JWTVersion = general.RandomPassword(16)
		updatedFields = append(updatedFields, map[string]interface{}{
			"field": "role",
			"old":   user.Role,
			"new":   payload.Role,
		})
		user.Role = payload.Role
	}

	if user.Username != payload.UserName {
		updatedFields = append(updatedFields, map[string]interface{}{
			"field": "username",
			"old":   user.Username,
			"new":   payload.UserName,
		})
		user.Username = payload.UserName
	}
	if !general.CompareStringPtrEquals(user.Realname, payload.RealName) {
		updatedFields = append(updatedFields, map[string]interface{}{
			"field": "realname",
			"old":   user.Realname,
			"new":   payload.RealName,
		})
		user.Realname = payload.RealName
	}
	if !general.CompareStringPtrEquals(user.StudentNumber, payload.StudentID) {
		updatedFields = append(updatedFields, map[string]interface{}{
			"field": "student_number",
			"old":   user.StudentNumber,
			"new":   payload.StudentID,
		})
		user.StudentNumber = payload.StudentID
	}
	if !general.CompareStringPtrEquals(user.Phone, payload.Phone) {
		updatedFields = append(updatedFields, map[string]interface{}{
			"field": "phone",
			"old":   user.Phone,
			"new":   payload.Phone,
		})
		user.Phone = payload.Phone
	}
	if !general.CompareStringPtrEquals(user.Slogan, payload.Slogan) {
		updatedFields = append(updatedFields, map[string]interface{}{
			"field": "slogan",
			"old":   user.Slogan,
			"new":   payload.Slogan,
		})
		user.Slogan = payload.Slogan
	}
	if !general.CompareStringPtrEquals(user.Email, payload.Email) {
		updatedFields = append(updatedFields, map[string]interface{}{
			"field": "email",
			"old":   user.Email,
			"new":   payload.Email,
		})
		user.Email = payload.Email
	}
	if !general.CompareStringPtrEquals(user.Avatar, payload.Avatar) {
		updatedFields = append(updatedFields, map[string]interface{}{
			"field": "avatar",
			"old":   user.Avatar,
			"new":   payload.Avatar,
		})
		user.Avatar = payload.Avatar
	}

	if err := dbtool.DB().Save(&user).Error; err != nil {
		// 记录失败日志
		tasks.LogAdminOperationWithError(c, models.ActionUpdate, models.ResourceTypeUser, &payload.UserID, map[string]interface{}{
			"username":       user.Username,
			"payload":        payload,
			"updated_fields": updatedFields,
		}, err)

		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    500,
			"message": i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "FailedToUpdateUserInfo"}),
		})
		return
	}

	// 记录成功日志
	tasks.LogAdminOperation(c, models.ActionUpdate, models.ResourceTypeUser, &payload.UserID, map[string]interface{}{
		"username":       user.Username,
		"updated_fields": updatedFields,
	})

	c.JSON(http.StatusOK, gin.H{
		"code":    200,
		"message": i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "UserInfoUpdated"}),
	})
}

// AdminResetUserPassword 重置用户密码
func AdminResetUserPassword(c *gin.Context) {
	var payload webmodels.AdminUserOperationPayload
	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    400,
			"message": i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "InvalidRequestParameters"}),
		})
		return
	}

	// 先检查用户是否存在
	var user models.User
	if err := dbtool.DB().First(&user, "user_id = ?", payload.UserID).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{
				"code":    404,
				"message": i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "UserNotFound"}),
			})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{
				"code":    500,
				"message": i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "FailedToQueryUser"}),
			})
		}
		return
	}

	// 生成新密码
	newPassword := general.RandomPassword(16)
	newSalt := general.GenerateSalt()
	saltedPassword := general.SaltPassword(newPassword, newSalt)

	// 更新用户密码
	user.Password = saltedPassword
	user.Salt = newSalt
	// 作废老令牌
	user.JWTVersion = general.RandomPassword(16)

	if err := dbtool.DB().Save(&user).Error; err != nil {
		// 记录失败日志
		tasks.LogAdminOperationWithError(c, models.ActionResetPassword, models.ResourceTypeUser, &payload.UserID, map[string]interface{}{
			"target_user": user.Username,
		}, err)

		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    500,
			"message": i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "FailedToResetPassword"}),
		})
		return
	}

	// 记录成功日志
	tasks.LogAdminOperation(c, models.ActionResetPassword, models.ResourceTypeUser, &payload.UserID, map[string]interface{}{
		"target_user": user.Username,
		"action":      "password_reset_success",
	})

	c.JSON(http.StatusOK, gin.H{
		"code":         200,
		"message":      i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "PasswordReset"}),
		"new_password": newPassword,
	})
}

// AdminDeleteUser 删除用户
func AdminDeleteUser(c *gin.Context) {
	var payload webmodels.AdminUserOperationPayload
	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    400,
			"message": i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "InvalidRequestParameters"}),
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

	// 先检查用户是否存在
	var user models.User
	if err := tx.First(&user, "user_id = ?", payload.UserID).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{
				"code":    404,
				"message": i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "UserNotFound"}),
			})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{
				"code":    500,
				"message": i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "FailedToQueryUser"}),
			})
		}
		tx.Rollback()
		return
	}

	// 不能删除管理员账户
	if user.Role == models.UserRoleAdmin {
		c.JSON(http.StatusForbidden, gin.H{
			"code":    403,
			"message": i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "DeleteAdminNotAllowed"}),
		})
		return
	}

	// 删除用户
	if err := tx.Delete(&user).Error; err != nil {
		tx.Rollback()

		// 记录失败日志
		tasks.LogAdminOperationWithError(c, models.ActionDelete, models.ResourceTypeUser, &payload.UserID, map[string]interface{}{
			"target_user": user.Username,
		}, err)

		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    500,
			"message": i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "FailedToDeleteUser"}),
		})
		return
	}

	// 提交事务
	if err := tx.Commit().Error; err != nil {
		// 记录失败日志
		tasks.LogAdminOperationWithError(c, models.ActionDelete, models.ResourceTypeUser, &payload.UserID, map[string]interface{}{
			"target_user": user.Username,
			"error_type":  "commit_transaction_failed",
		}, err)

		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    500,
			"message": i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "FailedToCommitTransaction"}),
		})
		return
	}

	// 记录成功日志
	tasks.LogAdminOperation(c, models.ActionDelete, models.ResourceTypeUser, &payload.UserID, map[string]interface{}{
		"deleted_user": user.Username,
		"action":       "user_delete_success",
	})

	c.JSON(http.StatusOK, gin.H{
		"code":    200,
		"message": i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "UserDeleted"}),
	})
}
