package controllers

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	clientconfig "a1ctf/src/modules/client_config"
	proofofwork "a1ctf/src/modules/proof_of_work"
	i18ntool "a1ctf/src/utils/i18n_tool"
	validatortool "a1ctf/src/utils/validator_tool"
	"a1ctf/src/webmodels"

	"github.com/gin-gonic/gin"
)

func TestRegisterRegistrationEnabled(t *testing.T) {
	t.Chdir("../..")
	i18ntool.LoadLanguageFiles()
	validatortool.InitValidator()
	originalConfig := clientconfig.ClientConfig
	originalCap := proofofwork.CapInstance
	t.Cleanup(func() {
		clientconfig.ClientConfig = originalConfig
		proofofwork.CapInstance = originalCap
	})

	// No database or Redis is initialized: closed registration must stop before either.
	proofofwork.CapInstance = &proofofwork.Cap{}
	router := gin.New()
	router.POST("/api/auth/register", PayloadValidator(webmodels.RegisterPayload{}), Register)

	for _, tc := range []struct {
		name    string
		enabled bool
		captcha bool
		lang    string
		status  int
		message string
	}{
		{"disabled without captcha", false, false, "en", 403, "Registration is disabled"},
		{"disabled with captcha", false, true, "en", 403, "Registration is disabled"},
		{"disabled in Chinese", false, true, "zh", 403, "注册已关闭"},
		{"enabled still validates captcha", true, true, "en", 400, "Invalid request payload"},
	} {
		t.Run(tc.name, func(t *testing.T) {
			clientconfig.ClientConfig.RegistrationEnabled = tc.enabled
			clientconfig.ClientConfig.CaptchaEnabled = tc.captcha
			request := httptest.NewRequest(http.MethodPost, "/api/auth/register", strings.NewReader(
				`{"username":"testuser","password":"StrongPassword!1","email":"test@example.com","captcha":"invalid"}`))
			request.Header.Set("Content-Type", "application/json")
			request.Header.Set("Accept-Language", tc.lang)
			response := httptest.NewRecorder()
			router.ServeHTTP(response, request)
			if response.Code != tc.status {
				t.Fatalf("status = %d, want %d; body: %s", response.Code, tc.status, response.Body.String())
			}
			var body struct {
				Code    int    `json:"code"`
				Message string `json:"message"`
			}
			if err := json.Unmarshal(response.Body.Bytes(), &body); err != nil {
				t.Fatal(err)
			}
			if body.Code != tc.status || body.Message != tc.message {
				t.Fatalf("unexpected response: %+v", body)
			}
		})
	}
}
