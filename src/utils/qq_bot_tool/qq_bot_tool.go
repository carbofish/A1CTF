package qqbottool

import (
	"a1ctf/src/db/models"
	clientconfig "a1ctf/src/modules/client_config"
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
	cfg := clientconfig.ClientConfig
	if !cfg.QQBotEnabled {
		return
	}

	status := string(judge.JudgeStatus)
	team := judge.Team.TeamName
	chal := judge.Challenge.Name

	// 默认仅推送 AC；若开启则也推送 WA
	if judge.JudgeStatus == models.JudgeWA && !cfg.QQBotPushAllSubmits {
		return
	}

	rankText := ""
	if judge.JudgeStatus == models.JudgeAC && rank != nil {
		switch *rank {
		case 1:
			rankText = "（一血）"
		case 2:
			rankText = "（二血）"
		case 3:
			rankText = "（三血）"
		default:
			rankText = fmt.Sprintf("（第%d名）", *rank)
		}
	}

	msg := fmt.Sprintf("[提交:%s] 团队「%s」题目「%s」%s", status, team, chal, rankText)
	// 异步发送，避免阻塞评测
	go SendGroupMessage(msg)
}
