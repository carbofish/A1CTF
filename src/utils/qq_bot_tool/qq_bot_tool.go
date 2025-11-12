package qqbottool

import (
	"a1ctf/src/db/models"
	clientconfig "a1ctf/src/modules/client_config"
	dbtool "a1ctf/src/utils/db_tool"
	"a1ctf/src/utils/zaphelper"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strconv"
	"time"

	"go.uber.org/zap"
)

func sendGroupMessageGETWithConfig(baseURL, accessToken, groupID, message string) error {
	cfg := clientconfig.ClientConfig

	// 回退到系统配置
	if baseURL == "" {
		baseURL = cfg.QQBotApiBase
	}
	if groupID == "" {
		groupID = cfg.QQBotGroupID
	}
	if accessToken == "" {
		accessToken = cfg.QQBotAccessToken
	}

	// 必要参数缺失则不发送
	if baseURL == "" || groupID == "" {
		return nil
	}

	gid, err := strconv.ParseInt(groupID, 10, 64)
	if err != nil {
		return fmt.Errorf("invalid qqBotGroupId: %w", err)
	}

	apiurl := fmt.Sprintf("%s/send_group_msg", baseURL)
	params := url.Values{}
	params.Add("group_id", fmt.Sprintf("%d", gid))
	params.Add("message", message)
	if accessToken != "" {
		params.Add("access_token", accessToken)
	}
	fullURL := apiurl + "?" + params.Encode()

	req, err := http.NewRequest("GET", fullURL, nil)
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded; charset=utf-8")
	req.Header.Set("Accept-Charset", "utf-8")

	client := &http.Client{Timeout: 5 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	if resp.StatusCode/100 != 2 {
		return fmt.Errorf("qq bot http status: %d %s", resp.StatusCode, string(body))
	}

	var result map[string]interface{}
	_ = json.Unmarshal(body, &result)
	return nil
}

func SendGroupMessageWithConfig(baseURL, accessToken, groupID, message string) {
	if err := sendGroupMessageGETWithConfig(baseURL, accessToken, groupID, message); err != nil {
		zaphelper.Logger.Error("QQ Bot send failed", zap.Any("err", err))
	}
}

func sendGroupMessageGET(message string) error {
	cfg := clientconfig.ClientConfig
	if !cfg.QQBotEnabled || cfg.QQBotApiBase == "" || cfg.QQBotGroupID == "" {
		return nil
	}
	return sendGroupMessageGETWithConfig(cfg.QQBotApiBase, cfg.QQBotAccessToken, cfg.QQBotGroupID, message)
}

func SendGroupMessage(message string) {
	if err := sendGroupMessageGET(message); err != nil {
		zaphelper.Logger.Error("QQ Bot send failed", zap.Any("err", err))
	}
}

func SendGroupMessageCustom(baseURL string, accessToken string, groupID string, message string) {
	if err := sendGroupMessageGETWithConfig(baseURL, accessToken, groupID, message); err != nil {
		zaphelper.Logger.Error("QQ Bot custom send failed", zap.Any("err", err))
	}
}

func NotifyFlagSubmit(judge *models.Judge, rank *int32) {
	// 状态中文与表情映射
	statusCN := ""
	statusEmoji := ""
	switch judge.JudgeStatus {
	case models.JudgeAC:
		statusCN, statusEmoji = "通过", "✅"
	case models.JudgeWA:
		statusCN, statusEmoji = "错误", "❌"
	case models.JudgeTimeout:
		statusCN, statusEmoji = "超时", "⏱️"
	case models.JudgeError:
		statusCN, statusEmoji = "异常", "🚫"
	case models.JudgeRunning:
		statusCN, statusEmoji = "评测中", "🏃"
	case models.JudgeQueueing:
		statusCN, statusEmoji = "排队中", "⏳"
	default:
		statusCN, statusEmoji = string(judge.JudgeStatus), ""
	}

	// 查询提交者用户名，失败则回退到 SubmiterID
	submiter := judge.SubmiterID
	var user models.User
	if err := dbtool.DB().Where("user_id = ?", judge.SubmiterID).First(&user).Error; err == nil {
		submiter = user.Username
	}

	// 名次奖杯文本
	rankText := ""
	if judge.JudgeStatus == models.JudgeAC && rank != nil {
		switch *rank {
		case 1:
			rankText = "🥇 一血"
		case 2:
			rankText = "🥈 二血"
		case 3:
			rankText = "🥉 三血"
		default:
			rankText = fmt.Sprintf("第%d名", *rank)
		}
	}

	// 加载比赛配置（若失败则走系统配置）
	var game models.Game
	if err := dbtool.DB().Where("game_id = ?", judge.GameID).First(&game).Error; err != nil {
		cfg := clientconfig.ClientConfig
		if !cfg.QQBotEnabled {
			return
		}
		// WA 时是否推送由系统设置控制
		if judge.JudgeStatus == models.JudgeWA && !cfg.QQBotPushAllSubmits {
			return
		}
		team := judge.Team.TeamName
		chal := judge.Challenge.Name

		prefix := "" // 未加载比赛名时不加前缀
		msg := fmt.Sprintf("%s[提交:%s %s] 团队「%s」成员「%s」题目「%s」%s",
			prefix, statusCN, statusEmoji, team, submiter, chal, rankText)
		go SendGroupMessage(msg)
		return
	}

	// 比赛级配置（必要字段缺失时工具内会回退系统配置）
	if !game.QQBotEnabled {
		return
	}
	team := judge.Team.TeamName
	chal := judge.Challenge.Name

	// WA 推送策略：比赛未指定则回退系统设置
	pushAll := game.QQBotPushAllSubmits
	cfg := clientconfig.ClientConfig
	if !pushAll {
		pushAll = cfg.QQBotPushAllSubmits
	}
	if judge.JudgeStatus == models.JudgeWA && !pushAll {
		return
	}

	base := ""
	token := ""
	gid := ""
	if game.QQBotApiBase != nil {
		base = *game.QQBotApiBase
	}
	if game.QQBotAccessToken != nil {
		token = *game.QQBotAccessToken
	}
	if game.QQBotGroupID != nil {
		gid = *game.QQBotGroupID
	}

	// 加入比赛名前缀
	prefix := fmt.Sprintf("【%s】", game.Name)

	msg := fmt.Sprintf("%s[提交:%s %s] 团队「%s」成员「%s」题目「%s」%s",
		prefix, statusCN, statusEmoji, team, submiter, chal, rankText)
	go SendGroupMessageWithConfig(base, token, gid, msg)
}
