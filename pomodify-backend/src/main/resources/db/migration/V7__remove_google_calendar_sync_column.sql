-- Remove google_calendar_sync column from user_settings table if it exists
ALTER TABLE user_settings DROP COLUMN IF EXISTS google_calendar_sync;