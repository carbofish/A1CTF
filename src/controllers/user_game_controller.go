package controllers

import (
	"a1ctf/src/db/models"
	jwtauth "a1ctf/src/modules/jwt_auth"
	dbtool "a1ctf/src/utils/db_tool"
	i18ntool "a1ctf/src/utils/i18n_tool"
	"a1ctf/src/utils/ristretto_tool"
	"a1ctf/src/webmodels"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/nicksnyder/go-i18n/v2/i18n"
)

func UserListGames(c *gin.Context) {

	var games []models.Game
	query := dbtool.DB()

	if err := query.Find(&games).Error; err != nil {
		c.JSON(http.StatusInternalServerError, webmodels.ErrorMessage{
			Code:    500,
			Message: i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "FailedToLoadGames"}),
		})
		return
	}

	data := make([]webmodels.UserGameSimpleInfo, 0, len(games))
	for _, game := range games {
		if !game.Visible {
			continue
		}

		data = append(data, webmodels.UserGameSimpleInfo{
			GameID:                 game.GameID,
			Name:                   game.Name,
			Summary:                game.Summary,
			StartTime:              game.StartTime,
			EndTime:                game.EndTime,
			GroupInviteCodeEnabled: game.GroupInviteCodeEnabled,
			Visible:                game.Visible,
			Poster:                 game.Poster,
			LightIcon:              game.GameIconLight,
			DarkIcon:               game.GameIconDark,
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"code": 200,
		"data": data,
	})
}

func UserGetGameDetailWithTeamInfo(c *gin.Context) {
	game := c.MustGet("game").(models.Game)

	// 因为这个接口是 Public 的，没法利用 jwt 组件设置的 user 值，只能常识性的从 jwt 里 extract
	claims, errFromJwt := jwtauth.GetJwtMiddleWare().GetClaimsFromJWT(c)
	isLogined := errFromJwt == nil

	var curTeam models.Team
	var teamFounded bool = false

	// 先获取所有队伍的信息
	teamDataMap, errFromJwt := ristretto_tool.CachedMemberSearchTeamMap(game.GameID)
	if errFromJwt != nil {
		c.JSON(http.StatusInternalServerError, webmodels.ErrorMessage{
			Code:    500,
			Message: i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "FailedToLoadTeamData"}),
		})
		return
	}

	var team_status models.ParticipationStatus = models.ParticipateUnRegistered

	tmpUserID, userIDExists := claims["UserID"]
	if userIDExists {
		user_id := tmpUserID.(string)
		curTeam, teamFounded = teamDataMap[user_id]
	}

	// 根据登陆状态返回队伍信息
	if isLogined {
		if teamFounded {
			team_status = curTeam.TeamStatus
		}
	} else {
		team_status = models.ParticipateUnLogin
	}

	// 基本游戏信息
	gameInfo := gin.H{
		"game_id":                   game.GameID,
		"name":                      game.Name,
		"summary":                   game.Summary,
		"game_icon_light":           game.GameIconLight,
		"game_icon_dark":            game.GameIconDark,
		"poster":                    game.Poster,
		"start_time":                game.StartTime,
		"end_time":                  game.EndTime,
		"practice_mode":             game.PracticeMode,
		"team_number_limit":         game.TeamNumberLimit,
		"container_number_limit":    game.ContainerNumberLimit,
		"require_wp":                game.RequireWp,
		"wp_expire_time":            game.WpExpireTime,
		"stages":                    game.Stages,
		"visible":                   game.Visible,
		"team_status":               team_status,
		"group_invite_code_enabled": game.GroupInviteCodeEnabled,
		"team_info":                 nil,
	}

	// 如果用户已加入队伍，添加队伍信息
	if team_status != models.ParticipateUnRegistered && curTeam.TeamID != 0 {
		// 获取团队成员信息
		var members []webmodels.TeamMemberInfo
		if len(curTeam.TeamMembers) > 0 {
			userMap, err := ristretto_tool.CachedMemberMap()
			if err != nil {
				c.JSON(http.StatusInternalServerError, webmodels.ErrorMessage{
					Code:    500,
					Message: i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "FailedToLoadTeamMembers"}),
				})
			}

			// 构建成员详细信息
			for _, memberID := range curTeam.TeamMembers {
				user, ok := userMap[memberID]
				if !ok {
					continue
				}

				members = append(members, webmodels.TeamMemberInfo{
					Avatar:   user.Avatar,
					UserName: user.Username,
					UserID:   user.UserID,
					Captain:  false,
				})
			}

			// 设置第一个成员为队长
			if len(members) > 0 {
				// 假设第一个成员是队长/创建者
				members[0].Captain = true
			}
		}

		// 构建团队信息
		teamInfo := gin.H{
			"team_id":          curTeam.TeamID,
			"game_id":          curTeam.GameID,
			"team_name":        curTeam.TeamName,
			"team_avatar":      curTeam.TeamAvatar,
			"team_slogan":      curTeam.TeamSlogan,
			"team_description": curTeam.TeamDescription,
			"team_members":     members,
			"team_score":       curTeam.TeamScore,
			"team_hash":        curTeam.TeamHash,
			"invite_code":      curTeam.InviteCode,
			"team_status":      curTeam.TeamStatus,
			"group_name":       nil,
			"rank":             0,
			"penalty":          0,
		}

		if curTeam.TeamStatus == models.ParticipateApproved {
			cachedData, err := ristretto_tool.CachedGameScoreBoard(game.GameID)
			if err != nil {
				c.JSON(http.StatusInternalServerError, webmodels.ErrorMessage{
					Code:    500,
					Message: i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "SystemError"}),
				})
				return
			}

			myTeamInfo, ok := cachedData.FinalScoreBoardMap[curTeam.TeamID]

			if !ok {
				teamInfo["rank"] = 0
				teamInfo["penalty"] = 0
			} else {
				teamInfo["rank"] = myTeamInfo.Rank
				teamInfo["penalty"] = myTeamInfo.Penalty

				if curTeam.Group != nil {
					teamInfo["group_name"] = curTeam.Group.GroupName
				}
			}

		}

		gameInfo["team_info"] = teamInfo
	}

	c.JSON(http.StatusOK, gin.H{
		"code": 200,
		"data": gameInfo,
	})
}

func UserGetGameDescription(c *gin.Context) {
	game := c.MustGet("game").(models.Game)

	c.JSON(http.StatusOK, gin.H{
		"code": 200,
		"data": game.Description,
	})
}

func UserGetGameNotices(c *gin.Context) {

	game := c.MustGet("game").(models.Game)

	var notices []models.Notice

	if err := dbtool.DB().Where("game_id = ?", game.GameID).Find(&notices).Error; err != nil {
		c.JSON(http.StatusInternalServerError, webmodels.ErrorMessage{
			Code:    500,
			Message: i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "FailedToLoadNotices"}),
		})
		return
	}

	result := make([]webmodels.GameNotice, 0, len(notices))
	for _, notice := range notices {
		result = append(result, webmodels.GameNotice{
			NoticeID:       notice.NoticeID,
			NoticeCategory: notice.NoticeCategory,
			Data:           notice.Data,
			CreateTime:     notice.CreateTime,
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"code": 200,
		"data": result,
	})
}

func UserGameGetScoreBoard(c *gin.Context) {
	game := c.MustGet("game").(models.Game)

	// 解析查询参数
	groupIDStr := c.Query("group_id")
	pageStr := c.DefaultQuery("page", "1")
	sizeStr := c.DefaultQuery("size", "20")

	var groupID *int64
	if groupIDStr != "" {
		if gid, err := strconv.ParseInt(groupIDStr, 10, 64); err == nil {
			groupID = &gid
		}
	}

	page, err := strconv.ParseInt(pageStr, 10, 64)
	if err != nil || page < 1 {
		page = 1
	}

	size, err := strconv.ParseInt(sizeStr, 10, 64)
	if err != nil || size < 1 {
		size = 20
	}

	// 获取当前用户的队伍信息（如果已登录）
	claims, _ := jwtauth.GetJwtMiddleWare().GetClaimsFromJWT(c)

	var user_id string
	var logined bool = false
	var curTeamScoreItem *webmodels.TeamScoreItem = nil
	var curTeam models.Team

	// 先获取所有队伍的信息
	teamDataMap, err := ristretto_tool.CachedMemberSearchTeamMap(game.GameID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, webmodels.ErrorMessage{
			Code:    500,
			Message: i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "FailedToLoadTeamData"}),
		})
		return
	}

	tmpUserID, ok := claims["UserID"]
	if ok {
		user_id = tmpUserID.(string)
		curTeam, ok = teamDataMap[user_id]
		if ok {
			logined = true
		}
	}

	// 获取题目信息
	simpleGameChallenges, err := ristretto_tool.CachedGameSimpleChallenges(game.GameID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, webmodels.ErrorMessage{
			Code:    500,
			Message: i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "FailedToLoadGameChallengesBoard"}),
		})
		return
	}

	// 获取排行榜数据（用于获取 Top10 时间线和当前用户队伍信息）
	scoreBoard, err := ristretto_tool.CachedGameScoreBoard(game.GameID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, webmodels.ErrorMessage{
			Code:    500,
			Message: i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "FailedToLoadGameScoreboard"}),
		})
		return
	}

	// 获取带队伍数量的分组信息（已缓存）
	simpleGameGroups, err := ristretto_tool.CachedGameGroupsWithTeamCount(game.GameID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, webmodels.ErrorMessage{
			Code:    500,
			Message: i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "FailedToLoadGameGroups"}),
		})
		return
	}

	// 查找当前分组信息
	var currentGroup *webmodels.GameGroupSimple
	if groupID != nil {
		for _, group := range simpleGameGroups {
			if group.GroupID == *groupID {
				currentGroup = &group
				break
			}
		}
	}

	// 获取过滤后的排行榜数据（已缓存）
	filteredData, err := ristretto_tool.CachedFilteredGameScoreBoard(game.GameID, groupID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, webmodels.ErrorMessage{
			Code:    500,
			Message: i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "FailedToLoadFilteredScoreboard"}),
		})
		return
	}

	totalCachedTeamsCount := filteredData.TotalCount

	totalPages := (totalCachedTeamsCount + size - 1) / size
	pagination := webmodels.PaginationInfo{
		CurrentPage: page,
		PageSize:    size,
		TotalCount:  totalCachedTeamsCount,
		TotalPages:  totalPages,
	}

	if totalPages == 0 {
		// 如果没有数据，设置为第1页
		page = 1
		pagination.CurrentPage = 1
	} else if page > totalPages {
		// 如果页码超出范围，使用最后一页
		page = totalPages
		pagination.CurrentPage = totalPages
	}

	// 设置当前用户的队伍信息
	if logined {
		if myTeamScoreItem, ok := scoreBoard.FinalScoreBoardMap[curTeam.TeamID]; ok {
			curTeamScoreItem = &myTeamScoreItem
		}
	}

	curStartIdx := (page - 1) * size
	curEndIdx := min(curStartIdx+size, totalCachedTeamsCount)

	var pageTeamScores []webmodels.TeamScoreItem
	// var pageTimeLines []webmodels.TimeLineItem

	if totalCachedTeamsCount > 0 && curStartIdx < totalCachedTeamsCount {
		pageTeamScores = filteredData.FilteredTeamRankings[curStartIdx:curEndIdx]
		// pageTimeLines = filteredData.FilteredTimeLines[curStartIdx:min(curEndIdx, int64(len(filteredData.FilteredTimeLines)))]

		// 补全 timelines 不足 teamscores 的部分, 出现这种情况的原因是因为积分榜只有在队伍有得分的情况下才会生成一条记录
		// if len(pageTimeLines) < len(pageTeamScores) {
		// 	pageTimeLines = append(pageTimeLines, webmodels.TimeLineItem{
		// 		TeamID:   pageTeamScores[len(pageTimeLines)].TeamID,
		// 		TeamName: pageTeamScores[len(pageTimeLines)].TeamName,
		// 		Scores:   make([]webmodels.TimeLineScoreItem, 0),
		// 	})
		// }
	} else {
		pageTeamScores = make([]webmodels.TeamScoreItem, 0)
		// pageTimeLines = make([]webmodels.TimeLineItem, 0)
	}

	// 过滤一遍 Top10，过滤掉没得分的
	filteredTop10TimeLines := make([]webmodels.TimeLineItem, 0)

	for _, top10TimeLine := range scoreBoard.Top10TimeLines {
		if len(top10TimeLine.Scores) > 0 {
			filteredTop10TimeLines = append(filteredTop10TimeLines, top10TimeLine)
		}
	}

	// 转换两种 TimeLineItem 为低开销版本
	convertLowCost := func(timelines []webmodels.TimeLineItem) []webmodels.TimeLineItemLowCost {
		lowCostList := make([]webmodels.TimeLineItemLowCost, 0, len(timelines))
		for _, item := range timelines {
			// 先找一个最小值
			timeBase := int64(1 << 62)

			for _, score := range item.Scores {
				timeBase = min(timeBase, int64(score.RecordTime))
			}

			lowCostItem := webmodels.TimeLineItemLowCost{
				TeamID:   item.TeamID,
				TeamName: item.TeamName,
				Scores:   make([]int64, 0, len(item.Scores)),
				Times:    make([]int64, 0, len(item.Scores)),
				TimeBase: int64(timeBase),
			}

			for _, score := range item.Scores {
				lowCostItem.Scores = append(lowCostItem.Scores, int64(score.Score))
				lowCostItem.Times = append(lowCostItem.Times, score.RecordTime-timeBase)
				timeBase = score.RecordTime
			}

			lowCostList = append(lowCostList, lowCostItem)
		}
		return lowCostList
	}

	result := webmodels.GameScoreboardData{
		GameID:         game.GameID,
		Name:           game.Name,
		Top10TimeLines: convertLowCost(filteredTop10TimeLines),
		TeamScores:     pageTeamScores,
		// TeamTimeLines:        convertLowCost(pageTimeLines),
		SimpleGameChallenges: simpleGameChallenges,
		Groups:               simpleGameGroups,
		CurrentGroup:         currentGroup,
		Pagination:           &pagination,
	}

	if logined {
		result.YourTeam = curTeamScoreItem
	}

	c.JSON(http.StatusOK, gin.H{
		"code": 200,
		"data": result,
	})
}

func UserGameGetScoreBoardTimeLine(c *gin.Context) {
	game := c.MustGet("game").(models.Game)

	// 解析查询参数
	teamIDStr := c.Param("team_id")

	var teamID *int64
	if teamIDStr != "" {
		if tid, err := strconv.ParseInt(teamIDStr, 10, 64); err == nil {
			teamID = &tid
		}
	}

	if teamID == nil {
		c.JSON(http.StatusBadRequest, webmodels.ErrorMessage{
			Code:    400,
			Message: i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "InvalidTeamID"}),
		})
		return
	}

	scoreBoard, err := ristretto_tool.CachedGameScoreBoard(game.GameID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, webmodels.ErrorMessage{
			Code:    500,
			Message: i18ntool.Translate(c, &i18n.LocalizeConfig{MessageID: "FailedToLoadGameScoreboard"}),
		})
		return
	}

	// 转换两种 TimeLineItem 为低开销版本
	convertLowCost := func(timeline webmodels.TimeLineItem) webmodels.TimeLineItemLowCost {
		// 先找一个最小值
		timeBase := int64(1 << 62)

		for _, score := range timeline.Scores {
			timeBase = min(timeBase, int64(score.RecordTime))
		}

		lowCostItem := webmodels.TimeLineItemLowCost{
			TeamID:   timeline.TeamID,
			TeamName: timeline.TeamName,
			Scores:   make([]int64, 0, len(timeline.Scores)),
			Times:    make([]int64, 0, len(timeline.Scores)),
			TimeBase: int64(timeBase),
		}

		for _, score := range timeline.Scores {
			lowCostItem.Scores = append(lowCostItem.Scores, int64(score.Score))
			lowCostItem.Times = append(lowCostItem.Times, score.RecordTime-timeBase)
			timeBase = score.RecordTime
		}

		return lowCostItem
	}

	var resultTimeLine webmodels.TimeLineItemLowCost

	for _, timeline := range scoreBoard.AllTimeLines {
		if timeline.TeamID == *teamID {
			resultTimeLine = convertLowCost(timeline)
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"code": 200,
		"data": resultTimeLine,
	})
}
