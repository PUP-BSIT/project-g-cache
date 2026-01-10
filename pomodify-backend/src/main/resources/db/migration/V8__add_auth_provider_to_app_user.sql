-- V8: Add auth_provider column to app_user
-- Note: V1 baseline now includes this column, so this is a no-op for fresh installs
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='app_user' AND column_name='auth_provider'
    ) THEN
        ALTER TABLE app_user ADD COLUMN auth_provider VARCHAR(255) DEFAULT 'LOCAL' NOT NULL;
    END IF;
END$$;
