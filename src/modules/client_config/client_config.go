package clientconfig

import (
	"encoding/json"
	"os"
	"path/filepath"
	"time"
)

// SystemSettings 系统设置结构体
type SystemSettings struct {
	// 基本信息
	SystemName    string `json:"systemName"`
	SystemLogo    string `json:"systemLogo"`
	SystemSlogan  string `json:"systemSlogan"`
	SystemSummary string `json:"systemSummary"`
	SystemFooter  string `json:"systemFooter"`
	SystemFavicon string `json:"systemFavicon"`

	SystemICP             string `json:"systemICP"`
	SystemOrganization    string `json:"systemOrganization"`
	SystemOrganizationURL string `json:"systemOrganizationURL"`

	// 主题设置
	ThemeColor      string `json:"themeColor"`
	DarkModeDefault bool   `json:"darkModeDefault"`
	AllowUserTheme  bool   `json:"allowUserTheme"`

	// 品牌资源
	FancyBackGroundIconWhite string `json:"fancyBackGroundIconWhite"`
	FancyBackGroundIconBlack string `json:"fancyBackGroundIconBlack"`
	DefaultBGImage           string `json:"defaultBGImage"`
	SVGIconLight             string `json:"svgIconLight"`
	SVGIconDark              string `json:"svgIconDark"`
	SVGAltData               string `json:"svgAltData"`
	TrophysGold              string `json:"trophysGold"`
	TrophysSilver            string `json:"trophysSilver"`
	TrophysBronze            string `json:"trophysBronze"`
	SchoolLogo               string `json:"schoolLogo"`
	SchoolSmallIcon          string `json:"schoolSmallIcon"`
	SchoolUnionAuthText      string `json:"schoolUnionAuthText"`
	BGAnimation              bool   `json:"bgAnimation"`

	FancyBackGroundIconWidth  float64 `json:"fancyBackGroundIconWidth"`
	FancyBackGroundIconHeight float64 `json:"fancyBackGroundIconHeight"`

	// SMTP设置
	SmtpHost     string `json:"smtpHost"`
	SmtpPort     int    `json:"smtpPort"`
	SmtpUsername string `json:"smtpUsername"`
	SmtpPassword string `json:"smtpPassword"`
	SmtpName     string `json:"smtpName"`
	SmtpPortType string `json:"smtpPortType"`
	SmtpFrom     string `json:"smtpFrom"`
	SmtpEnabled  bool   `json:"smtpEnabled"`

	// 邮件验证模板
	VerifyEmailTemplate string `json:"verifyEmailTemplate"`
	VerifyEmailHeader   string `json:"verifyEmailHeader"`

	// 找回密码模板
	ForgetPasswordTemplate string `json:"forgetPasswordTemplate"`
	ForgetPasswordHeader   string `json:"forgetPasswordHeader"`

	// Proof-of-work 验证码设置
	CaptchaEnabled bool `json:"captchaEnabled"`

	// 比赛模式
	GameActivityMode string `json:"gameActivityMode"`

	AboutUS string `json:"aboutus"`

	// 账户激活策略
	AccountActivationMethod string `json:"accountActivationMethod"`
	RegistrationEnabled     bool   `json:"registrationEnabled"`

	// 其他系统设置
	DefaultLanguage string `json:"defaultLanguage"`
	TimeZone        string `json:"timeZone"`
	MaxUploadSize   int    `json:"maxUploadSize"`

	// 保存时间
	UpdatedTime time.Time `json:"updatedTime"`
	// QQ Bot 设置
	QQBotEnabled        bool   `json:"qqBotEnabled"`
	QQBotType           string `json:"qqBotType"`           // 例如: "go-cqhttp"
	QQBotApiBase        string `json:"qqBotApiBase"`        // 例如: "http://127.0.0.1:5700"
	QQBotAccessToken    string `json:"qqBotAccessToken"`    // go-cqhttp access_token（如启用）
	QQBotGroupID        string `json:"qqBotGroupId"`        // QQ 群号（字符串）
	QQBotPushAllSubmits bool   `json:"qqBotPushAllSubmits"` // 开启则WA也推送
}

// 默认系统设置
var DefaultSettings = SystemSettings{
	SystemName:            "A1CTF",
	SystemSlogan:          "A Modern CTF Platform",
	SystemFooter:          "© 2025 A1CTF Team",
	SystemICP:             "None",
	SystemOrganization:    "A1CTF",
	SystemOrganizationURL: "https://github.com/carbofish/A1CTF",
	ThemeColor:            "blue",
	DarkModeDefault:       true,
	AllowUserTheme:        true,

	// 品牌资源默认值
	FancyBackGroundIconWhite: "/images/ctf_white.png",
	FancyBackGroundIconBlack: "/images/ctf_black.png",
	DefaultBGImage:           "/images/defaultbg.jpg",
	SVGIconLight:             "/images/A1natas.svg",
	SVGIconDark:              "/images/A1natas_white.svg",

	FancyBackGroundIconWidth:  241.2,
	FancyBackGroundIconHeight: 122.39,

	SVGAltData:          "A1natas",
	TrophysGold:         "/images/trophys/gold_trophy.png",
	TrophysSilver:       "/images/trophys/silver_trophy.png",
	TrophysBronze:       "/images/trophys/copper_trophy.png",
	SchoolLogo:          "/images/A1natas.svg",
	SchoolSmallIcon:     "/images/A1natas.svg",
	SchoolUnionAuthText: "Union Auth",

	// 邮件验证模板
	VerifyEmailTemplate: "",
	VerifyEmailHeader:   "",

	// 找回密码模板
	ForgetPasswordTemplate: "",
	ForgetPasswordHeader:   "",

	BGAnimation: false,

	CaptchaEnabled: true,
	AboutUS:        "A1CTF Platform",

	SmtpPort:                25,
	SmtpPortType:            "none",
	DefaultLanguage:         "zh-CN",
	TimeZone:                "Asia/Shanghai",
	MaxUploadSize:           10,
	AccountActivationMethod: "email",
	RegistrationEnabled:     true,
	UpdatedTime:             time.Now().UTC(),
}

var ClientConfig SystemSettings

// 系统设置文件路径
const settingsFilePath = "./data/system_settings.json"

// 辅助函数
func LoadSystemSettings() (SystemSettings, error) {
	// 检查文件是否存在
	if _, err := os.Stat(settingsFilePath); os.IsNotExist(err) {
		// 文件不存在，创建默认设置
		if err := SaveSystemSettings(DefaultSettings); err != nil {
			return DefaultSettings, err
		}
		return DefaultSettings, nil
	}

	// 读取文件
	data, err := os.ReadFile(settingsFilePath)
	if err != nil {
		return DefaultSettings, err
	}

	// 解析JSON
	var settings SystemSettings
	if err := json.Unmarshal(data, &settings); err != nil {
		return DefaultSettings, err
	}

	ClientConfig = settings

	return settings, nil
}

func SaveSystemSettings(settings SystemSettings) error {

	settings.UpdatedTime = time.Now().UTC()

	ClientConfig = settings

	// 创建目录
	dir := filepath.Dir(settingsFilePath)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return err
	}

	// 序列化为JSON
	data, err := json.MarshalIndent(settings, "", "  ")
	if err != nil {
		return err
	}

	// 写入文件
	return os.WriteFile(settingsFilePath, data, 0644)
}
