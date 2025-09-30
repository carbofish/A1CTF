package tasks

import (
	"a1ctf/src/utils/zaphelper"
	"log"

	"github.com/hibiken/asynq"
	"github.com/spf13/viper"
)

var client *asynq.Client
var server *asynq.Server
var inspector *asynq.Inspector

func InitTaskQueue() {
	redisAddr := viper.GetString("redis.address")
	redisUsername := viper.GetString("redis.username")
	redisPassword := viper.GetString("redis.password")
	redisDB := viper.GetInt("redis.db")

	redisOpt := asynq.RedisClientOpt{
		Addr:     redisAddr,
		Username: redisUsername,
		Password: redisPassword,
		DB:       redisDB,
	}

	client = asynq.NewClient(redisOpt)

	inspector = asynq.NewInspector(redisOpt)

	go func() {
		// start a queue server
		server = asynq.NewServer(
			redisOpt,
			asynq.Config{
				// Specify how many concurrent workers to use
				Concurrency: 20,
				// Optionally specify multiple queues with different priority.
				Queues: map[string]int{
					"critical": 6,
					"default":  3,
					"low":      1,
				},
				StrictPriority: true,
				Logger:         zaphelper.NewZapLogger(zaphelper.Logger),
				// See the godoc for other configuration options
			},
		)

		mux := asynq.NewServeMux()
		mux.HandleFunc(TypeNewTeamFlag, HandleTeamCreateTask)
		mux.HandleFunc(TypeNewSystemLog, HandleSystemLogTask)

		mux.HandleFunc(TypeStartContainer, HandleContainerStartTask)
		mux.HandleFunc(TypeStopContainer, HandleContainerStopTask)
		mux.HandleFunc(TypeContainerFailedOperation, HandleContainerFailedTask)

		mux.HandleFunc(TypeAntiCheat, HandleFlagAntiCheatTask)
		mux.HandleFunc(TypeSendMail, HandleSendMailTask)

		mux.HandleFunc(TypeRecalculateRankForAChallenge, HandleRecalculateRankForAChallengeTask)

		if err := server.Run(mux); err != nil {
			log.Fatalf("could not run server: %v", err)
		}
	}()
}

func CloseTaskQueue() {
	client.Close()
	server.Shutdown()
}

const (
	TypeNewTeamFlag                  = "teamFlag:create"
	TypeNewSystemLog                 = "systemLog:create"
	TypeJudgeFlag                    = "judgeFlag:create"
	TypeCalculateRanks               = "ranks:calculate"
	TypeStartContainer               = "container:start"
	TypeStopContainer                = "container:stop"
	TypeContainerFailedOperation     = "container:failed"
	TypeAntiCheat                    = "flag:anticheat"
	TypeSendMail                     = "mail:send"
	TypeRecalculateRankForAChallenge = "other:recalculateForAChallenge"
)
