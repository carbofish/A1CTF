package jwtauth

import (
	"a1ctf/src/db/models"
	clientconfig "a1ctf/src/modules/client_config"
	proofofwork "a1ctf/src/modules/proof_of_work"
	"a1ctf/src/tasks"
	dbtool "a1ctf/src/utils/db_tool"
	"a1ctf/src/utils/general"
	i18ntool "a1ctf/src/utils/i18n_tool"
	"a1ctf/src/utils/ristretto_tool"
	"crypto/rand"
	"crypto/rsa"
	"crypto/x509"
	"encoding/pem"
	"log"
	"os"
	"time"

	jwt "github.com/appleboy/gin-jwt/v2"
	"github.com/gin-gonic/gin"
	"github.com/nicksnyder/go-i18n/v2/i18n"
)

var (
	identityKey = "UserID"
	privateKey  *rsa.PrivateKey
	publicKey   *rsa.PublicKey
)

// generateRSAKeyPair 生成RSA密钥对
func generateRSAKeyPair() (*rsa.PrivateKey, error) {
	return rsa.GenerateKey(rand.Reader, 2048)
}

// savePrivateKeyToFile 保存私钥到文件
func savePrivateKeyToFile(privateKey *rsa.PrivateKey, filename string) error {
	keyBytes := x509.MarshalPKCS1PrivateKey(privateKey)

	keyPEM := &pem.Block{
		Type:  "RSA PRIVATE KEY",
		Bytes: keyBytes,
	}

	file, err := os.Create(filename)
	if err != nil {
		return err
	}
	defer file.Close()

	return pem.Encode(file, keyPEM)
}

// loadPrivateKeyFromFile 从文件加载私钥
func loadPrivateKeyFromFile(filename string) (*rsa.PrivateKey, error) {
	keyPEM, err := os.ReadFile(filename)
	if err != nil {
		return nil, err
	}

	block, _ := pem.Decode(keyPEM)
	if block == nil {
		return nil, err
	}

	return x509.ParsePKCS1PrivateKey(block.Bytes)
}

// savePublicKeyToFile 保存公钥到文件
func savePublicKeyToFile(publicKey *rsa.PublicKey, filename string) error {
	keyBytes, err := x509.MarshalPKIXPublicKey(publicKey)
	if err != nil {
		return err
	}

	keyPEM := &pem.Block{
		Type:  "PUBLIC KEY",
		Bytes: keyBytes,
	}

	file, err := os.Create(filename)
	if err != nil {
		return err
	}
	defer file.Close()

	return pem.Encode(file, keyPEM)
}

// loadPublicKeyFromFile 从文件加载公钥
func loadPublicKeyFromFile(filename string) (*rsa.PublicKey, error) {
	keyPEM, err := os.ReadFile(filename)
	if err != nil {
		return nil, err
	}

	block, _ := pem.Decode(keyPEM)
	if block == nil {
		return nil, err
	}

	pubKey, err := x509.ParsePKIXPublicKey(block.Bytes)
	if err != nil {
		return nil, err
	}

	return pubKey.(*rsa.PublicKey), nil
}

var privKeyFile = "./data/rsa_private_key.pem"
var pubKeyFile = "./data/rsa_public_key.pem"

// initRSAKeys 初始化RSA密钥对
func initRSAKeys() error {
	// 尝试从文件加载私钥和公钥
	if _, err := os.Stat(privKeyFile); err == nil {
		if _, err := os.Stat(pubKeyFile); err == nil {
			privKey, err := loadPrivateKeyFromFile(privKeyFile)
			if err == nil {
				pubKey, err := loadPublicKeyFromFile(pubKeyFile)
				if err == nil {
					privateKey = privKey
					publicKey = pubKey
					return nil
				}
			}
		}
	}

	// 如果文件不存在或加载失败，生成新的密钥对
	key, err := generateRSAKeyPair()
	if err != nil {
		return err
	}

	// 保存私钥到文件
	if err := savePrivateKeyToFile(key, privKeyFile); err != nil {
		return err
	}

	// 保存公钥到文件
	if err := savePublicKeyToFile(&key.PublicKey, pubKeyFile); err != nil {
		return err
	}

	privateKey = key
	publicKey = &key.PublicKey
	return nil
}

func identityHandler() func(c *gin.Context) interface{} {
	return func(c *gin.Context) interface{} {
		claims := jwt.ExtractClaims(c)
		return &models.JWTUser{
			UserID:     claims[identityKey].(string),
			UserName:   claims["UserName"].(string),
			Role:       models.UserRole(claims["Role"].(string)),
			JWTVersion: claims["JWTVersion"].(string),
		}
	}
}

func payloadFunc() func(data interface{}) jwt.MapClaims {
	return func(data interface{}) jwt.MapClaims {
		if v, ok := data.(*models.JWTUser); ok {
			return jwt.MapClaims{
				identityKey:  v.UserID,
				"UserName":   v.UserName,
				"Role":       v.Role,
				"JWTVersion": v.JWTVersion,
			}
		}
		return jwt.MapClaims{}
	}
}

type PermissionSetting struct {
	RequestMethod []string
	Permissions   []models.UserRole
}

var PermissionMap = map[string]PermissionSetting{
	"/api/account/profile":                 {RequestMethod: []string{"GET", "PUT"}, Permissions: []models.UserRole{}},
	"/api/account/updateEmail":             {RequestMethod: []string{"POST"}, Permissions: []models.UserRole{}},
	"/api/account/sendVerifyEmail":         {RequestMethod: []string{"POST"}, Permissions: []models.UserRole{}},
	"/api/account/changePassword":          {RequestMethod: []string{"POST"}, Permissions: []models.UserRole{}},
	"/api/account/sendForgetPasswordEmail": {RequestMethod: []string{"POST"}, Permissions: []models.UserRole{}},
	"/api/account/resetPassword":           {RequestMethod: []string{"POST"}, Permissions: []models.UserRole{}},

	"/api/verifyEmailCode": {RequestMethod: []string{"POST"}, Permissions: []models.UserRole{}},

	"/api/file/upload":            {RequestMethod: []string{"POST"}, Permissions: []models.UserRole{}},
	"/api/file/download/:file_id": {RequestMethod: []string{"GET"}, Permissions: []models.UserRole{}},
	"/api/user/avatar/upload":     {RequestMethod: []string{"POST"}, Permissions: []models.UserRole{}},

	// 战队管理相关权限
	"/api/game/:game_id/team/join":                      {RequestMethod: []string{"POST"}, Permissions: []models.UserRole{}},
	"/api/game/:game_id/team/:team_id/transfer-captain": {RequestMethod: []string{"POST"}, Permissions: []models.UserRole{}},
	"/api/game/:game_id/team/:team_id/member/:user_id":  {RequestMethod: []string{"DELETE"}, Permissions: []models.UserRole{}},
	"/api/game/:game_id/team/:team_id":                  {RequestMethod: []string{"DELETE", "PUT"}, Permissions: []models.UserRole{}},
	"/api/game/:game_id/team/avatar/upload":             {RequestMethod: []string{"POST"}, Permissions: []models.UserRole{}},

	"/api/admin/challenge/list":          {RequestMethod: []string{"GET", "POST"}, Permissions: []models.UserRole{models.UserRoleAdmin}},
	"/api/admin/challenge/create":        {RequestMethod: []string{"POST"}, Permissions: []models.UserRole{models.UserRoleAdmin}},
	"/api/admin/challenge/:challenge_id": {RequestMethod: []string{"GET", "PUT", "DELETE"}, Permissions: []models.UserRole{models.UserRoleAdmin}},
	"/api/admin/challenge/search":        {RequestMethod: []string{"POST"}, Permissions: []models.UserRole{models.UserRoleAdmin}},

	"/api/admin/user/list":           {RequestMethod: []string{"POST"}, Permissions: []models.UserRole{models.UserRoleAdmin}},
	"/api/admin/user/update":         {RequestMethod: []string{"POST"}, Permissions: []models.UserRole{models.UserRoleAdmin}},
	"/api/admin/user/reset-password": {RequestMethod: []string{"POST"}, Permissions: []models.UserRole{models.UserRoleAdmin}},
	"/api/admin/user/delete":         {RequestMethod: []string{"POST"}, Permissions: []models.UserRole{models.UserRoleAdmin}},

	"/api/admin/team/list":    {RequestMethod: []string{"POST"}, Permissions: []models.UserRole{models.UserRoleAdmin}},
	"/api/admin/team/approve": {RequestMethod: []string{"POST"}, Permissions: []models.UserRole{models.UserRoleAdmin}},
	"/api/admin/team/ban":     {RequestMethod: []string{"POST"}, Permissions: []models.UserRole{models.UserRoleAdmin}},
	"/api/admin/team/unban":   {RequestMethod: []string{"POST"}, Permissions: []models.UserRole{models.UserRoleAdmin}},
	"/api/admin/team/delete":  {RequestMethod: []string{"POST"}, Permissions: []models.UserRole{models.UserRoleAdmin}},

	"/api/admin/game/list":                             {RequestMethod: []string{"POST"}, Permissions: []models.UserRole{models.UserRoleAdmin}},
	"/api/admin/game/create":                           {RequestMethod: []string{"POST"}, Permissions: []models.UserRole{models.UserRoleAdmin}},
	"/api/admin/game/:game_id":                         {RequestMethod: []string{"GET", "POST", "PUT"}, Permissions: []models.UserRole{models.UserRoleAdmin}},
	"/api/admin/game/:game_id/challenge/:challenge_id": {RequestMethod: []string{"PUT", "GET", "POST", "DELETE"}, Permissions: []models.UserRole{models.UserRoleAdmin}},
	"/api/admin/game/:game_id/poster/upload":           {RequestMethod: []string{"POST"}, Permissions: []models.UserRole{models.UserRoleAdmin}},
	"/api/admin/game/:game_id/submits":                 {RequestMethod: []string{"POST"}, Permissions: []models.UserRole{models.UserRoleAdmin}},
	"/api/admin/game/:game_id/cheats":                  {RequestMethod: []string{"POST"}, Permissions: []models.UserRole{models.UserRoleAdmin}},

	// 分组管理相关权限
	"/api/admin/game/:game_id/groups":           {RequestMethod: []string{"GET", "POST"}, Permissions: []models.UserRole{models.UserRoleAdmin}},
	"/api/admin/game/:game_id/groups/:group_id": {RequestMethod: []string{"PUT", "DELETE"}, Permissions: []models.UserRole{models.UserRoleAdmin}},

	// 分数修正管理相关权限
	"/api/admin/game/:game_id/score-adjustments":                {RequestMethod: []string{"GET", "POST"}, Permissions: []models.UserRole{models.UserRoleAdmin}},
	"/api/admin/game/:game_id/score-adjustments/:adjustment_id": {RequestMethod: []string{"PUT", "DELETE"}, Permissions: []models.UserRole{models.UserRoleAdmin}},

	// 公告管理相关权限
	"/api/admin/game/:game_id/notices":      {RequestMethod: []string{"POST"}, Permissions: []models.UserRole{models.UserRoleAdmin}},
	"/api/admin/game/:game_id/notices/list": {RequestMethod: []string{"POST"}, Permissions: []models.UserRole{models.UserRoleAdmin}},
	"/api/admin/game/notices":               {RequestMethod: []string{"DELETE"}, Permissions: []models.UserRole{models.UserRoleAdmin}},

	"/api/admin/game/:game_id/challenge/:challenge_id/solves/delete": {RequestMethod: []string{"POST"}, Permissions: []models.UserRole{models.UserRoleAdmin}},

	"/api/game/list":                             {RequestMethod: []string{"GET"}, Permissions: []models.UserRole{}},
	"/api/game/:game_id":                         {RequestMethod: []string{"GET"}, Permissions: []models.UserRole{}},
	"/api/game/:game_id/challenges":              {RequestMethod: []string{"GET"}, Permissions: []models.UserRole{}},
	"/api/game/:game_id/challenge/:challenge_id": {RequestMethod: []string{"GET"}, Permissions: []models.UserRole{}},
	"/api/game/:game_id/notices":                 {RequestMethod: []string{"GET"}, Permissions: []models.UserRole{}},
	"/api/game/:game_id/groups":                  {RequestMethod: []string{"GET"}, Permissions: []models.UserRole{}},
	"/api/game/:game_id/createTeam":              {RequestMethod: []string{"POST"}, Permissions: []models.UserRole{}},
	"/api/game/:game_id/scoreboard":              {RequestMethod: []string{"GET"}, Permissions: []models.UserRole{}},
	"/api/game/:game_id/container/:challenge_id": {RequestMethod: []string{"POST", "DELETE", "PATCH", "GET"}, Permissions: []models.UserRole{}},
	"/api/game/:game_id/flag/:challenge_id":      {RequestMethod: []string{"POST"}, Permissions: []models.UserRole{}},
	"/api/game/:game_id/flag/:judge_id":          {RequestMethod: []string{"GET"}, Permissions: []models.UserRole{}},

	// 分组邀请码相关权限
	"/api/game/:game_id/group/invite-code": {RequestMethod: []string{"POST"}, Permissions: []models.UserRole{}},

	"/api/admin/container/list":   {RequestMethod: []string{"POST"}, Permissions: []models.UserRole{models.UserRoleAdmin}},
	"/api/admin/container/delete": {RequestMethod: []string{"POST"}, Permissions: []models.UserRole{models.UserRoleAdmin}},
	"/api/admin/container/extend": {RequestMethod: []string{"POST"}, Permissions: []models.UserRole{models.UserRoleAdmin}},
	"/api/admin/container/flag":   {RequestMethod: []string{"GET"}, Permissions: []models.UserRole{models.UserRoleAdmin}},

	// 系统设置相关API权限
	"/api/admin/system/settings":  {RequestMethod: []string{"GET", "POST"}, Permissions: []models.UserRole{models.UserRoleAdmin}},
	"/api/admin/system/upload":    {RequestMethod: []string{"POST"}, Permissions: []models.UserRole{models.UserRoleAdmin}},
	"/api/admin/system/test-smtp": {RequestMethod: []string{"POST"}, Permissions: []models.UserRole{models.UserRoleAdmin}},
	"/api/client-config":          {RequestMethod: []string{"GET"}, Permissions: []models.UserRole{}},

	"/api/admin/system/logs":       {RequestMethod: []string{"GET"}, Permissions: []models.UserRole{models.UserRoleAdmin}},
	"/api/admin/system/logs/stats": {RequestMethod: []string{"GET"}, Permissions: []models.UserRole{models.UserRoleAdmin}},

	// WebSocket
	"/api/hub": {RequestMethod: []string{"GET"}, Permissions: []models.UserRole{}},
	"/api/pod/:pod_name/:container_name/exec": {RequestMethod: []string{"GET"}, Permissions: []models.UserRole{models.UserRoleAdmin}},
}

var RequestMethodMaskMap = map[string]uint64{
	"GET":     0b1,
	"POST":    0b10,
	"PUT":     0b100,
	"DELETE":  0b1000,
	"PATCH":   0b10000,
	"HEAD":    0b100000,
	"OPTIONS": 0b1000000,
	"CONNECT": 0b10000000,
	"TRACE":   0b100000000,
	"ANY":     0b111111111,
}

var UserRoleMaskMap = map[models.UserRole]uint64{
	models.UserRoleAdmin:   0b1,
	models.UserRoleUser:    0b10,
	models.UserRoleMonitor: 0b100,
}

type OptimizedPermissionSetting struct {
	RequestMethodMask uint64
	PermissionMask    uint64
}

// 掩码优化后的权限映射表
var OptimizedPermissionMap = map[string]OptimizedPermissionSetting{}

// 利用掩码优化权限映射表
func optimizePermissionMap() {
	for path, rules := range PermissionMap {
		requestMethodMask := uint64(0)
		for _, method := range rules.RequestMethod {
			requestMethodMask |= RequestMethodMaskMap[method]
		}

		permissionMask := uint64(0)
		for _, role := range rules.Permissions {
			permissionMask |= UserRoleMaskMap[role]
		}

		OptimizedPermissionMap[path] = OptimizedPermissionSetting{
			RequestMethodMask: requestMethodMask,
			PermissionMask:    permissionMask,
		}
	}
}

func authorizator() func(data interface{}, c *gin.Context) bool {
	return func(data interface{}, c *gin.Context) bool {
		if v, ok := data.(*models.JWTUser); ok {

			pathURL := c.FullPath()

			rules, ok := OptimizedPermissionMap[pathURL]
			if ok {

				requestMethodMask, ok := RequestMethodMaskMap[c.Request.Method]
				if !ok {
					return false
				}

				permissionMask, ok := UserRoleMaskMap[v.Role]
				if !ok {
					return false
				}

				// 检查请求方法
				if requestMethodMask&rules.RequestMethodMask == 0 {
					return false
				}

				// 检查权限
				if rules.PermissionMask != 0 && permissionMask&rules.PermissionMask == 0 {
					return false
				}

				all_users, err := ristretto_tool.CachedMemberMap()
				if err != nil {
					return false
				}

				finalUser, ok := all_users[v.UserID]
				if !ok {
					return false
				}

				c.Set("user", finalUser)

				if finalUser.JWTVersion != v.JWTVersion {
					c.SetCookie("a1token", "", -1, "/", "", false, false)
					return false
				}

				return true
			}
		}
		return false
	}
}

func unauthorized() func(c *gin.Context, code int, message string) {
	return func(c *gin.Context, code int, message string) {
		c.JSON(code, gin.H{
			"code":    code,
			"message": message,
		})
	}
}

func httpStatusMessageFunc() func(e error, c *gin.Context) string {
	return func(e error, c *gin.Context) string {
		messageID := "JWT"
		switch e {
		case jwt.ErrForbidden:
			messageID += "ErrForbidden"
		case jwt.ErrInvalidSigningAlgorithm:
			messageID += "ErrInvalidSigningAlgorithm"
		case jwt.ErrMissingExpField:
			messageID += "ErrMissingExpField"
		case jwt.ErrExpiredToken:
			messageID += "ErrExpiredToken"
		case jwt.ErrWrongFormatOfExp:
			messageID += "ErrWrongFormatOfExp"
		default:
			return e.Error()
		}
		return i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: messageID})
	}
}

type LoginPayload struct {
	Username string `form:"username" json:"username" binding:"required"`
	Password string `form:"password" json:"password" binding:"required"`
	CaptCha  string `form:"captcha" json:"captcha"`
}

func Login() func(c *gin.Context) (interface{}, error) {
	return func(c *gin.Context) (interface{}, error) {
		var loginVals LoginPayload
		if err := c.ShouldBind(&loginVals); err != nil {
			return "", jwt.ErrMissingLoginValues
		}

		if clientconfig.ClientConfig.CaptchaEnabled {
			valid := proofofwork.CapInstance.ValidateToken(c.Request.Context(), loginVals.CaptCha)
			if !valid {
				return nil, jwt.ErrMissingLoginValues
			}
		}

		user_result := models.User{}
		if dbtool.DB().First(&user_result, "username = ? OR email = ? ", loginVals.Username, loginVals.Username).Error != nil {
			return nil, jwt.ErrFailedAuthentication
		} else {
			if user_result.Password == general.SaltPassword(loginVals.Password, user_result.Salt) {
				lastLoginTime := user_result.LastLoginTime
				lastLoginIP := user_result.LastLoginIP
				now := time.Now()
				loginIP := c.ClientIP()

				// Update last login time
				if err := dbtool.DB().Model(&user_result).Updates(map[string]interface{}{
					"last_login_time": now.UTC(),
					"last_login_ip":   loginIP,
				}).Error; err != nil {
					return nil, jwt.ErrFailedAuthentication
				}

				tasks.LogFromGinContext(c, tasks.LogEntry{
					Category:     models.LogCategoryUser,
					Action:       models.LoginSuccess,
					ResourceType: models.ResourceTypeUser,
					UserID:       &user_result.UserID,
					Username:     &user_result.Username,
					Details: map[string]interface{}{
						"username":        user_result.Username,
						"login_time":      now.UTC(),
						"last_login_time": lastLoginTime.UTC(),
						"login_ip":        loginIP,
						"last_login_ip":   lastLoginIP,
					},
					Status: models.LogStatusSuccess,
				})

				return &models.JWTUser{
					UserName:   user_result.Username,
					Role:       user_result.Role,
					UserID:     user_result.UserID,
					JWTVersion: user_result.JWTVersion,
				}, nil
			} else {
				return nil, jwt.ErrFailedAuthentication
			}
		}
	}
}

func initParams() *jwt.GinJWTMiddleware {

	return &jwt.GinJWTMiddleware{
		Realm:            "test zone",
		SigningAlgorithm: "RS384",
		PrivKeyFile:      privKeyFile,
		PubKeyFile:       pubKeyFile,
		Timeout:          time.Hour * 48,
		MaxRefresh:       time.Hour,
		IdentityKey:      identityKey,
		PayloadFunc:      payloadFunc(),

		SendCookie:    true,
		CookieName:    "a1token",
		TokenHeadName: "Bearer",

		IdentityHandler:       identityHandler(),
		Authenticator:         Login(),
		Authorizator:          authorizator(),
		Unauthorized:          unauthorized(),
		HTTPStatusMessageFunc: httpStatusMessageFunc(),

		TokenLookup: "cookie:a1token",
		TimeFunc:    time.Now,
	}
}

var authMiddleware *jwt.GinJWTMiddleware

func InitJwtMiddleWare() *jwt.GinJWTMiddleware {
	// 首先初始化RSA密钥对
	if err := initRSAKeys(); err != nil {
		panic("Failed to initialize RSA keys: " + err.Error())
	}

	optimizePermissionMap()
	tmpMiddleware, err := jwt.New(initParams())
	if err != nil {
		log.Println("Failed to initialize JWT middleware: " + err.Error())
		panic(err)
	}
	authMiddleware = tmpMiddleware
	return authMiddleware
}

func GetJwtMiddleWare() *jwt.GinJWTMiddleware {
	return authMiddleware
}
