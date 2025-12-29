-- V6: Remove tick_sound column from user_settings
-- Note: V1 baseline doesn't include this column, so this is a no-op for fresh installs
ALTER TABLE user_settings DROP COLUMN IF EXISTS tick_sound;
