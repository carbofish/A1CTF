-- +goose Up
-- +goose StatementBegin
ALTER TABLE games ADD COLUMN group_invite_code_enable bool DEFAULT false;
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
ALTER TABLE games DROP COLUMN group_invite_code_enable;
-- +goose StatementEnd
