-- V4: Create user_badge table
-- Note: V1 baseline now includes this table, so this is a no-op for fresh installs
CREATE TABLE IF NOT EXISTS user_badge (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    name VARCHAR(255) NOT NULL,
    milestone_days INTEGER NOT NULL,
    date_awarded DATE NOT NULL,
    CONSTRAINT unique_user_milestone UNIQUE (user_id, milestone_days)
);
