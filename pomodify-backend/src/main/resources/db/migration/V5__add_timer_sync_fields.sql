-- V5: Add timer synchronization fields to pomodoro_session
-- Note: V1 baseline now includes these columns, so this is a no-op for fresh installs
ALTER TABLE pomodoro_session 
ADD COLUMN IF NOT EXISTS phase_started_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS total_paused_duration_seconds BIGINT DEFAULT 0;
