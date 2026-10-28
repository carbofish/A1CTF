package jobs

import (
	"a1ctf/src/db/models"
	dbtool "a1ctf/src/utils/db_tool"
	"a1ctf/src/utils/ristretto_tool"
	"a1ctf/src/utils/zaphelper"
	"math"
	"time"

	"go.uber.org/zap"
	"gorm.io/gorm/clause"
)

func filterValidSolves(solves []models.Solve) []models.Solve {
	var filtered []models.Solve
	for _, solve := range solves {
		if solve.Team.TeamStatus == models.ParticipateApproved {
			filtered = append(filtered, solve)
		}
	}
	return filtered
}

// 往 更新解题数量, 题目当前分数, 队伍分数
func updateActiveGameScores(game_ids []int64) {
	if len(game_ids) == 0 {
		return
	}

	// 1. 查询所有相关的 GameChallenge
	var gameChallenges []models.GameChallenge
	if err := dbtool.DB().Where("game_id IN ?", game_ids).Find(&gameChallenges).Error; err != nil {
		zaphelper.Logger.Error("Failed to load game challenges", zap.Error(err))
		return
	}

	// 2. 查询所有正确的解题记录
	var solves []models.Solve
	if err := dbtool.DB().Where("game_id IN ? AND solve_status = ?", game_ids, models.SolveCorrect).Preload("Game").Preload("Team").Find(&solves).Error; err != nil {
		zaphelper.Logger.Error("Failed to load solves", zap.Error(err))
		return
	}

	// 过滤掉被 Ban 的队伍
	solves = filterValidSolves(solves)

	// 3. 统计每道题的解题人数
	solveCountMap := make(map[int64]int32) // ingame_id -> solve_count
	for _, solve := range solves {
		if solve.SolveTime.After(solve.Game.StartTime) && solve.SolveTime.Before(solve.Game.EndTime) {
			solveCountMap[solve.IngameID]++
		}
	}

	// 4. 更新每道题的解题人数和分数（只更新有变化的）
	var challengesToUpdate []models.GameChallenge
	gameChallengeMap := make(map[int64]models.GameChallenge)
	for _, gc := range gameChallenges {
		solveCount := solveCountMap[gc.IngameID]
		oldSolveCount := gc.SolveCount
		oldCurScore := gc.CurScore

		gc.SolveCount = solveCount

		// 计算当前分数
		var newCurScore float64
		if solveCount == 0 {
			newCurScore = gc.TotalScore
		} else {
			// 动态分数计算公式
			minRatio := gc.MinimalScore / gc.TotalScore
			dynamicRatio := (1 - minRatio) * math.Exp((1-float64(solveCount))/gc.Difficulty)
			newCurScore = math.Floor(gc.TotalScore * (minRatio + dynamicRatio))
		}
		gc.CurScore = newCurScore

		gameChallengeMap[gc.IngameID] = gc

		// 只有当解题人数或分数发生变化时才加入更新列表
		if oldSolveCount != solveCount || oldCurScore != newCurScore {
			challengesToUpdate = append(challengesToUpdate, gc)
		}
	}

	// 批量更新 GameChallenge（只更新有变化的）
	if len(challengesToUpdate) > 0 {
		for _, gc := range challengesToUpdate {
			if err := dbtool.DB().Model(&gc).Select("solve_count", "cur_score").Updates(gc).Error; err != nil {
				zaphelper.Logger.Error("Failed to update game challenge", zap.Error(err), zap.Int64("ingame_id", gc.IngameID))
			}
		}
	}

	// 5. 查询游戏信息（用于血奖计算）
	var games []models.Game
	if err := dbtool.DB().Where("game_id IN ?", game_ids).Find(&games).Error; err != nil {
		zaphelper.Logger.Error("Failed to load games", zap.Error(err))
		return
	}
	gameMap := make(map[int64]models.Game)
	for _, game := range games {
		gameMap[game.GameID] = game
	}

	// 6. 查询分数调整记录
	var adjustments []models.ScoreAdjustment
	if err := dbtool.DB().Where("game_id IN ?", game_ids).Find(&adjustments).Error; err != nil {
		zaphelper.Logger.Error("Failed to load score adjustments", zap.Error(err))
		return
	}

	// 7. 计算每个队伍的总分
	teamScores := make(map[int64]float64) // team_id -> total_score

	for _, solve := range solves {

		// 过滤掉非比赛时间的 solves
		if !(solve.SolveTime.After(solve.Game.StartTime) && solve.SolveTime.Before(solve.Game.EndTime)) {
			continue
		}

		if gc, exists := gameChallengeMap[solve.IngameID]; exists && gc.Visible {
			teamScores[solve.TeamID] += gc.CurScore
		}
	}

	// 7.2 计算血奖分数
	for _, solve := range solves {

		// 过滤掉非比赛时间的 solves
		if !(solve.SolveTime.After(solve.Game.StartTime) && solve.SolveTime.Before(solve.Game.EndTime)) {
			continue
		}

		if gc, exists := gameChallengeMap[solve.IngameID]; exists && gc.Visible && gc.BloodRewardEnabled {
			if game, gameExists := gameMap[solve.GameID]; gameExists {
				var rewardPercent int64
				switch solve.Rank {
				case 1:
					rewardPercent = game.FirstBloodReward
				case 2:
					rewardPercent = game.SecondBloodReward
				case 3:
					rewardPercent = game.ThirdBloodReward
				}
				if rewardPercent > 0 {
					reward := gc.CurScore * float64(rewardPercent) / 100.0
					teamScores[solve.TeamID] += math.Max(math.Floor(reward), 1)
				}
			}
		}
	}

	// 7.3 计算分数调整
	for _, adj := range adjustments {
		teamScores[adj.TeamID] += adj.ScoreChange
	}

	// 8. 查询当前队伍分数，只更新有变化的
	var currentTeams []models.Team
	var teamIDsToQuery []int64
	for teamID := range teamScores {
		teamIDsToQuery = append(teamIDsToQuery, teamID)
	}

	if len(teamIDsToQuery) > 0 {
		if err := dbtool.DB().Where("team_id IN ? AND game_id IN ?", teamIDsToQuery, game_ids).Find(&currentTeams).Error; err != nil {
			zaphelper.Logger.Error("Failed to load current team scores", zap.Error(err))
			return
		}
	}

	// 比较分数，只更新有变化的队伍
	currentTeamScoreMap := make(map[int64]float64)
	for _, team := range currentTeams {
		currentTeamScoreMap[team.TeamID] = team.TeamScore
	}

	var teamsToUpdate []models.Team
	for teamID, newScore := range teamScores {
		currentScore, exists := currentTeamScoreMap[teamID]
		// 如果队伍不存在或分数发生变化，则需要更新
		if !exists || currentScore != newScore {
			team := models.Team{
				TeamID:    teamID,
				TeamScore: newScore,
			}
			teamsToUpdate = append(teamsToUpdate, team)
		}
	}

	if len(teamsToUpdate) > 0 {
		for _, team := range teamsToUpdate {
			if err := dbtool.DB().Model(&team).Select("team_score").Updates(team).Error; err != nil {
				zaphelper.Logger.Error("Failed to update team score", zap.Error(err), zap.Int64("team_id", team.TeamID))
			}
		}
	}
}

func UpdateActivateGameScore() {
	var active_games []models.Game
	now := time.Now().UTC()

	if err := dbtool.DB().Where("start_time <= ? AND end_time >= ?", now, now).Find(&active_games).Error; err != nil {
		zaphelper.Logger.Error("Failed to load active games", zap.Error(err))
		return
	}

	var game_ids []int64
	for _, game := range active_games {
		game_ids = append(game_ids, game.GameID)
	}

	// 更新比赛分数
	updateActiveGameScores(game_ids)
}

// 更新比赛每个队伍的分数, 往 scoreboard 表里插入当前某个比赛每个队伍的分数(仅在分数变动时候)
func UpdateActiveGameScoreBoard() {
	var active_games []models.Game
	now := time.Now().UTC()

	if err := dbtool.DB().Where("start_time <= ? AND end_time >= ?", now, now).Find(&active_games).Error; err != nil {
		zaphelper.Logger.Error("Failed to load active games", zap.Error(err))
		return
	}

	for _, game := range active_games {
		gameID := game.GameID

		// 先获取时间，统一的
		curTime := time.Now().UTC()

		// 先获取比赛下的所有队伍
		var teamsParticipated []models.Team = make([]models.Team, 0)
		var participatedTeamIDs []int64
		if err := dbtool.DB().Where("game_id = ? AND team_type = ?", gameID, models.TeamTypePlayer).Find(&teamsParticipated).Error; err != nil {
			zaphelper.Logger.Error("Failed to load teams for game ", zap.Error(err), zap.Int64("game_id", gameID))
			return
		}

		for _, team := range teamsParticipated {
			participatedTeamIDs = append(participatedTeamIDs, team.TeamID)
		}

		// 获取上述队伍的积分榜
		var teamGameScoreborad []models.ScoreBoard = make([]models.ScoreBoard, 0)
		var teamGameScoreboardMap map[int64]models.ScoreBoard = make(map[int64]models.ScoreBoard)
		if err := dbtool.DB().Where("game_id = ? AND team_id IN ?", gameID, participatedTeamIDs).Preload("Team").Find(&teamGameScoreborad).Error; err != nil {
			zaphelper.Logger.Error("Failed to load team scoreboard for game ", zap.Error(err), zap.Int64("game_id", gameID))
			return
		}

		for _, scoreboard := range teamGameScoreborad {
			teamGameScoreboardMap[scoreboard.TeamID] = scoreboard
		}

		// 获取当前比赛的正确解题记录
		var solves []models.Solve
		if err := dbtool.DB().Where("game_id = ? AND solve_status = ? AND solve_time BETWEEN ? AND ?", gameID, models.SolveCorrect, game.StartTime, game.EndTime).Preload("GameChallenge").Preload("Game").Preload("Team").Find(&solves).Error; err != nil {
			zaphelper.Logger.Error("Failed to load solves for game ", zap.Error(err), zap.Int64("game_id", gameID))
			return
		}

		solves = filterValidSolves(solves)

		// 计算每个队伍的解题信息
		var teamMap = make(map[int64]models.ScoreBoardData)

		// 这里先根据现有的 Scoreboard 表项初始化一次 teamMap，防止后期后台操作导致队伍 0 solves 0 score-adjustments 后不更新 0 分
		for _, teamScore := range teamGameScoreborad {
			solvedList := make([]string, 0)
			scoreBoardData := models.ScoreBoardData{
				TeamName:             teamScore.Team.TeamName,
				SolvedChallenges:     solvedList,
				NewSolvedChallengeID: nil,
				Score:                0,
				RecordTime:           curTime,
			}
			teamMap[teamScore.TeamID] = scoreBoardData
		}

		for _, solve := range solves {
			if !solve.GameChallenge.Visible {
				// 如果题目现在不可见，就跳过
				continue
			}

			challengeScore := solve.GameChallenge.CurScore

			// 这里计算分数了，处理一下三血
			if solve.GameChallenge.BloodRewardEnabled && solve.Rank <= 3 {

				var rankRewardEnabled bool = false

				rewardScore := 0.0
				switch solve.Rank {
				case 3:
					rewardScore = float64(solve.Game.ThirdBloodReward) * solve.GameChallenge.CurScore / 100
					if solve.Game.ThirdBloodReward != 0 {
						rankRewardEnabled = true
					}
				case 2:
					rewardScore = float64(solve.Game.SecondBloodReward) * solve.GameChallenge.CurScore / 100
					if solve.Game.SecondBloodReward != 0 {
						rankRewardEnabled = true
					}
				case 1:
					rewardScore = float64(solve.Game.FirstBloodReward) * solve.GameChallenge.CurScore / 100
					if solve.Game.FirstBloodReward != 0 {
						rankRewardEnabled = true
					}
				}

				if rankRewardEnabled {
					rewardScore = math.Max(math.Floor(rewardScore), 1)

					challengeScore += rewardScore
				}
			}

			// 更新解题信息
			if scoreBoardData, exists := teamMap[solve.TeamID]; exists {

				scoreBoardData.Score += challengeScore
				scoreBoardData.SolvedChallenges = append(scoreBoardData.SolvedChallenges, solve.SolveID)

				teamMap[solve.TeamID] = scoreBoardData
			} else {
				solvedList := make([]string, 0)
				solvedList = append(solvedList, solve.SolveID)
				scoreBoardData := models.ScoreBoardData{
					TeamName:             solve.Team.TeamName,
					SolvedChallenges:     solvedList,
					NewSolvedChallengeID: nil,
					Score:                0,
					RecordTime:           curTime,
				}
				scoreBoardData.Score += challengeScore
				teamMap[solve.TeamID] = scoreBoardData
			}
		}

		// 加载分数修正
		var adjustments []models.ScoreAdjustment
		if err := dbtool.DB().Where("game_id = ?", gameID).Preload("Team").Find(&adjustments).Error; err != nil {
			zaphelper.Logger.Error("Failed to load score adjuestment for game ", zap.Error(err), zap.Int64("game_id", gameID))
			return
		}

		for _, adjustment := range adjustments {
			if scoreBoardData, exists := teamMap[adjustment.TeamID]; exists {
				// 有解题记录，直接修正
				scoreBoardData.Score += adjustment.ScoreChange
				teamMap[adjustment.TeamID] = scoreBoardData
			} else {
				// 没解题记录，创建新的
				solvedList := make([]string, 0)
				scoreBoardData := models.ScoreBoardData{
					TeamName:             adjustment.Team.TeamName,
					SolvedChallenges:     solvedList,
					NewSolvedChallengeID: nil,
					Score:                adjustment.ScoreChange,
					RecordTime:           curTime,
				}
				teamMap[adjustment.TeamID] = scoreBoardData
			}
		}

		// 现在已经计算完成当前所有队伍的解题记录，只需要更新进 sql 就行了

		for teamID, teamData := range teamMap {
			// 先判断是否是新数据
			tmpScoreboard, exists := teamGameScoreboardMap[teamID]

			if !exists {
				// 如果不存在，直接添加一条新的
				tmpScoreboardDatas := make(models.ScoreBoardDatas, 0)
				tmpScoreboardDatas = append(tmpScoreboardDatas, teamData)

				tmpScoreboard = models.ScoreBoard{
					GameID:         gameID,
					TeamID:         teamID,
					GenerateTime:   curTime,
					CurScore:       teamData.Score,
					Data:           tmpScoreboardDatas,
					LastUpdateTime: curTime,
				}

				teamGameScoreboardMap[teamID] = tmpScoreboard
			} else {
				// 如果存在，插入新数据

				if tmpScoreboard.CurScore != teamData.Score {
					tmpScoreboard.Data = append(tmpScoreboard.Data, teamData)
					tmpScoreboard.LastUpdateTime = curTime
					tmpScoreboard.CurScore = teamData.Score

				}

				teamGameScoreboardMap[teamID] = tmpScoreboard
			}
		}

		var scoreboards []models.ScoreBoard = make([]models.ScoreBoard, 0)
		for _, scoreboard := range teamGameScoreboardMap {
			scoreboards = append(scoreboards, scoreboard)
		}

		if len(scoreboards) > 0 {
			err := dbtool.DB().Clauses(clause.OnConflict{
				UpdateAll: true,
			}).Create(&scoreboards).Error

			if err != nil {
				zaphelper.Logger.Error("Failed to update scoreboard for game ", zap.Error(err), zap.Int64("game_id", gameID))
			}
		}

	}
}

// 更新曲线
func UpdateGameScoreBoardCache() {
	var active_games []models.Game
	query := dbtool.DB()
	// .Where("start_time <= ? AND end_time >= ?", time.Now().UTC(), time.Now().UTC())

	if err := query.Find(&active_games).Error; err != nil {
		println("Failed to load active games")
		return
	}

	var game_ids []int64
	for _, game := range active_games {
		game_ids = append(game_ids, game.GameID)
	}

	for _, game_id := range game_ids {
		if err := ristretto_tool.MakeGameScoreBoardCache(game_id); err != nil {
			zaphelper.Logger.Error("Failed to make game scoreboard cache", zap.Error(err), zap.Int64("game_id", game_id))
			continue
		}
	}
}
