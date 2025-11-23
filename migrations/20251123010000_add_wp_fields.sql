-- +goose Up
ALTER TABLE games
    ADD COLUMN IF NOT EXISTS wp_start_time timestamp NULL,
    ADD COLUMN IF NOT EXISTS wp_formats text[] NOT NULL DEFAULT ARRAY['pdf'];

-- +goose Down
-- ALTER TABLE games
--     DROP COLUMN IF EXISTS wp_start_time,
--     DROP COLUMN IF EXISTS wp_formats;
