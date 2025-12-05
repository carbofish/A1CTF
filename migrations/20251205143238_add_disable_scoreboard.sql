-- +goose Up
-- +goose StatementBegin
ALTER TABLE games
    ADD COLUMN IF NOT EXISTS scoreboard_enabled bool DEFAULT true NOT NULL;
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
ALTER TABLE games
    DROP COLUMN IF EXISTS scoreboard_enabled;
-- +goose StatementEnd
