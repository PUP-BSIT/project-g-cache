CREATE TABLE IF NOT EXISTS user_badge (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    name VARCHAR(255) NOT NULL,
    milestone_days INTEGER NOT NULL,
    date_awarded DATE NOT NULL,
    CONSTRAINT unique_user_milestone UNIQUE (user_id, milestone_days)
);
