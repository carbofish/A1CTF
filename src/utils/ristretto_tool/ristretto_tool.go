package ristretto_tool

import (
	"a1ctf/src/db/models"
	dbtool "a1ctf/src/utils/db_tool"
	"a1ctf/src/webmodels"
	"errors"
	"fmt"
	"log"
	"math"
	"math/rand"
	"sort"
	"time"

	"github.com/dgraph-io/ristretto/v2"
	"github.com/spf13/viper"
	"golang.org/x/sync/singleflight"
	"gorm.io/gorm"
)

var cachePool *ristretto.Cache[string, interface{}]

// 全局singleflight组，用于防止缓存击穿
var sfGroup singleflight.Group

func InitCachePool() {
	cache, err := ristretto.NewCache(&ristretto.Config[string, interface{}]{
		NumCounters: 1e7,     // number of keys to track frequency of (10M).
		MaxCost:     1 << 30, // maximum cost of cache (1GB).
		BufferItems: 64,      // number of keys per Get buffer.
	})
	if err != nil {
		panic(err)
	}
	cachePool = cache
}

func CloseCachePool() {
	cachePool.Close()
}

// 使用singleflight防止缓存击穿
func GetOrCacheSingleFlight(key string, callback func() (interface{}, error), cacheTime time.Duration, enableRandomTime bool) (interface{}, error) {
	// 1. 尝试从缓存获取数据
	value, found := cachePool.Get(key)
	if found {
		return value, nil
	}

	// 2. 缓存未命中，使用singleflight防止缓存击穿
	// singleflight确保同一个key只有一个goroutine执行回调函数
	result, err, _ := sfGroup.Do(key, func() (interface{}, error) {
		// 双重检查，避免在等待期间其他goroutine已经设置了缓存
		value, found := cachePool.Get(key)
		if found {
			// 缓存已存在，直接返回序列化的字节数据
			return value, nil
		}

		// 执行回调获取数据
		data, err := callback()
		if err != nil {
			return nil, err
		}

		// 设置随机过期时间，避免同时大量过期
		expireTime := cacheTime
		if enableRandomTime {
			expireTime += time.Duration(rand.Intn(100)) * time.Millisecond
		}

		cachePool.SetWithTTL(key, data, 1, expireTime)

		return data, nil
	})

	if err != nil {
		return nil, err
	}

	// 将结果反序列化到model中
	return result, nil
}

// 这里设置 redis 的缓存时间
var userListCacheTime = time.Duration(0)
var fileListCacheTime = time.Duration(0)
var solvedChallengesForGameCacheTime = time.Duration(0)
var gameInfoCacheTime = time.Duration(0)
var allTeamsForGameCacheTime = time.Duration(0)
var gameScoreBoardCacheTime = time.Duration(0)
var challengesForGameCacheTime = time.Duration(0)
var challengeDetailCacheTime = time.Duration(0)
var containerStatusCacheTime = time.Duration(0)
var teamFlagCacheTime = time.Duration(0)
var teamSolveStatusCacheTime = time.Duration(0)
var judgeResultCacheTime = time.Duration(0)

func LoadCacheTime() {
	userListCacheTime = viper.GetDuration("cache-time.user-list")
	fileListCacheTime = viper.GetDuration("cache-time.upload-list")
	solvedChallengesForGameCacheTime = viper.GetDuration("cache-time.solved-challenges-for-game")
	gameInfoCacheTime = viper.GetDuration("cache-time.game-info")
	allTeamsForGameCacheTime = viper.GetDuration("cache-time.all-teams-for-game")
	gameScoreBoardCacheTime = viper.GetDuration("cache-time.game-scoreboard")
	challengesForGameCacheTime = viper.GetDuration("cache-time.challenges-for-game")
	challengeDetailCacheTime = viper.GetDuration("cache-time.challenge-detail")
	containerStatusCacheTime = viper.GetDuration("cache-time.container-status")
	teamFlagCacheTime = viper.GetDuration("cache-time.team-flag")
	teamSolveStatusCacheTime = viper.GetDuration("cache-time.team-solve-status")
	judgeResultCacheTime = viper.GetDuration("cache-time.judge-result")
}

func CachedMemberSearchTeamMap(gameID int64) (map[string]models.Team, error) {
	var memberBelongSearchMap map[string]models.Team = make(map[string]models.Team)

	obj, err := GetOrCacheSingleFlight(fmt.Sprintf("all_teams_for_game_%d", gameID), func() (interface{}, error) {
		var allTeams []models.Team
		if err := dbtool.DB().Where("game_id = ?", gameID).Preload("Group").Find(&allTeams).Error; err != nil {
			return nil, err
		}

		var adminTeam models.Team

		for _, team := range allTeams {
			if team.TeamType == models.TeamTypePlayer {
				for _, teamMember := range team.TeamMembers {
					memberBelongSearchMap[teamMember] = team
				}
			}
			if team.TeamType == models.TeamTypeAdmin {
				adminTeam = team
			}
		}

		// 处理下管理员，所有管理员默认属于系统创建的管理员队伍
		var allAdmins []models.User
		if err := dbtool.DB().Where("role = ?", models.UserRoleAdmin).Find(&allAdmins).Error; err != nil {
			return nil, err
		}

		for _, admin := range allAdmins {
			memberBelongSearchMap[admin.UserID] = adminTeam
		}

		return memberBelongSearchMap, nil
	}, allTeamsForGameCacheTime, true)

	if err != nil {
		return nil, err
	}

	memberBelongSearchMap = obj.(map[string]models.Team)

	return memberBelongSearchMap, nil
}

func CachedMemberMap() (map[string]models.User, error) {
	var allUserMap map[string]models.User = make(map[string]models.User)

	obj, err := GetOrCacheSingleFlight("user_list", func() (interface{}, error) {
		var allUsers []models.User

		if err := dbtool.DB().Find(&allUsers).Error; err != nil {
			return nil, err
		}

		for _, user := range allUsers {
			allUserMap[user.UserID] = user
		}

		return allUserMap, nil
	}, userListCacheTime, true)

	if err != nil {
		return nil, err
	}

	allUserMap = obj.(map[string]models.User)

	return allUserMap, nil
}

func CachedFileMap() (map[string]models.Upload, error) {
	var filesMap map[string]models.Upload = make(map[string]models.Upload)

	obj, err := GetOrCacheSingleFlight("file_list", func() (interface{}, error) {
		var files []models.Upload
		dbtool.DB().Find(&files)

		for _, file := range files {
			filesMap[file.FileID] = file
		}

		return filesMap, nil
	}, fileListCacheTime, true)

	if err != nil {
		return nil, err
	}

	filesMap = obj.(map[string]models.Upload)

	return filesMap, nil
}

func CachedSolvedChallengesForGame(gameID int64) (map[int64][]models.Solve, error) {
	var solveMap map[int64][]models.Solve = make(map[int64][]models.Solve)

	obj, err := GetOrCacheSingleFlight(fmt.Sprintf("solved_challenges_for_game_%d", gameID), func() (interface{}, error) {
		var totalSolves []models.Solve

		if err := dbtool.DB().Where("game_id = ? AND solve_status = ?", gameID, models.SolveCorrect).Preload("Challenge").Find(&totalSolves).Error; err != nil {
			return nil, err
		}

		for _, solve := range totalSolves {
			lastSolves, ok := solveMap[solve.TeamID]
			if !ok {
				lastSolves = make([]models.Solve, 0)
			}

			lastSolves = append(lastSolves, solve)
			solveMap[solve.TeamID] = lastSolves
		}

		return solveMap, nil
	}, solvedChallengesForGameCacheTime, true)

	if err != nil {
		return nil, err
	}

	solveMap = obj.(map[int64][]models.Solve)

	return solveMap, nil
}

func CachedGameInfo(gameID int64) (*models.Game, error) {
	var game models.Game

	obj, err := GetOrCacheSingleFlight(fmt.Sprintf("game_info_%d", gameID), func() (interface{}, error) {
		if err := dbtool.DB().Where("game_id = ?", gameID).First(&game).Error; err != nil {
			if err == gorm.ErrRecordNotFound {
				return nil, errors.New("game not found")
			} else {
				return nil, err
			}
		}

		return game, nil
	}, gameInfoCacheTime, true)

	if err != nil {
		return nil, err
	}

	game = obj.(models.Game)

	return &game, nil
}

func filterValidSolves(solves []models.Solve) []models.Solve {
	var filtered []models.Solve
	for _, solve := range solves {
		if solve.Team.TeamStatus == models.ParticipateApproved {
			filtered = append(filtered, solve)
		}
	}
	return filtered
}

func CalculateGameScoreBoard(gameID int64) (*webmodels.CachedGameScoreBoardData, error) {
	var cachedData webmodels.CachedGameScoreBoardData

	// 获取用户信息
	users, err := CachedMemberMap()
	if err != nil {
		return nil, err
	}

	var game models.Game
	if err := dbtool.DB().Where("game_id = ?", gameID).First(&game).Error; err != nil {
		return nil, errors.New("failed to load game")
	}

	var finalScoreBoardMap map[int64]webmodels.TeamScoreItem = make(map[int64]webmodels.TeamScoreItem)
	var timeLines []webmodels.TimeLineItem = make([]webmodels.TimeLineItem, 0)

	// 获取所有队伍，排除掉 Admin 队伍
	var teams []models.Team
	if err := dbtool.DB().Where("game_id = ? AND team_status = ? AND team_type = ?", gameID, models.ParticipateApproved, models.TeamTypePlayer).Preload("Group").Find(&teams).Error; err != nil {
		return nil, errors.New("failed to load teams")
	}

	// 获取所有解题记录, 仅在比赛时间内
	var solves []models.Solve
	if err := dbtool.DB().Where(`game_id = ? 
	AND solve_time >= ? 
	AND solve_time <= ?`, gameID, game.StartTime, game.EndTime).
		Preload("GameChallenge").
		Preload("Solver").
		Preload("Challenge").
		Preload("Game").
		Preload("Team").
		Order("solve_time ASC").
		Find(&solves).Error; err != nil {
		return nil, errors.New("failed to load solves")
	}

	solves = filterValidSolves(solves)

	// 计算每道题的首杀时间
	firstSolveTime := make(map[int64]time.Time) // challengeID -> 首杀时间
	for _, solve := range solves {
		if _, exists := firstSolveTime[solve.ChallengeID]; !exists {
			firstSolveTime[solve.ChallengeID] = solve.SolveTime
		}
	}

	// 计算每个队伍的总分和罚时
	teamDataMap := make(map[int64]webmodels.TeamScoreItem)

	// 初始化队伍数据
	for _, team := range teams {

		// 获取成员信息
		teamMemberDetail := make([]webmodels.TeamMemberInfo, 0)

		for idx, teamMember := range team.TeamMembers {
			if member, exists := users[teamMember]; exists {
				// 第一个是队长
				teamMemberDetail = append(teamMemberDetail, webmodels.TeamMemberInfo{
					Avatar:   member.Avatar,
					UserName: member.Username,
					UserID:   member.UserID,
					Captain:  idx == 0,
				})
			}
		}

		var groupName *string = nil

		if team.Group != nil {
			groupName = &team.Group.GroupName
		}

		teamDataMap[team.TeamID] = webmodels.TeamScoreItem{
			TeamID:           team.TeamID,
			TeamName:         team.TeamName,
			TeamAvatar:       team.TeamAvatar,
			Members:          teamMemberDetail,
			TeamSlogan:       team.TeamSlogan,
			TeamDescription:  team.TeamDescription,
			GroupID:          team.GroupID,
			GroupName:        groupName,
			Score:            0,
			Penalty:          0,
			SolvedChallenges: make([]webmodels.TeamSolveItem, 0),
			ScoreAdjustments: make([]webmodels.TeamScoreAdjustmentItem, 0),
			LastSolveTime:    0,
		}
	}

	// 计算每个队伍的分数和罚时
	for _, solve := range solves {
		if !solve.GameChallenge.Visible {
			continue
		}

		if teamData, exists := teamDataMap[solve.TeamID]; exists {
			// 计算罚时（解题时间 - 首杀时间，单位：秒）
			penalty := int64(0)
			if firstTime, ok := firstSolveTime[solve.ChallengeID]; ok {
				penalty = int64(solve.SolveTime.Sub(firstTime).Seconds())
			}

			challengeScore := solve.GameChallenge.CurScore
			rewardScore := 0.0

			// 这里计算分数了，处理一下三血
			if solve.GameChallenge.BloodRewardEnabled && solve.Rank <= 3 {

				var rewardReason string
				// 三血对于的奖励分数比例是否开启
				var rankRewardEnabled bool = false

				switch solve.Rank {
				case 3:
					rewardScore = float64(solve.Game.ThirdBloodReward) * solve.GameChallenge.CurScore / 100
					rewardReason = "Third Blood Reward"
					if solve.Game.ThirdBloodReward != 0 {
						rankRewardEnabled = true
					}
				case 2:
					rewardScore = float64(solve.Game.SecondBloodReward) * solve.GameChallenge.CurScore / 100
					rewardReason = "Second Blood Reward"
					if solve.Game.SecondBloodReward != 0 {
						rankRewardEnabled = true
					}
				case 1:
					rewardScore = float64(solve.Game.FirstBloodReward) * solve.GameChallenge.CurScore / 100
					rewardReason = "First Blood Reward"
					if solve.Game.FirstBloodReward != 0 {
						rankRewardEnabled = true
					}
				}

				if rankRewardEnabled {
					rewardScore = math.Max(math.Floor(rewardScore), 1)

					rewardReason = fmt.Sprintf("%s for %s", rewardReason, solve.Challenge.Name)

					adjustment := webmodels.TeamScoreAdjustmentItem{
						AdjustmentID:   -1,
						AdjustmentType: string(models.AdjustmentTypeReward),
						ScoreChange:    rewardScore,
						Reason:         rewardReason,
						CreatedAt:      solve.SolveTime,
					}

					challengeScore += rewardScore

					// 往前端添加三血的加分记录
					teamData.ScoreAdjustments = append(teamData.ScoreAdjustments, adjustment)
				}
			}

			teamData.Score += challengeScore
			teamData.Penalty += penalty

			// 插入解题记录
			teamData.SolvedChallenges = append(teamData.SolvedChallenges, webmodels.TeamSolveItem{
				ChallengeID:   solve.ChallengeID,
				Score:         challengeScore,
				Solver:        solve.Solver.Username,
				Rank:          int64(solve.Rank),
				SolveTime:     solve.SolveTime,
				BloodReward:   rewardScore,
				ChallengeName: solve.Challenge.Name,
			})

			// 更新最后解题时间
			if teamData.LastSolveTime < solve.SolveTime.UnixMilli() {
				teamData.LastSolveTime = solve.SolveTime.UnixMilli()
			}

			teamDataMap[solve.TeamID] = teamData
		}
	}

	// 获取并应用分数修正
	var adjustments []models.ScoreAdjustment
	if err := dbtool.DB().Where("game_id = ?", gameID).Find(&adjustments).Error; err != nil {
		return nil, errors.New("failed to load score adjustments")
	}

	// 应用分数修正到队伍数据
	for _, adjustment := range adjustments {
		if teamData, exists := teamDataMap[adjustment.TeamID]; exists {
			// 应用修正
			teamData.Score += adjustment.ScoreChange

			// 添加分数修正到队伍的分数修正列表
			if teamData.ScoreAdjustments == nil {
				teamData.ScoreAdjustments = make([]webmodels.TeamScoreAdjustmentItem, 0)
			}
			teamData.ScoreAdjustments = append(teamData.ScoreAdjustments, webmodels.TeamScoreAdjustmentItem{
				AdjustmentID:   adjustment.AdjustmentID,
				AdjustmentType: string(adjustment.AdjustmentType),
				ScoreChange:    adjustment.ScoreChange,
				Reason:         adjustment.Reason,
				CreatedAt:      adjustment.CreatedAt,
			})
			teamDataMap[adjustment.TeamID] = teamData
		}
	}

	// 转换为切片并排序
	teamRankings := make([]webmodels.TeamScoreItem, 0, len(teamDataMap))
	for _, teamData := range teamDataMap {
		teamRankings = append(teamRankings, teamData)
	}

	// 使用 sort.Slice 进行多条件排序：
	// 1. 总分降序（分数高的排前面）
	// 2. 总分相同时，罚时升序（罚时少的排前面）
	// 3. 罚时相同时，最后解题时间升序（解题时间早的排前面）
	// 4. 最后比较队伍名称（升序，字典序小的排前面）... 这个应该不会出现
	sort.Slice(teamRankings, func(i, j int) bool {
		teamI, teamJ := teamRankings[i], teamRankings[j]

		// 先比较总分（降序）
		if teamI.Score != teamJ.Score {
			return teamI.Score > teamJ.Score
		}

		// 总分相同时比较罚时（升序，罚时少的排前面）
		if teamI.Penalty != teamJ.Penalty {
			return teamI.Penalty < teamJ.Penalty
		}

		// 罚时相同时比较最后解题时间（升序，解题时间早的排前面）
		if teamI.LastSolveTime != teamJ.LastSolveTime {
			return teamI.LastSolveTime < teamJ.LastSolveTime
		}

		// 比较队伍 ID。。。
		return teamI.TeamID < teamJ.TeamID
	})

	processedTeamRankings := make([]webmodels.TeamScoreItem, 0, len(teamDataMap))

	// 设置排名
	for i, teamData := range teamRankings {
		teamData.Rank = int64(i + 1)
		tmp := webmodels.TeamScoreItem{
			TeamID:           teamData.TeamID,
			TeamName:         teamData.TeamName,
			TeamAvatar:       teamData.TeamAvatar,
			TeamSlogan:       teamData.TeamSlogan,
			TeamDescription:  teamData.TeamDescription,
			Rank:             teamData.Rank,
			Score:            teamData.Score,
			Members:          teamData.Members,
			Penalty:          teamData.Penalty,
			SolvedChallenges: teamData.SolvedChallenges,
			ScoreAdjustments: teamData.ScoreAdjustments,
			GroupID:          teamData.GroupID,
			GroupName:        teamData.GroupName,
		}
		finalScoreBoardMap[teamData.TeamID] = tmp
		processedTeamRankings = append(processedTeamRankings, tmp)
	}

	cachedData.TeamRankings = processedTeamRankings

	// 获取 TOP10
	idx := 0
	top10Teams := make([]webmodels.TeamScoreItem, 0, min(10, len(teamRankings)))
	for _, teamData := range teamRankings {
		top10Teams = append(top10Teams, webmodels.TeamScoreItem{
			TeamID:           teamData.TeamID,
			TeamName:         teamData.TeamName,
			TeamAvatar:       teamData.TeamAvatar,
			TeamSlogan:       teamData.TeamSlogan,
			TeamDescription:  teamData.TeamDescription,
			Rank:             teamData.Rank,
			Score:            teamData.Score,
			Members:          teamData.Members,
			Penalty:          teamData.Penalty,
			SolvedChallenges: teamData.SolvedChallenges,
			ScoreAdjustments: teamData.ScoreAdjustments,
			GroupID:          teamData.GroupID,
			GroupName:        teamData.GroupName,
		})
		// 防止队伍数量少于 10报错
		idx += 1
		if idx == 10 {
			break
		}
	}

	// 构建时间线数据（基于原有的 scoreboard 数据）
	// 初始化 团队 ID 列表
	var participatedTeamIDs []int64
	for _, team := range teams {
		participatedTeamIDs = append(participatedTeamIDs, team.TeamID)
	}

	// 获取上述队伍的积分榜
	var teamGameScoreborad []models.ScoreBoard = make([]models.ScoreBoard, 0)
	var teamGameScoreboardMap map[int64]models.ScoreBoard = make(map[int64]models.ScoreBoard)
	if err := dbtool.DB().Model(&models.ScoreBoard{}).Where("game_id = ? AND team_id IN ?", gameID, participatedTeamIDs).Find(&teamGameScoreborad).Error; err != nil {
		return nil, errors.New("failed to load gameScoreBoard for game")
	}

	for _, scoreboard := range teamGameScoreborad {
		// 顺便根据记录时间排序好
		sort.Slice(scoreboard.Data, func(i, j int) bool {
			return scoreboard.Data[i].RecordTime.Before(scoreboard.Data[j].RecordTime)
		})

		// 过滤掉超出比赛时间的积分榜
		// filteredScoreboard := make(models.ScoreBoardDatas, 0)
		// for _, record := range scoreboard.Data {
		// 	if record.RecordTime.After(game.StartTime) && record.RecordTime.Before(game.EndTime) {
		// 		filteredScoreboard = append(filteredScoreboard, record)
		// 	}
		// }

		// scoreboard.Data = filteredScoreboard

		teamGameScoreboardMap[scoreboard.TeamID] = scoreboard
	}

	if len(teamGameScoreborad) == 0 {
		// 没有积分榜数据就初始化个新的
		timeLines = make([]webmodels.TimeLineItem, 0)
		cachedData.AllTimeLines = make([]webmodels.TimeLineItem, 0)
	} else {
		// 构建 TOP10 的时间线
		timeLineMap := make(map[int64]webmodels.TimeLineItem)
		prevScoreMap := make(map[int64]float64)

		for _, team := range top10Teams {
			teamID := team.TeamID

			tmpTimeLine := webmodels.TimeLineItem{
				TeamID:   teamID,
				TeamName: team.TeamName,
				Scores:   make([]webmodels.TimeLineScoreItem, 0),
			}

			scoreboard, exists := teamGameScoreboardMap[teamID]
			if !exists {
				timeLineMap[teamID] = tmpTimeLine
				continue
			}

			for _, record := range scoreboard.Data {
				lastScore, valid := prevScoreMap[teamID]
				if !valid || lastScore != record.Score {
					tmpTimeLine.Scores = append(tmpTimeLine.Scores, webmodels.TimeLineScoreItem{
						RecordTime: record.RecordTime.UnixMilli(),
						Score:      record.Score,
					})
					prevScoreMap[teamID] = record.Score
				}
			}

			timeLineMap[teamID] = tmpTimeLine
		}

		// 构建所有队伍的时间线
		allTimeLineMap := make(map[int64]webmodels.TimeLineItem)
		allPrevScoreMap := make(map[int64]float64)

		// 初始化所有队伍的时间线
		for _, team := range teams {
			teamID := team.TeamID

			if teamData, ok := teamDataMap[team.TeamID]; ok {
				tmpTimeLine := webmodels.TimeLineItem{
					TeamID:   team.TeamID,
					TeamName: teamData.TeamName,
					Scores:   make([]webmodels.TimeLineScoreItem, 0),
				}

				scoreboard, exists := teamGameScoreboardMap[teamID]
				if !exists {
					allTimeLineMap[team.TeamID] = tmpTimeLine
					continue
				}

				for _, record := range scoreboard.Data {
					lastScore, valid := allPrevScoreMap[teamID]
					if !valid || lastScore != record.Score {
						tmpTimeLine.Scores = append(tmpTimeLine.Scores, webmodels.TimeLineScoreItem{
							RecordTime: record.RecordTime.UnixMilli(),
							Score:      record.Score,
						})
						allPrevScoreMap[teamID] = record.Score
					}
				}

				allTimeLineMap[team.TeamID] = tmpTimeLine
			}
		}

		// 转换 TOP10 时间线数据
		timeLines = make([]webmodels.TimeLineItem, 0, len(timeLineMap))
		for _, item := range timeLineMap {
			timeLines = append(timeLines, item)
		}

		// 按照最终排名排序时间线
		sort.Slice(timeLines, func(i, j int) bool {
			// 找到对应队伍的排名
			rankI, rankJ := 999999, 999999
			teamI, ok := finalScoreBoardMap[timeLines[i].TeamID]
			if ok {
				rankI = int(teamI.Rank)
			}
			teamJ, ok := finalScoreBoardMap[timeLines[j].TeamID]
			if ok {
				rankJ = int(teamJ.Rank)
			}
			return rankI < rankJ
		})

		// 转换所有队伍的时间线数据
		allTimeLines := make([]webmodels.TimeLineItem, 0, len(allTimeLineMap))
		for _, item := range allTimeLineMap {
			allTimeLines = append(allTimeLines, item)
		}

		// 按照最终排名排序所有队伍的时间线
		sort.Slice(allTimeLines, func(i, j int) bool {
			// 找到对应队伍的排名
			rankI, rankJ := 999999, 999999
			teamI, ok := finalScoreBoardMap[allTimeLines[i].TeamID]
			if ok {
				rankI = int(teamI.Rank)
			}
			teamJ, ok := finalScoreBoardMap[allTimeLines[j].TeamID]
			if ok {
				rankJ = int(teamJ.Rank)
			}
			return rankI < rankJ
		})

		// 将所有队伍的时间线数据存储到结构体中
		cachedData.AllTimeLines = allTimeLines
	}

	cachedData.FinalScoreBoardMap = finalScoreBoardMap
	cachedData.Top10TimeLines = timeLines
	cachedData.Top10Teams = top10Teams

	return &cachedData, nil
}

func MakeGameScoreBoardCache(gameID int64) error {
	cacheKey := fmt.Sprintf("game_scoreboard_%d", gameID)

	cachedData, err := CalculateGameScoreBoard(gameID)
	if err != nil {
		return err
	}

	cachePool.Set(cacheKey, cachedData, 1)
	return nil
}

func CachedGameScoreBoard(gameID int64) (*webmodels.CachedGameScoreBoardData, error) {
	cacheKey := fmt.Sprintf("game_scoreboard_%d", gameID)

	value, found := cachePool.Get(cacheKey)
	if found {
		return value.(*webmodels.CachedGameScoreBoardData), nil
	}

	// zaphelper.Logger.Error("Get scoreboard from cache failed", zap.String("cache_key", cacheKey))

	obj := webmodels.CachedGameScoreBoardData{
		TeamRankings:       make([]webmodels.TeamScoreItem, 0),
		AllTimeLines:       make([]webmodels.TimeLineItem, 0),
		Top10TimeLines:     make([]webmodels.TimeLineItem, 0),
		Top10Teams:         make([]webmodels.TeamScoreItem, 0),
		FinalScoreBoardMap: make(map[int64]webmodels.TeamScoreItem),
	}

	return &obj, nil
}

func CachedGameGroups(gameID int64) (map[int64]models.GameGroup, error) {
	var gameGroupsMap map[int64]models.GameGroup = make(map[int64]models.GameGroup)

	game, err := CachedGameInfo(gameID)
	if err != nil {
		return nil, err
	}

	obj, err := GetOrCacheSingleFlight(fmt.Sprintf("game_groups_for_game_%d", game.GameID), func() (interface{}, error) {
		// 查找分组
		var tmpGameMap map[int64]models.GameGroup = make(map[int64]models.GameGroup)
		var tmpGameGroups []models.GameGroup
		if err := dbtool.DB().Where("game_id = ?", game.GameID).Find(&tmpGameGroups).Error; err != nil {
			return nil, errors.New("failed to load game groups")
		}

		for _, group := range tmpGameGroups {
			tmpGameMap[group.GroupID] = group
		}

		return tmpGameMap, nil
	}, challengesForGameCacheTime, true)

	if err != nil {
		return nil, err
	}

	gameGroupsMap = obj.(map[int64]models.GameGroup)

	return gameGroupsMap, nil
}

func CachedGameSimpleChallenges(gameID int64) ([]webmodels.UserSimpleGameChallenge, error) {

	var simpleGameChallenges []webmodels.UserSimpleGameChallenge = make([]webmodels.UserSimpleGameChallenge, 0)

	game, err := CachedGameInfo(gameID)
	if err != nil {
		return nil, err
	}

	obj, err := GetOrCacheSingleFlight(fmt.Sprintf("challenges_for_game_%d", game.GameID), func() (interface{}, error) {
		// 查找队伍
		var tmpSimpleGameChallenges []webmodels.UserSimpleGameChallenge = make([]webmodels.UserSimpleGameChallenge, 0)
		var gameChallenges []models.GameChallenge

		// 使用 Preload 进行关联查询
		if err := dbtool.DB().Preload("Challenge").Where("game_id = ?", game.GameID).Find(&gameChallenges).Error; err != nil {
			log.Printf("%+v\n", err)
			return nil, errors.New("failed to load game challenges")
		}

		sort.Slice(gameChallenges, func(i, j int) bool {
			return gameChallenges[i].Challenge.Name < gameChallenges[j].Challenge.Name
		})

		curTime := time.Now()

		passedAndRunningStages := make(map[string]bool, 0)

		if game.Stages != nil {
			for _, stage := range *game.Stages {
				if stage.EndTime.Before(curTime) {
					passedAndRunningStages[stage.StageName] = true
				} else if stage.StartTime.Before(curTime) {
					passedAndRunningStages[stage.StageName] = true
				}
			}
		}

		for _, gc := range gameChallenges {

			if !gc.Visible {
				continue
			}

			if gc.BelongStage != nil {
				_, exists := passedAndRunningStages[*gc.BelongStage]
				if !exists {
					continue
				}
			}

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

		return tmpSimpleGameChallenges, nil
	}, challengesForGameCacheTime, true)

	// Cache challenge list to redis
	if err != nil {
		return nil, err
	}

	simpleGameChallenges = obj.([]webmodels.UserSimpleGameChallenge)

	return simpleGameChallenges, nil
}

// CachedGameGroupsWithTeamCount 缓存带队伍数量的分组信息
func CachedGameGroupsWithTeamCount(gameID int64) ([]webmodels.GameGroupSimple, error) {
	var gameGroupsWithTeamCount []webmodels.GameGroupSimple

	obj, err := GetOrCacheSingleFlight(fmt.Sprintf("game_groups_with_team_count_%d", gameID), func() (interface{}, error) {
		// 获取分组信息
		gameGroupMap, err := CachedGameGroups(gameID)
		if err != nil {
			return nil, err
		}

		// 获取排行榜数据
		scoreBoard, err := CachedGameScoreBoard(gameID)
		if err != nil {
			return nil, err
		}

		var result []webmodels.GameGroupSimple = make([]webmodels.GameGroupSimple, 0, len(gameGroupMap))
		for _, group := range gameGroupMap {
			// 统计每个分组的队伍数量
			teamCount := int64(0)
			for _, team := range scoreBoard.TeamRankings {
				if team.GroupID != nil && *team.GroupID == group.GroupID {
					teamCount++
				}
			}

			result = append(result, webmodels.GameGroupSimple{
				GroupID:   group.GroupID,
				GroupName: group.GroupName,
				TeamCount: teamCount,
			})
		}

		// 按 GroupID 排序
		sort.Slice(result, func(i, j int) bool {
			return result[i].GroupID < result[j].GroupID
		})

		return result, nil
	}, allTeamsForGameCacheTime, true)

	if err != nil {
		return nil, err
	}

	gameGroupsWithTeamCount = obj.([]webmodels.GameGroupSimple)

	return gameGroupsWithTeamCount, nil
}

// CachedFilteredGameScoreBoardData 缓存过滤后的排行榜数据
type CachedFilteredGameScoreBoardData struct {
	FilteredTeamRankings []webmodels.TeamScoreItem
	FilteredTimeLines    []webmodels.TimeLineItem
	TotalCount           int64
}

// CachedFilteredGameScoreBoard 缓存按分组过滤的排行榜数据
func CachedFilteredGameScoreBoard(gameID int64, groupID *int64) (*CachedFilteredGameScoreBoardData, error) {
	var cachedFilteredData CachedFilteredGameScoreBoardData

	// 构建缓存键
	var cacheKey string
	if groupID != nil {
		cacheKey = fmt.Sprintf("filtered_game_scoreboard_%d_group_%d", gameID, *groupID)
	} else {
		cacheKey = fmt.Sprintf("filtered_game_scoreboard_%d_all", gameID)
	}

	obj, err := GetOrCacheSingleFlight(cacheKey, func() (interface{}, error) {
		// 获取完整的排行榜数据
		scoreBoard, err := CachedGameScoreBoard(gameID)
		if err != nil {
			return nil, err
		}

		if groupID == nil {
			// 没有分组过滤，直接返回全部数据
			cachedFilteredData.FilteredTeamRankings = scoreBoard.TeamRankings
			cachedFilteredData.FilteredTimeLines = scoreBoard.AllTimeLines
			cachedFilteredData.TotalCount = int64(len(scoreBoard.TeamRankings))
		} else {
			// 按分组过滤
			filteredTeamRankings := make([]webmodels.TeamScoreItem, 0)
			filteredTimeLines := make([]webmodels.TimeLineItem, 0)

			// 创建时间线映射以便快速查找
			timeLineMap := make(map[int64]webmodels.TimeLineItem)
			for _, timeline := range scoreBoard.AllTimeLines {
				timeLineMap[timeline.TeamID] = timeline
			}

			// 过滤队伍排名数据
			for _, team := range scoreBoard.TeamRankings {
				if team.GroupID != nil && *team.GroupID == *groupID {
					filteredTeamRankings = append(filteredTeamRankings, team)
					// 添加对应的时间线数据
					if timeline, exists := timeLineMap[team.TeamID]; exists {
						filteredTimeLines = append(filteredTimeLines, timeline)
					}
				}
			}

			// 重新计算分组内的排名
			for i := range filteredTeamRankings {
				filteredTeamRankings[i].Rank = int64(i + 1)
			}

			cachedFilteredData.FilteredTeamRankings = filteredTeamRankings
			cachedFilteredData.FilteredTimeLines = filteredTimeLines
			cachedFilteredData.TotalCount = int64(len(filteredTeamRankings))
		}

		return cachedFilteredData, nil
	}, gameScoreBoardCacheTime, true)

	if err != nil {
		return nil, err
	}

	cachedFilteredData = obj.(CachedFilteredGameScoreBoardData)

	return &cachedFilteredData, nil
}

// CachedGameChallengeDetail 缓存题目详细信息
func CachedGameChallengeDetail(gameID int64, challengeID int64) (*models.GameChallenge, error) {
	var gameChallenge models.GameChallenge

	obj, err := GetOrCacheSingleFlight(fmt.Sprintf("game_challenge_detail_%d_%d", gameID, challengeID), func() (interface{}, error) {
		var gameChallenges []models.GameChallenge

		// 使用 Preload 进行关联查询
		if err := dbtool.DB().Preload("Challenge").
			Where("game_id = ? and game_challenges.challenge_id = ?", gameID, challengeID).
			Find(&gameChallenges).Error; err != nil {
			return nil, errors.New("failed to load game challenges")
		}

		if len(gameChallenges) == 0 {
			return nil, errors.New("challenge not found")
		}

		return gameChallenges[0], nil
	}, challengeDetailCacheTime, true)

	if err != nil {
		return nil, err
	}

	gameChallenge = obj.(models.GameChallenge)

	return &gameChallenge, nil
}

// CachedGameChallengeVisibility 缓存题目可见性检查
func CachedGameChallengeVisibility(gameID int64, challengeID int64) (bool, error) {
	obj, err := GetOrCacheSingleFlight(fmt.Sprintf("challenge_visibility_%d_%d", gameID, challengeID), func() (interface{}, error) {
		gameChallenges, err := CachedGameSimpleChallenges(gameID)
		if err != nil {
			return false, nil
		}
		for _, gc := range gameChallenges {
			if gc.ChallengeID == challengeID {
				return true, nil
			}
		}
		return false, nil
	}, challengeDetailCacheTime, true)

	if err != nil {
		return false, err
	}

	isVisible := obj.(bool)
	return isVisible, nil
}

// CachedChallengeAttachments 缓存题目附件信息
func CachedChallengeAttachments(challengeID int64) ([]webmodels.UserAttachmentConfig, error) {
	var userAttachments []webmodels.UserAttachmentConfig

	obj, err := GetOrCacheSingleFlight(fmt.Sprintf("challenge_attachments_%d", challengeID), func() (interface{}, error) {
		// 获取题目详细信息（这里会复用已有的缓存）
		var challenge models.Challenge
		if err := dbtool.DB().Where("challenge_id = ?", challengeID).First(&challenge).Error; err != nil {
			return nil, errors.New("failed to load challenge")
		}

		attachments := make([]webmodels.UserAttachmentConfig, 0, len(challenge.Attachments))
		for _, attachment := range challenge.Attachments {
			attachments = append(attachments, webmodels.UserAttachmentConfig{
				AttachName:   attachment.AttachName,
				AttachType:   attachment.AttachType,
				AttachURL:    attachment.AttachURL,
				AttachHash:   attachment.AttachHash,
				DownloadHash: attachment.DownloadHash,
			})
		}

		return attachments, nil
	}, challengeDetailCacheTime, true)

	if err != nil {
		return nil, err
	}

	userAttachments = obj.([]webmodels.UserAttachmentConfig)
	return userAttachments, nil
}

// CachedChallengeVisibleHints 缓存题目可见提示
func CachedChallengeVisibleHints(gameID int64, challengeID int64) (models.Hints, error) {
	var visibleHints models.Hints

	obj, err := GetOrCacheSingleFlight(fmt.Sprintf("challenge_visible_hints_%d_%d", gameID, challengeID), func() (interface{}, error) {
		// 获取题目详细信息
		gameChallenge, err := CachedGameChallengeDetail(gameID, challengeID)
		if err != nil {
			return nil, err
		}

		hints := make(models.Hints, 0, len(*gameChallenge.Hints))
		for _, hint := range *gameChallenge.Hints {
			if hint.Visible {
				hints = append(hints, hint)
			}
		}

		return hints, nil
	}, challengeDetailCacheTime, true)

	if err != nil {
		return nil, err
	}

	visibleHints = obj.(models.Hints)
	return visibleHints, nil
}

// 缓存所有队伍的容器状态信息
func CachedAllContainerStatus(gameID int64, challengeID int64) (map[int64][]models.Container, error) {
	var containersMap map[int64][]models.Container

	obj, err := GetOrCacheSingleFlight(fmt.Sprintf("all_container_status_%d_%d", gameID, challengeID), func() (interface{}, error) {
		var containerList []models.Container
		if err := dbtool.DB().Where("game_id = ? AND challenge_id = ? AND (container_status = ? OR container_status = ? OR container_status = ?)",
			gameID, challengeID, models.ContainerRunning, models.ContainerQueueing, models.ContainerStarting).Find(&containerList).Error; err != nil {
			return nil, errors.New("failed to load containers")
		}

		// 将结果按队伍ID分组
		resultMap := make(map[int64][]models.Container)
		for _, container := range containerList {
			if _, exists := resultMap[container.TeamID]; !exists {
				resultMap[container.TeamID] = make([]models.Container, 0)
			}
			resultMap[container.TeamID] = append(resultMap[container.TeamID], container)
		}

		return resultMap, nil
	}, containerStatusCacheTime, true)

	if err != nil {
		return nil, err
	}

	containersMap = obj.(map[int64][]models.Container)
	return containersMap, nil
}

// CachedContainerStatus 获取特定队伍的容器状态（兼容性函数）
// 建议使用 CachedAllContainerStatus 来减少数据库查询
func CachedContainerStatus(gameID int64, challengeID int64, teamID int64) ([]models.Container, error) {
	allContainers, err := CachedAllContainerStatus(gameID, challengeID)
	if err != nil {
		return nil, err
	}

	containers, exists := allContainers[teamID]
	if !exists {
		return make([]models.Container, 0), nil
	}

	return containers, nil
}

// 缓存所有队伍的Flag信息，解决高并发查询team_flags表的性能问题
func CachedAllTeamFlags(gameID int64, challengeID int64) (map[int64]*models.TeamFlag, error) {
	var teamFlagsMap map[int64]*models.TeamFlag

	obj, err := GetOrCacheSingleFlight(fmt.Sprintf("all_team_flags_%d_%d", gameID, challengeID), func() (interface{}, error) {
		var flags []models.TeamFlag
		if err := dbtool.DB().Where("game_id = ? AND challenge_id = ?", gameID, challengeID).Find(&flags).Error; err != nil {
			return nil, errors.New("failed to query team flags")
		}

		// 将结果按队伍ID分组
		resultMap := make(map[int64]*models.TeamFlag)
		for i, flag := range flags {
			resultMap[flag.TeamID] = &flags[i] // 使用索引避免循环变量地址问题
		}

		return resultMap, nil
	}, teamFlagCacheTime, true)

	if err != nil {
		return nil, err
	}

	teamFlagsMap = obj.(map[int64]*models.TeamFlag)
	return teamFlagsMap, nil
}

// 缓存所有队伍的解题状态，用于快速检查是否已解决
func CachedAllTeamSolveStatus(gameID int64, challengeID int64) (map[int64]bool, error) {
	var teamSolveStatusMap map[int64]bool

	obj, err := GetOrCacheSingleFlight(fmt.Sprintf("all_team_solve_status_%d_%d", gameID, challengeID), func() (interface{}, error) {
		var solves []models.Solve
		if err := dbtool.DB().Where("game_id = ? AND challenge_id = ?", gameID, challengeID).Find(&solves).Error; err != nil {
			return nil, errors.New("failed to query solve status")
		}

		// 将结果按队伍ID分组
		resultMap := make(map[int64]bool)
		for _, solve := range solves {
			resultMap[solve.TeamID] = true // 只要有solve记录就表示已解决
		}

		return resultMap, nil
	}, teamSolveStatusCacheTime, true)

	if err != nil {
		return nil, err
	}

	teamSolveStatusMap = obj.(map[int64]bool)
	return teamSolveStatusMap, nil
}

func CachedTeamSolveStatus(gameID int64, teamID int64, challengeID int64) (bool, error) {
	allSolveStatus, err := CachedAllTeamSolveStatus(gameID, challengeID)
	if err != nil {
		return false, err
	}

	hasSolved, exists := allSolveStatus[teamID]
	if !exists {
		return false, nil // 未解决
	}

	return hasSolved, nil
}

// 缓存所有队伍的判题结果
func CachedAllJudgeResults(teamID int64) (map[string]*models.Judge, error) {
	var judgeResultsMap map[string]*models.Judge

	obj, err := GetOrCacheSingleFlight(fmt.Sprintf("all_judge_results_%d", teamID), func() (interface{}, error) {
		var judges []models.Judge
		if err := dbtool.DB().Where("team_id = ?", teamID).Find(&judges).Error; err != nil {
			return nil, errors.New("failed to query judge results")
		}

		// 将结果按判题ID分组
		resultMap := make(map[string]*models.Judge)
		for i, judge := range judges {
			resultMap[judge.JudgeID] = &judges[i] // 使用索引避免循环变量地址问题
		}

		return resultMap, nil
	}, judgeResultCacheTime, true)

	if err != nil {
		return nil, err
	}

	judgeResultsMap = obj.(map[string]*models.Judge)
	return judgeResultsMap, nil
}

// 缓存判题结果
func CachedJudgeResult(judgeID string, teamID int64) (*models.Judge, error) {
	allResults, err := CachedAllJudgeResults(teamID)
	if err != nil {
		return nil, err
	}

	judge, exists := allResults[judgeID]
	if !exists {
		return nil, errors.New("judge not found")
	}

	return judge, nil
}
