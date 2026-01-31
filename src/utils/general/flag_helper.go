package general

import (
	"crypto/rand"
	"math/big"
	"regexp"
	"slices"
	"strconv"
	"strings"

	"github.com/google/uuid"
)

// leetmap from somewhere... idk
var leetMap = map[string]string{
	"A": "Aa4@",
	"B": "Bb68",
	"C": "Cc",
	"D": "Dd",
	"E": "Ee3",
	"F": "Ff1",
	"G": "Gg69",
	"H": "Hh",
	"I": "Ii1l",
	"J": "Jj",
	"K": "Kk",
	"L": "Ll1I",
	"M": "Mm",
	"N": "Nn",
	"O": "Oo0#",
	"P": "Pp",
	"Q": "Qq9",
	"R": "Rr",
	"S": "Ss5",
	"T": "Tt7",
	"U": "Uu",
	"V": "Vv",
	"W": "Ww",
	"X": "Xx",
	"Y": "Yy",
	"Z": "Zz2?",
	"0": "0oO#",
	"1": "1lI",
	"2": "2zZ",
	"3": "3eE",
	"4": "4aA",
	"5": "5Ss",
	"6": "6Gb",
	"7": "7T",
	"8": "8B&",
	"9": "9g",
	"_": "_",
}

var templateList = []string{
	"[team_hash]",
	"[team_name]",
	"[uuid]",
	"[game_id]",
}

func findChar(flag string) int {
	for i := 0; i < len(flag); i++ {
		if flag[i] == '[' {
			return -1
		}
		if flag[i] == ']' {
			return i
		}
	}
	return -1
}

func LeetFlag(flag string) string {
	newFlag := ""
	i := 0

	for i < len(flag) {
		if flag[i] == '[' {
			end := findChar(flag[i+1:])
			if end == -1 {
				i++
				newFlag += "["
				continue
			}
			template_name := flag[i : i+end+2]

			if slices.Contains(templateList, template_name) || strings.HasPrefix(template_name, "[random_string_") {
				newFlag += flag[i : i+end+2]
				i = i + end + 2
				continue
			}
		}

		addenChar := strings.ToUpper(string(flag[i]))

		if replacement, exists := leetMap[addenChar]; exists {
			num, err := rand.Int(rand.Reader, big.NewInt(int64(len(replacement))))
			if err != nil {
				panic(err)
			}
			addenChar = string(replacement[num.Int64()])
		}

		newFlag += addenChar

		i++
	}
	return newFlag
}

func TestFlagMaxLength(flag string) int64 {
	flag = flag[strings.Index(flag, "{")+1 : strings.Index(flag, "}")]

	total := int64(1)
	i := 0

	for i < len(flag) {
		if flag[i] == '[' {
			end := findChar(flag[i+1:])
			if end == -1 {
				i++
				continue
			}
			template_name := flag[i : i+end+2]

			if slices.Contains(templateList, template_name) || strings.HasPrefix(template_name, "[random_string_") {
				i = i + end + 2
				continue
			}
		}

		addenChar := strings.ToUpper(string(flag[i]))

		if replacement, exists := leetMap[addenChar]; exists {
			total *= int64(len(replacement))
		}

		i++
	}
	return total
}

func ReplaceTemplateFlag(flag string, data map[string]string) string {
	flag = strings.ReplaceAll(flag, "[team_hash]", data["team_hash"])
	flag = strings.ReplaceAll(flag, "[team_name]", data["team_name"])
	flag = strings.ReplaceAll(flag, "[uuid]", uuid.New().String())
	flag = strings.ReplaceAll(flag, "[game_id]", data["game_id"])

	// process special length random string
	flag = regexp.MustCompile(`\[random_string_\d+\]`).ReplaceAllStringFunc(flag, func(s string) string {
		length, _ := strconv.Atoi(strings.ReplaceAll(strings.TrimPrefix(s, "[random_string_"), "]", ""))
		return RandomString(length)
	})

	return flag
}

func ProcessFlag(flag string, data map[string]string, shouldLeet bool) string {
	flagHead := ""
	flagBody := flag

	if strings.Contains(flag, "{") && strings.Contains(flag, "}") {
		flagHead = flag[:strings.Index(flag, "{")]
		flagBody = flag[strings.Index(flag, "{")+1 : strings.Index(flag, "}")]
	}

	if shouldLeet {
		flagBody = LeetFlag(flagBody)
	}
	flagBody = ReplaceTemplateFlag(flagBody, data)

	if flagHead != "" {
		return flagHead + "{" + flagBody + "}"
	} else {
		return flagBody
	}
}
