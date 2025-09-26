-- +goose Up
-- +goose StatementBegin
ALTER TABLE game_groups ADD COLUMN invite_code UUID DEFAULT gen_random_uuid();
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
ALTER TABLE game_groups DROP COLUMN invite_code;
-- +goose StatementEnd
