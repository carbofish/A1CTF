package noticetool

import (
	"a1ctf/src/db/models"
	dbtool "a1ctf/src/utils/db_tool"
	"a1ctf/src/utils/zaphelper"
	"time"

	"github.com/bytedance/sonic"
	"github.com/lib/pq"
	"go.uber.org/zap"
)

func InsertNotice(gameID int64, category models.NoticeCategory, values []string) {
	notice := models.Notice{
		GameID:         gameID,
		CreateTime:     time.Now().UTC(),
		NoticeCategory: category,
		Announced:      false,
		Data:           pq.StringArray(values),
	}

	// 写入db是同步的，通知是异步的
	if err := dbtool.DB().Create(&notice).Error; err != nil {
		zaphelper.Logger.Error("Failed to insert notice", zap.Error(err))
	} else {
		go func() { AnnounceNotice(notice) }()
	}
}

func AnnounceNotice(notice models.Notice) {
	for session, gid := range dbtool.GameSessions() {
		if gid == notice.GameID {
			msg, _ := sonic.Marshal(map[string]interface{}{
				"type": "Notice",
				"message": map[string]interface{}{
					"notice_id":       notice.NoticeID,
					"notice_category": notice.NoticeCategory,
					"data":            notice.Data,
					"create_time":     notice.CreateTime,
				},
			})
			session.Write([]byte(msg))
		}
	}
}
