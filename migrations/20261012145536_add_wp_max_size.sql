-- +goose Up
-- +goose StatementBegin

--- 添加 WriteUp 上传大小限制字段，单位 MB
ALTER TABLE games
    ADD COLUMN IF NOT EXISTS wp_max_size integer NOT NULL DEFAULT 50;

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin

ALTER TABLE games
    DROP COLUMN IF EXISTS wp_max_size;

-- +goose StatementEnd
