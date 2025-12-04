CREATE TABLE IF NOT EXISTS user_settings (
    user_id BIGINT PRIMARY KEY,
    notification_sound BOOLEAN DEFAULT TRUE,
    sound_type VARCHAR(50) DEFAULT 'BELL',
    volume INT DEFAULT 70,
    tick_sound BOOLEAN DEFAULT FALSE,
    auto_start_breaks BOOLEAN DEFAULT FALSE,
    auto_start_pomodoros BOOLEAN DEFAULT FALSE,
    theme VARCHAR(50) DEFAULT 'SYSTEM',
    notifications_enabled BOOLEAN DEFAULT TRUE,
    google_calendar_sync BOOLEAN DEFAULT FALSE,
    updated_at TIMESTAMP NULL
);
