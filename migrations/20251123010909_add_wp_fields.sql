-- +goose Up
-- +goose StatementBegin

--- 添加 WriteUp 开始时间和格式限制字段
ALTER TABLE games
    ADD COLUMN IF NOT EXISTS wp_start_time timestamp NULL,
    ADD COLUMN IF NOT EXISTS wp_formats text[] NOT NULL DEFAULT ARRAY['pdf'];

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin

ALTER TABLE games
    DROP COLUMN IF EXISTS wp_start_time,
    DROP COLUMN IF EXISTS wp_formats;

-- +goose StatementEnd
