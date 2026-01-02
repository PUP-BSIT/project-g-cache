-- V11__add_phase_notification_fields.sql
-- Add fields for backend-triggered push notifications when phase completes

ALTER TABLE pomodoro_session 
ADD COLUMN IF NOT EXISTS phase_end_time TIMESTAMP WITHOUT TIME ZONE;

ALTER TABLE pomodoro_session 
ADD COLUMN IF NOT EXISTS phase_notified BOOLEAN DEFAULT FALSE;

-- Index for efficient querying of sessions needing notifications
CREATE INDEX IF NOT EXISTS idx_pomodoro_session_notification_check 
ON pomodoro_session(phase_end_time, phase_notified, status);

COMMENT ON COLUMN pomodoro_session.phase_end_time IS 'Expected end time of current phase for backend notification scheduling';
COMMENT ON COLUMN pomodoro_session.phase_notified IS 'Whether push notification was sent for current phase completion';
