-- Create scheduled_push_notifications table for server-side timer notifications
CREATE TABLE IF NOT EXISTS scheduled_push_notifications (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    session_id BIGINT,
    activity_id BIGINT,
    title VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
    sent BOOLEAN NOT NULL DEFAULT FALSE,
    cancelled BOOLEAN NOT NULL DEFAULT FALSE,
    notification_type VARCHAR(50),
    current_phase VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_scheduled_push_user FOREIGN KEY (user_id) REFERENCES app_user(id) ON DELETE CASCADE
);

-- Index for efficient querying of due notifications
CREATE INDEX idx_scheduled_push_due ON scheduled_push_notifications (scheduled_at, sent, cancelled) 
    WHERE sent = FALSE AND cancelled = FALSE;

-- Index for session-based lookups
CREATE INDEX idx_scheduled_push_session ON scheduled_push_notifications (session_id) 
    WHERE sent = FALSE AND cancelled = FALSE;

-- Index for user-based lookups
CREATE INDEX idx_scheduled_push_user ON scheduled_push_notifications (user_id);
