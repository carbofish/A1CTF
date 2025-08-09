package general

import (
	"a1ctf/src/db/models"
	"a1ctf/src/utils/ristretto_tool"
	"regexp"
)

func GetUserByUserID(userId string) *models.User {
	userList, err := ristretto_tool.CachedMemberMap()
	if err != nil {
		return nil
	}
	if user, ok := userList[userId]; ok {
		return &user
	}
	return nil
}

func FindUserNameByUserID(userId string) *string {
	user := GetUserByUserID(userId)
	if user == nil {
		return nil
	}
	return &user.Username
}

func ValidatePassword(password string) bool {
	if len(password) < 6 {
		return false
	}

	checks := []string{
		`[A-Z]`,
		`[a-z]`,
		`[0-9]`,
		`[!@#$%^&*(),.?":{}|<>]`,
	}

	for _, check := range checks {
		if !regexp.MustCompile(check).MatchString(password) {
			return false
		}
	}
	return true
}
