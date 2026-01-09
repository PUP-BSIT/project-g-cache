-- Fix typo: CHYME -> CHIME in sound_type enum

-- Update existing data
UPDATE user_settings SET sound_type = 'CHIME' WHERE sound_type = 'CHYME';

-- Drop and recreate the constraint with correct spelling
ALTER TABLE user_settings DROP CONSTRAINT IF EXISTS user_settings_sound_type_check;
ALTER TABLE user_settings ADD CONSTRAINT user_settings_sound_type_check 
    CHECK (sound_type IN ('BELL', 'CHIME', 'DIGITAL_BEEP', 'SOFT_DING'));
