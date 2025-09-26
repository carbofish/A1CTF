package main

import (
	"context"
	"fmt"
	"io"
	"log"
	"mime"
	"net/http"
	"os"
	"os/signal"
	"path/filepath"
	"strings"
	"syscall"
	"time"

	"a1ctf/src/controllers"
	"a1ctf/src/db"
	"a1ctf/src/jobs"
	clientconfig "a1ctf/src/modules/client_config"
	jwtauth "a1ctf/src/modules/jwt_auth"
	emailjwt "a1ctf/src/modules/jwt_email"
	"a1ctf/src/modules/monitoring"
	proofofwork "a1ctf/src/modules/proof_of_work"
	"a1ctf/src/tasks"
	"a1ctf/src/utils"
	dbtool "a1ctf/src/utils/db_tool"
	i18ntool "a1ctf/src/utils/i18n_tool"
	k8stool "a1ctf/src/utils/k8s_tool"
	ratelimiter "a1ctf/src/utils/rate_limiter"
	redistool "a1ctf/src/utils/redis_tool"
	"a1ctf/src/utils/ristretto_tool"
	validatortool "a1ctf/src/utils/validator_tool"
	"a1ctf/src/utils/zaphelper"
	"a1ctf/src/webmodels"

	"github.com/gin-gonic/gin"
	"github.com/go-co-op/gocron/v2"
	"github.com/prometheus/client_golang/prometheus/promhttp"
	"github.com/spf13/viper"
	"golang.org/x/time/rate"

	cache "github.com/chenyahui/gin-cache"
	"github.com/chenyahui/gin-cache/persist"

	"github.com/gin-contrib/gzip"
	"github.com/gin-contrib/pprof"
)

func StartLoopEvent() {
	s, _ := gocron.NewScheduler()
	s.NewJob(
		gocron.DurationJob(
			viper.GetDuration("job-intervals.update-activate-game-score"),
		),
		gocron.NewTask(
			jobs.UpdateActivateGameScore,
		),
		gocron.WithSingletonMode(gocron.LimitModeWait),
	)

	s.NewJob(
		gocron.DurationJob(
			viper.GetDuration("job-intervals.update-active-game-score-board"),
		),
		gocron.NewTask(
			jobs.UpdateActiveGameScoreBoard,
		),
		gocron.WithSingletonMode(gocron.LimitModeWait),
	)

	s.NewJob(
		gocron.DurationJob(
			viper.GetDuration("job-intervals.container-updating"),
		),
		gocron.NewTask(
			jobs.UpdateLivingContainers,
		),
		gocron.WithSingletonMode(gocron.LimitModeWait),
	)

	s.NewJob(
		gocron.DurationJob(
			viper.GetDuration("job-intervals.flag-judge"),
		),
		gocron.NewTask(
			jobs.FlagJudgeJob,
		),
		gocron.WithSingletonMode(gocron.LimitModeWait),
	)

	s.NewJob(
		gocron.DurationJob(
			viper.GetDuration("job-intervals.update-game-scoreboard-cache"),
		),
		gocron.NewTask(
			jobs.UpdateGameScoreBoardCache,
		),
		gocron.WithSingletonMode(gocron.LimitModeWait),
	)

	s.NewJob(
		gocron.DurationJob(
			viper.GetDuration("job-intervals.compress-and-delete-old-logs"),
		),
		gocron.NewTask(
			zaphelper.CompressAndDeleteOldLogs,
		),
		gocron.WithSingletonMode(gocron.LimitModeWait),
	)

	s.Start()
}

func RateLimiter(rateLimit int, rateInterval time.Duration) gin.HandlerFunc {
	limiter := rate.NewLimiter(rate.Every(rateInterval), rateLimit)

	return func(c *gin.Context) {
		if !limiter.Allow() {
			c.JSON(http.StatusTooManyRequests, gin.H{
				"message": "Too many requests, please try again later",
			})
			c.Abort()
			return
		}
		c.Next()
	}
}

func main() {
	// 加载配置文件
	utils.LoadConfig()

	// 初始化 Zap
	zaphelper.InitZap()
	defer zaphelper.CloseZap()

	// 初始化多语言文件
	i18ntool.LoadLanguageFiles()

	// 初始化 redis 的连接
	redistool.ConnectToRedis()

	// 初始化 k8s 节点名称和地址映射
	k8stool.InitNodeAddressMap()
	k8stool.InitNodePortRangeMap()

	// 初始化数据库连接
	dbtool.Init()

	// 初始化 Proof-of-work backend
	proofofwork.InitCap()

	// 初始化缓存池
	ristretto_tool.LoadCacheTime()
	ristretto_tool.InitCachePool()
	defer ristretto_tool.CloseCachePool()

	// 初始化 db
	db.InitDB()

	// 初始化k8s命名空间
	if err := k8stool.InitNamespace(); err != nil {
		log.Fatalf("Failed to initialize k8s namespace: %v", err)
	}

	// 加载配置文件
	clientconfig.LoadSystemSettings()

	// 初始化系统监控
	if viper.GetBool("monitoring.enabled") {
		systemMonitor := monitoring.NewSystemMonitor(viper.GetDuration("monitoring.system-monitor-interval"))
		systemMonitor.Start()
		defer systemMonitor.Stop()
	}

	// 初始化任务队列
	tasks.InitTaskQueue()

	memoryStore := persist.NewMemoryStore(1 * time.Minute)

	// 关闭日志输出
	gin.DefaultWriter = io.Discard
	r := gin.New()
	// r := gin.Default()

	// 初始化验证器
	validatortool.InitValidator()

	// 设置 Trusted Proxies
	if len(viper.GetStringSlice("system.trusted-proxies")) > 0 {
		if viper.GetBool("system.forwarded-by-client-ip") && len(viper.GetStringSlice("system.remote-ip-headers")) > 0 {
			r.ForwardedByClientIP = viper.GetBool("system.forwarded-by-client-ip")
			r.RemoteIPHeaders = viper.GetStringSlice("system.remote-ip-headers")
		} else {
			log.Fatalf("No remote ip headers set, using default. If you are using a reverse proxy, please set the remote ip headers in the config file.")
		}
		r.SetTrustedProxies(viper.GetStringSlice("system.trusted-proxies"))
	} else {
		zaphelper.Sugar.Warn("No trusted proxies set, using default. If you are using a reverse proxy, please set the trusted proxies in the config file.")
	}

	// pprof system monitor
	if viper.GetBool("system.pprof-enable") {
		pprof.Register(r)
	}

	// 启动 Gin 框架性能监控
	if viper.GetBool("monitoring.enabled") {
		r.Use(monitoring.GinPrometheusMiddleware())
	}

	// 启动性能监控
	http.Handle("/metrics", promhttp.Handler())
	go http.ListenAndServe(fmt.Sprintf("%s:%s", viper.GetString("system.prometheus-host"), viper.GetString("system.prometheus-port")), nil)

	// JWT 鉴权中间件
	authMiddleware := jwtauth.InitJwtMiddleWare()

	// 初始化 email jwt
	emailjwt.InitRSAKeys()

	bestGzipMiddleware := gzip.Gzip(gzip.BestCompression)
	defaultGzipMiddleware := gzip.Gzip(gzip.DefaultCompression)

	// 公共接口
	public := r.Group("/api")
	{
		public.POST("/auth/login", authMiddleware.LoginHandler)
		public.POST("/auth/register", controllers.PayloadValidator(
			webmodels.RegisterPayload{},
		), controllers.Register)

		public.GET("/game/list", cache.CacheByRequestURI(memoryStore, 1*time.Second), controllers.UserListGames)
		public.GET("/game/:game_id/scoreboard", bestGzipMiddleware, controllers.GameStatusMiddleware(controllers.GameStatusMiddlewareProps{
			VisibleAfterEnded: true,
			CheckGameStarted:  true,
		}), controllers.UserGameGetScoreBoard)

		public.GET("/game/:game_id", defaultGzipMiddleware, controllers.GameStatusMiddleware(controllers.GameStatusMiddlewareProps{
			VisibleAfterEnded: true,
			CheckGameStarted:  false,
		}), controllers.UserGetGameDetailWithTeamInfo)

		public.GET("/game/:game_id/desc", defaultGzipMiddleware, controllers.GameStatusMiddleware(controllers.GameStatusMiddlewareProps{
			VisibleAfterEnded: true,
			CheckGameStarted:  false,
		}), controllers.UserGetGameDescription)

		fileGroup := public.Group("/file")
		{
			fileGroup.GET("/download/:file_id", controllers.DownloadFile)
		}

		public.GET("/client-config", cache.CacheByRequestURI(memoryStore, 1*time.Second), bestGzipMiddleware, controllers.GetClientConfig)

		public.POST("/cap/challenge", controllers.CapCreateChallenge)
		public.POST("/cap/redeem", controllers.CapRedeemChallenge)
		public.POST("/cap/validate", controllers.CapValidateToken)

		// 邮箱验证接口
		public.POST("/account/verifyEmailCode", controllers.PayloadValidator(
			webmodels.EmailVerifyPayload{},
		), controllers.VerifyEmailCode)

		public.POST("/account/sendForgetPasswordEmail", controllers.PayloadValidator(
			webmodels.ForgetPasswordSendMailPayload{},
		), controllers.UserForgetPassword)
		public.POST("/account/resetPassword", controllers.PayloadValidator(
			webmodels.ForgetPasswordWithVerifyCodePayload{},
		), controllers.UserVerifyAndResetPassword)
	}

	// 鉴权接口
	auth := r.Group("/api")
	auth.Use(authMiddleware.MiddlewareFunc())
	{
		fileGroup := auth.Group("/file")
		{
			fileGroup.POST("/upload", controllers.UploadFile)
		}

		// 获取用户资料和更新用户资料的接口
		accountGroup := auth.Group("/account")
		{
			accountGroup.GET("/profile", controllers.GetProfile)
			accountGroup.PUT("/profile", controllers.PayloadValidator(
				webmodels.UpdateUserProfilePayload{},
			), controllers.UpdateUserProfile)

			accountGroup.POST("/updateEmail", controllers.PayloadValidator(
				webmodels.UpdateUserEmailPayload{},
			), controllers.UpdateUserEmail)
			accountGroup.POST("/sendVerifyEmail", controllers.SendVerifyEmail)
			accountGroup.POST("/changePassword", controllers.PayloadValidator(
				webmodels.ChangePasswordPayload{},
			), controllers.UserChangePassword)
		}

		// 用户头像上传接口
		userAvatarGroup := auth.Group("/user")
		userAvatarGroup.Use(controllers.EmailVerifiedMiddleware())
		{
			userAvatarGroup.POST("/avatar/upload", controllers.UploadUserAvatar)
		}

		// 团队相关管理接口
		teamManagePublicGroup := auth.Group("/game/:game_id/team")
		teamManagePublicGroup.Use(controllers.GameStatusMiddleware(controllers.GameStatusMiddlewareProps{
			VisibleAfterEnded: false,
			CheckGameStarted:  false,
		}))
		// 专门给 Join 预留的，无需 TeamStatus 验证
		{
			teamManagePublicGroup.POST("/join", controllers.PayloadValidator(
				webmodels.TeamJoinPayload{},
			), controllers.TeamJoinRequest)
		}

		// 这里需要验证比赛状态
		teamManageGroup := auth.Group("/game/:game_id/team")
		teamManageGroup.Use(controllers.GameStatusMiddleware(controllers.GameStatusMiddlewareProps{
			VisibleAfterEnded: false,
			CheckGameStarted:  false,
		}))
		teamManageGroup.Use(controllers.TeamStatusMiddleware())
		teamManageGroup.Use(controllers.EmailVerifiedMiddleware())
		{
			// 比赛开始后加入队伍之类的还是允许的
			teamManageGroup.PUT("/:team_id", controllers.UpdateTeamInfo)
			teamManageGroup.POST("/avatar/upload", controllers.UploadTeamAvatar)

			// 比赛开始后不允许移交队长，删除队员，解散队伍
			teamManageGroup.POST("/:team_id/transfer-captain", controllers.OperationNotAllowedAfterGameStartMiddleWare(), controllers.PayloadValidator(
				webmodels.TransferCaptainPayload{},
			), controllers.TransferTeamCaptain)
			teamManageGroup.DELETE("/:team_id/member/:user_id", controllers.OperationNotAllowedAfterGameStartMiddleWare(), controllers.RemoveTeamMember)
			teamManageGroup.DELETE("/:team_id", controllers.OperationNotAllowedAfterGameStartMiddleWare(), controllers.DeleteTeam)
		}

		challengeGroup := auth.Group("/admin/challenge")
		challengeGroup.Use(controllers.EmailVerifiedMiddleware())
		{
			challengeGroup.POST("/list", controllers.AdminListChallenges)

			challengeGroup.POST("/create", controllers.AdminCreateChallenge)
			challengeGroup.DELETE("/:challenge_id", controllers.AdminDeleteChallenge)
			challengeGroup.GET("/:challenge_id", controllers.AdminGetChallenge)
			challengeGroup.PUT("/:challenge_id", controllers.AdminUpdateChallenge)

			challengeGroup.POST("/search", controllers.AdminSearchChallenges)
		}

		// 管理员用户管理接口
		userGroup := auth.Group("/admin/user")
		{
			userGroup.POST("/list", controllers.AdminListUsers)
			userGroup.POST("/update", controllers.AdminUpdateUser)
			userGroup.POST("/reset-password", controllers.AdminResetUserPassword)
			userGroup.POST("/delete", controllers.AdminDeleteUser)
		}

		// 管理员队伍管理接口
		teamGroup := auth.Group("/admin/team")
		{
			teamGroup.POST("/list", controllers.AdminListTeams)
			teamGroup.POST("/approve", controllers.AdminApproveTeam)
			teamGroup.POST("/ban", controllers.AdminBanTeam)
			teamGroup.POST("/unban", controllers.AdminUnbanTeam)
			teamGroup.POST("/delete", controllers.AdminDeleteTeam)
		}

		// 管理员游戏管理接口
		gameGroup := auth.Group("/admin/game")
		{
			gameGroup.POST("/list", controllers.AdminListGames)
			gameGroup.POST("/create", controllers.AdminCreateGame)

			gameGroup.GET("/:game_id", controllers.PathParmsMiddlewareBuilder("G"), controllers.AdminGetGame)
			gameGroup.PUT("/:game_id", controllers.PathParmsMiddlewareBuilder("G"), controllers.AdminUpdateGame)

			// gamechallenges 操作接口
			gameGroup.GET("/:game_id/challenge/:challenge_id", controllers.PathParmsMiddlewareBuilder("GC[Challenge]"), controllers.AdminGetGameChallenge)
			gameGroup.PUT("/:game_id/challenge/:challenge_id", controllers.PathParmsMiddlewareBuilder("G|GC"), controllers.AdminUpdateGameChallenge)
			gameGroup.POST("/:game_id/challenge/:challenge_id", controllers.PathParmsMiddlewareBuilder("g|C"), controllers.AdminAddGameChallenge)
			gameGroup.DELETE("/:game_id/challenge/:challenge_id", controllers.PathParmsMiddlewareBuilder("g|c"), controllers.AdminDeleteGameChallenge)

			gameGroup.POST("/:game_id/submits", controllers.AdminGetSubmits)
			gameGroup.POST("/:game_id/cheats", controllers.AdminGetCheats)

			// 比赛海报上传路由
			gameGroup.POST("/:game_id/poster/upload", controllers.AdminUploadGamePoster)

			// 分组管理路由
			gameGroup.GET("/:game_id/groups", controllers.AdminGetGameGroups)
			gameGroup.POST("/:game_id/groups", controllers.AdminCreateGameGroup)
			gameGroup.PUT("/:game_id/groups/:group_id", controllers.AdminUpdateGameGroup)
			gameGroup.DELETE("/:game_id/groups/:group_id", controllers.AdminDeleteGameGroup)

			// 公告管理路由
			gameGroup.POST("/:game_id/notices", controllers.AdminCreateNotice)
			gameGroup.POST("/:game_id/notices/list", controllers.AdminListNotices)
			gameGroup.DELETE("/notices", controllers.AdminDeleteNotice)

			// 分数修正管理路由
			gameGroup.GET("/:game_id/score-adjustments", controllers.AdminGetGameScoreAdjustments)
			gameGroup.POST("/:game_id/score-adjustments", controllers.AdminCreateScoreAdjustment)
			gameGroup.PUT("/:game_id/score-adjustments/:adjustment_id", controllers.AdminUpdateScoreAdjustment)
			gameGroup.DELETE("/:game_id/score-adjustments/:adjustment_id", controllers.AdminDeleteScoreAdjustment)

			// 题目解题记录管理路由
			gameGroup.POST("/:game_id/challenge/:challenge_id/solves/delete", controllers.AdminDeleteChallengeSolves)
		}

		// 用户比赛访问相关接口
		userGameGroup := auth.Group("/game")
		userGameGroup.Use(defaultGzipMiddleware)
		userGameGroup.Use(controllers.EmailVerifiedMiddleware())
		{
			// 获取比赛的题目列表
			userGameGroup.GET("/:game_id/challenges", controllers.GameStatusMiddleware(controllers.GameStatusMiddlewareProps{
				VisibleAfterEnded: false,
				CheckGameStarted:  true,
			}), controllers.TeamStatusMiddleware(), controllers.UserGetGameChallenges)

			// 查询比赛中的某道题
			userGameGroup.GET("/:game_id/challenge/:challenge_id", controllers.GameStatusMiddleware(controllers.GameStatusMiddlewareProps{
				VisibleAfterEnded: false,
				CheckGameStarted:  true,
			}), controllers.TeamStatusMiddleware(), controllers.ChallengeStatusCheckMiddleWare(true), controllers.UserGetGameChallenge)

			// 比赛通知接口
			userGameGroup.GET("/:game_id/notices", cache.CacheByRequestURI(memoryStore, 1*time.Second), controllers.GameStatusMiddleware(controllers.GameStatusMiddlewareProps{
				VisibleAfterEnded: false,
				CheckGameStarted:  true,
			}), controllers.TeamStatusMiddleware(), controllers.UserGetGameNotices)

			// 用户获取分组列表（公开接口，用于创建团队时选择分组）
			userGameGroup.GET("/:game_id/groups", controllers.GameStatusMiddleware(controllers.GameStatusMiddlewareProps{
				VisibleAfterEnded: true,
				CheckGameStarted:  false,
			}), controllers.UserGetGameGroups)

			// 组邀请码路由
			userGameGroup.POST("/:game_id/group/invite-code", controllers.GameStatusMiddleware(controllers.GameStatusMiddlewareProps{
				VisibleAfterEnded: true,
				CheckGameStarted:  false,
			}), controllers.PayloadValidator(webmodels.UserGetGroupInviteCodeGroupPayload{}), controllers.UserGetGroupInviteCodeGroup)

			// 创建比赛队伍
			userGameGroup.POST("/:game_id/createTeam", controllers.GameStatusMiddleware(controllers.GameStatusMiddlewareProps{
				VisibleAfterEnded: false,
				CheckGameStarted:  false,
			}), controllers.UserCreateGameTeam)

			// 题目容器
			userGameGroup.POST("/:game_id/container/:challenge_id", RateLimiter(100, 100*time.Millisecond), controllers.GameStatusMiddleware(controllers.GameStatusMiddlewareProps{
				VisibleAfterEnded: false,
				CheckGameStarted:  true,
			}), controllers.TeamStatusMiddleware(), controllers.ChallengeStatusCheckMiddleWare(false), controllers.UserCreateGameContainer)
			userGameGroup.DELETE("/:game_id/container/:challenge_id", controllers.GameStatusMiddleware(controllers.GameStatusMiddlewareProps{
				VisibleAfterEnded: false,
				CheckGameStarted:  true,
			}), controllers.TeamStatusMiddleware(), controllers.UserCloseGameContainer)
			userGameGroup.PATCH("/:game_id/container/:challenge_id", controllers.GameStatusMiddleware(controllers.GameStatusMiddlewareProps{
				VisibleAfterEnded: false,
				CheckGameStarted:  true,
			}), controllers.TeamStatusMiddleware(), controllers.ChallengeStatusCheckMiddleWare(false), controllers.UserExtendGameContainer)
			userGameGroup.GET("/:game_id/container/:challenge_id", controllers.GameStatusMiddleware(controllers.GameStatusMiddlewareProps{
				VisibleAfterEnded: false,
				CheckGameStarted:  true,
			}), controllers.TeamStatusMiddleware(), controllers.UserGetGameChallengeContainerInfo)

			// 提交 Flag
			userGameGroup.POST("/:game_id/flag/:challenge_id", ratelimiter.RateLimiter(100, 100*time.Millisecond), controllers.PayloadValidator(
				webmodels.UserSubmitFlagPayload{},
			), controllers.GameStatusMiddleware(controllers.GameStatusMiddlewareProps{
				VisibleAfterEnded: false,
				CheckGameStarted:  true,
			}), controllers.TeamStatusMiddleware(), controllers.ChallengeStatusCheckMiddleWare(false), controllers.UserGameChallengeSubmitFlag)
			userGameGroup.GET("/:game_id/flag/:judge_id", controllers.GameStatusMiddleware(controllers.GameStatusMiddlewareProps{
				VisibleAfterEnded: false,
				CheckGameStarted:  true,
			}), controllers.TeamStatusMiddleware(), controllers.UserGameGetJudgeResult)
		}

		// 实时通知服务
		auth.GET("/hub", func(c *gin.Context) {
			// 在升级为WebSocket前获取查询参数
			gameID := c.Query("game")
			if gameID == "" {
				c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"error": "game parameter is required"})
				return
			}

			// 处理WebSocket连接
			dbtool.Melody().HandleRequestWithKeys(c.Writer, c.Request, map[string]interface{}{
				"gameID": gameID,
			})
		})

		// 容器 Exec /bin/sh
		auth.GET("/pod/:pod_name/:container_name/exec", controllers.AdminHandleContainerExec)

		containerGroup := auth.Group("/admin/container")
		{
			containerGroup.POST("/list", controllers.AdminListContainers)
			containerGroup.POST("/delete", controllers.AdminDeleteContainer)
			containerGroup.POST("/extend", controllers.AdminExtendContainer)
			containerGroup.GET("/flag", controllers.AdminGetContainerFlag)
		}

		// 系统设置相关API
		systemGroup := auth.Group("/admin/system")
		{
			systemGroup.GET("/settings", controllers.GetSystemSettings)
			systemGroup.POST("/settings", controllers.UpdateSystemSettings)
			systemGroup.POST("/upload", controllers.UploadSystemFile)
			systemGroup.POST("/test-smtp", controllers.TestSMTPSettings)

			systemGroup.GET("/logs", controllers.GetSystemLogs)
			systemGroup.GET("/logs/stats", controllers.GetSystemLogStats)
		}
	}
	// 资源文件
	// 为 /assets 启用预压缩（优先 .br 其后 .gz），否则回退到原文件
	r.GET("/assets/*filepath", getPreCompressedFilePath("./clientapp/build/client/assets"))
	r.StaticFile("/css/github-markdown-dark.css", "./clientapp/build/client/css/github-markdown-dark.css")
	r.StaticFile("/css/github-markdown-light.css", "./clientapp/build/client/css/github-markdown-light.css")
	r.StaticFile("/favicon.ico", viper.GetString("system.favicon"))
	r.StaticFile("/js/cap_wasm.min.js", "./clientapp/build/client/js/cap_wasm.min.js")
	// r.Static("/images", "./clientapp/build/client/images")
	// r.Static("/locales", "./clientapp/build/client/locales")
	r.GET("/images/*filepath", getPreCompressedFilePath("./clientapp/build/client/images"))
	r.GET("/locales/*filepath", getPreCompressedFilePath("./clientapp/build/client/locales"))

	r.NoRoute(func(c *gin.Context) {
		if clientconfig.ClientConfig.GameActivityMode != "" {
			if c.Request.RequestURI == "/" || c.Request.RequestURI == "/games" || c.Request.RequestURI == "/games/" {
				c.Redirect(http.StatusFound, fmt.Sprintf("/games/%s/info", clientconfig.ClientConfig.GameActivityMode))
				return
			}
		}
		c.File("./clientapp/build/client/index.html")
	})

	// 启动任务线程
	StartLoopEvent()

	// 创建HTTP服务器
	srv := &http.Server{
		Addr:    fmt.Sprintf("%s:%s", viper.GetString("system.gin-host"), viper.GetString("system.gin-port")),
		Handler: r,
	}

	// 在独立的goroutine中启动服务器
	go func() {
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Failed to start server: %v", err)
		}
	}()

	zaphelper.Sugar.Infof("Server started on %s", srv.Addr)

	// 等待中断信号以优雅地关闭服务器
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	zaphelper.Logger.Info("Shutting down server...")

	tasks.CloseTaskQueue()

	// 设置关闭超时时间
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	// 关闭缓存
	ristretto_tool.CloseCachePool()

	// 关闭HTTP服务器
	if err := srv.Shutdown(ctx); err != nil {
		log.Fatal("Server forced to shutdown:", err)
	}

	zaphelper.Logger.Info("Server exiting")
}

func getPreCompressedFilePath(root string) gin.HandlerFunc {
	return func(c *gin.Context) {
		requested := c.Param("filepath") // 以 / 开头
		clean := filepath.Clean(requested)
		if clean == "." || clean == "/" {
			c.Status(http.StatusNotFound)
			return
		}
		origPath := filepath.Join(root, clean)

		acceptEnc := c.GetHeader("Accept-Encoding")
		// 优先 brotli，再 gzip
		var compressedPath string
		var encoding string
		if strings.Contains(acceptEnc, "br") {
			if _, err := os.Stat(origPath + ".br"); err == nil {
				compressedPath = origPath + ".br"
				encoding = "br"
			}
		}
		if compressedPath == "" && strings.Contains(acceptEnc, "gzip") {
			if _, err := os.Stat(origPath + ".gz"); err == nil {
				compressedPath = origPath + ".gz"
				encoding = "gzip"
			}
		}

		if compressedPath != "" {
			// 根据原始扩展名设置正确的 Content-Type
			if ct := mime.TypeByExtension(filepath.Ext(origPath)); ct != "" {
				c.Header("Content-Type", ct)
			}
			c.Header("Content-Encoding", encoding)
			c.Header("Vary", "Accept-Encoding")
			c.File(compressedPath)
			return
		}

		// 未找到预压缩文件则回退到原文件
		c.File(origPath)
	}
}
