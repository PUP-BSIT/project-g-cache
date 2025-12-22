-- Remove tick_sound column from user_settings table if it exists
ALTER TABLE user_settings DROP COLUMN IF EXISTS tick_sound;