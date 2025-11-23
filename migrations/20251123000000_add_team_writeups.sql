-- +goose Up
-- +goose StatementBegin
CREATE TABLE "team_writeups" (
    "writeup_id" BIGSERIAL NOT NULL,
    "game_id" BIGINT NOT NULL,
    "team_id" BIGINT NOT NULL,
    "upload_id" uuid NOT NULL,
    "submitted_by" uuid,
    "file_name" text NOT NULL,
    "file_size" BIGINT NOT NULL,
    "file_type" text NOT NULL,
    "created_at" timestamp NOT NULL DEFAULT NOW(),
    "updated_at" timestamp NOT NULL DEFAULT NOW(),
    PRIMARY KEY (writeup_id),
    CONSTRAINT team_writeups_game_id_fkey FOREIGN KEY (game_id) REFERENCES games(game_id) ON DELETE CASCADE,
    CONSTRAINT team_writeups_team_id_fkey FOREIGN KEY (team_id) REFERENCES teams(team_id) ON DELETE CASCADE,
    CONSTRAINT team_writeups_upload_id_fkey FOREIGN KEY (upload_id) REFERENCES uploads(file_id) ON DELETE CASCADE,
    CONSTRAINT team_writeups_submitted_by_fkey FOREIGN KEY (submitted_by) REFERENCES users(user_id) ON DELETE SET NULL
);

CREATE UNIQUE INDEX idx_team_writeups_game_team ON team_writeups(game_id, team_id);
CREATE INDEX idx_team_writeups_game ON team_writeups(game_id);
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP TABLE IF EXISTS "team_writeups" CASCADE;
-- +goose StatementEnd
