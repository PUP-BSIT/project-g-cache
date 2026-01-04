-- Add column to store remaining seconds when session is paused
ALTER TABLE pomodoro_session ADD COLUMN IF NOT EXISTS remaining_seconds_at_pause BIGINT;
    