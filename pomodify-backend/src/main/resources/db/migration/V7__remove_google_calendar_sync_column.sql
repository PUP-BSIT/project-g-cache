<<<<<<< HEAD
-- Remove google_calendar_sync column from user_settings table if it exists
ALTER TABLE user_settings DROP COLUMN IF EXISTS google_calendar_sync;
=======
-- V7: Remove google_calendar_sync column from user_settings
-- Note: V1 baseline doesn't include this column, so this is a no-op for fresh installs
ALTER TABLE user_settings DROP COLUMN IF EXISTS google_calendar_sync;
>>>>>>> d92e8f23198a03fec73e2c8c5618294dcf36e8e7
