package csrf

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"errors"
	"fmt"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/spf13/viper"
)

const (
	csrfTokenLength = 32
	csrfHeaderName  = "X-CSRF-Token"
	csrfFormName    = "csrf_token"
	csrfCookieName  = "a1csrf"
)

var (
	csrfSecretKey []byte
	csrfMu        sync.RWMutex
)

func getSecretKey() []byte {
	csrfMu.RLock()
	if csrfSecretKey != nil {
		csrfMu.RUnlock()
		return csrfSecretKey
	}
	csrfMu.RUnlock()

	csrfMu.Lock()
	defer csrfMu.Unlock()
	if csrfSecretKey == nil {
		key := viper.GetString("system.csrf-secret")
		if key == "" {
			key = viper.GetString("system.jwt-secret")
		}
		csrfSecretKey = []byte(key)
	}
	return csrfSecretKey
}

// generateToken creates a CSRF token with timestamp and HMAC
func generateToken(sessionID string) string {
	timestamp := fmt.Sprintf("%d", time.Now().Unix())
	data := sessionID + ":" + timestamp

	h := hmac.New(sha256.New, getSecretKey())
	h.Write([]byte(data))
	signature := hex.EncodeToString(h.Sum(nil))

	token := timestamp + ":" + signature
	return base64.URLEncoding.EncodeToString([]byte(token))
}

// validateToken verifies the CSRF token
func validateToken(sessionID, tokenString string) error {
	if tokenString == "" {
		return errors.New("CSRF token missing")
	}

	decoded, err := base64.URLEncoding.DecodeString(tokenString)
	if err != nil {
		return errors.New("invalid CSRF token encoding")
	}

	parts := strings.SplitN(string(decoded), ":", 2)
	if len(parts) != 2 {
		return errors.New("invalid CSRF token format")
	}

	timestamp := parts[0]
	signature := parts[1]

	// Check token age (max 1 hour)
	var ts int64
	if _, err := fmt.Sscanf(timestamp, "%d", &ts); err != nil {
		return errors.New("invalid CSRF token timestamp")
	}
	if time.Now().Unix()-ts > 3600 {
		return errors.New("CSRF token expired")
	}

	// Verify signature
	data := sessionID + ":" + timestamp
	h := hmac.New(sha256.New, getSecretKey())
	h.Write([]byte(data))
	expectedSig := hex.EncodeToString(h.Sum(nil))

	if !hmac.Equal([]byte(signature), []byte(expectedSig)) {
		return errors.New("CSRF token signature mismatch")
	}

	return nil
}

// isSafeMethod returns true for methods that don't need CSRF protection
func isSafeMethod(method string) bool {
	switch method {
	case "GET", "HEAD", "OPTIONS", "TRACE":
		return true
	}
	return false
}

// isSafePath returns true for paths that don't need CSRF protection
func isSafePath(path string) bool {
	// WebSocket upgrade is protected by CheckOrigin
	if strings.Contains(path, "/exec") {
		return true
	}
	// Public endpoints
	if strings.HasPrefix(path, "/api/auth/") ||
		strings.HasPrefix(path, "/api/cap/") ||
		strings.HasPrefix(path, "/api/account/verifyEmailCode") ||
		strings.HasPrefix(path, "/api/account/sendForgetPasswordEmail") ||
		strings.HasPrefix(path, "/api/account/resetPassword") ||
		strings.HasPrefix(path, "/api/game/list") ||
		strings.HasPrefix(path, "/api/client-config") {
		return true
	}
	return false
}

// CSRFProtection middleware for state-changing requests
func CSRFProtection() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Safe methods don't need CSRF protection
		if isSafeMethod(c.Request.Method) {
			c.Next()
			return
		}

		// Skip safe paths
		if isSafePath(c.FullPath()) {
			c.Next()
			return
		}

		// Get session ID from JWT claims
		sessionID := c.ClientIP() // Fallback to IP if no user

		// Get token from header or form
		token := c.GetHeader(csrfHeaderName)
		if token == "" {
			token = c.PostForm(csrfFormName)
		}
		if token == "" {
			token = c.Query(csrfFormName)
		}

		if err := validateToken(sessionID, token); err != nil {
			c.JSON(http.StatusForbidden, gin.H{
				"code":    403,
				"message": "CSRF token validation failed",
			})
			c.Abort()
			return
		}

		c.Next()
	}
}

// GetCSRFToken generates and returns a CSRF token for the current session
func GetCSRFToken(c *gin.Context) string {
	sessionID := c.ClientIP()
	token := generateToken(sessionID)

	// Set CSRF cookie
	c.SetCookie(
		csrfCookieName,
		token,
		3600,
		"/",
		"",
		true,  // Secure
		false, // HttpOnly=false so JS can read it for SPA
	)

	return token
}
