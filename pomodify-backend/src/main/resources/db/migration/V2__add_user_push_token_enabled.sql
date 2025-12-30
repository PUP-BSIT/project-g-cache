-- V2: Add enabled column to user_push_token
-- Note: V1 baseline now includes this column, so this is a no-op for fresh installs
ALTER TABLE user_push_token ADD COLUMN IF NOT EXISTS enabled BOOLEAN NOT NULL DEFAULT TRUE;
