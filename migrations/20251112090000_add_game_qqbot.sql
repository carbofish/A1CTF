-- +goose Up
-- +goose StatementBegin
ALTER TABLE games ADD COLUMN IF NOT EXISTS qq_bot_enabled bool DEFAULT false;
ALTER TABLE games ADD COLUMN IF NOT EXISTS qq_bot_api_base text;
ALTER TABLE games ADD COLUMN IF NOT EXISTS qq_bot_access_token text;
ALTER TABLE games ADD COLUMN IF NOT EXISTS qq_bot_group_id text;
ALTER TABLE games ADD COLUMN IF NOT EXISTS qq_bot_push_all_submits bool DEFAULT false;
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
ALTER TABLE games DROP COLUMN IF EXISTS qq_bot_enabled;
ALTER TABLE games DROP COLUMN IF EXISTS qq_bot_api_base;
ALTER TABLE games DROP COLUMN IF EXISTS qq_bot_access_token;
ALTER TABLE games DROP COLUMN IF EXISTS qq_bot_group_id;
ALTER TABLE games DROP COLUMN IF EXISTS qq_bot_push_all_submits;
-- +goose StatementEnd