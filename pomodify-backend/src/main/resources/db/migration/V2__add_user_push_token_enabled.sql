<<<<<<< HEAD
-- Add enabled column to user_push_token table if it exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'user_push_token'
    ) THEN
        ALTER TABLE user_push_token ADD COLUMN IF NOT EXISTS enabled BOOLEAN NOT NULL DEFAULT TRUE;
    END IF;
END $$;
=======
-- V2: Add enabled column to user_push_token
-- Note: V1 baseline now includes this column, so this is a no-op for fresh installs
ALTER TABLE user_push_token ADD COLUMN IF NOT EXISTS enabled BOOLEAN NOT NULL DEFAULT TRUE;
>>>>>>> d92e8f23198a03fec73e2c8c5618294dcf36e8e7
