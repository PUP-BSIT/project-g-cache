-- Add timer synchronization fields to pomodoro_session table
-- These fields enable precise timer state tracking across sessions

ALTER TABLE pomodoro_session 
ADD COLUMN phase_started_at TIMESTAMP,
ADD COLUMN total_paused_duration_seconds BIGINT DEFAULT 0;

-- Update existing sessions to have default values
UPDATE pomodoro_session 
SET phase_started_at = started_at,
    total_paused_duration_seconds = 0
WHERE phase_started_at IS NULL;

-- Add comments for documentation
COMMENT ON COLUMN pomodoro_session.phase_started_at IS 'Timestamp when the current phase (FOCUS/BREAK) started';
COMMENT ON COLUMN pomodoro_session.total_paused_duration_seconds IS 'Total seconds the session has been paused in current phase';