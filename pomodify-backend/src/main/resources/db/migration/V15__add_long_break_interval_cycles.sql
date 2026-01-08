-- V15__add_long_break_interval_cycles.sql
-- Add column for cycle-based long break interval (replaces time-based interval)

-- Add the new column with default value of 4 cycles
ALTER TABLE pomodoro_session 
ADD COLUMN IF NOT EXISTS long_break_interval_cycles INTEGER DEFAULT 4;

-- Migrate existing data: convert time-based interval to cycle-based
-- Formula: cycles = interval_minutes / (focus_minutes + break_minutes)
-- Only update FREESTYLE sessions that have long_break_interval set
UPDATE pomodoro_session 
SET long_break_interval_cycles = GREATEST(2, LEAST(10, 
    COALESCE(
        FLOOR(
            EXTRACT(EPOCH FROM long_break_interval) / 
            (EXTRACT(EPOCH FROM focus_duration) + EXTRACT(EPOCH FROM break_duration))
        ),
        4
    )
))
WHERE session_type = 'FREESTYLE' 
  AND long_break_interval IS NOT NULL
  AND long_break_interval_cycles IS NULL;

-- Set default for any remaining NULL values
UPDATE pomodoro_session 
SET long_break_interval_cycles = 4 
WHERE long_break_interval_cycles IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN pomodoro_session.long_break_interval_cycles IS 'Number of focus-break cycles before a long break (2-10, default 4)';
