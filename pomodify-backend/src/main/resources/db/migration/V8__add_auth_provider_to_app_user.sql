<<<<<<< HEAD
<<<<<<< HEAD
-- V8__add_auth_provider_to_app_user.sql
-- Adds the missing 'auth_provider' column to the 'app_user' table for proper authentication provider tracking
ALTER TABLE app_user ADD COLUMN IF NOT EXISTS auth_provider VARCHAR(255) NOT NULL DEFAULT 'LOCAL';
=======

=======
-- V8: Add auth_provider column to app_user
-- Note: V1 baseline now includes this column, so this is a no-op for fresh installs
>>>>>>> d92e8f23198a03fec73e2c8c5618294dcf36e8e7
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='app_user' AND column_name='auth_provider'
    ) THEN
        ALTER TABLE app_user ADD COLUMN auth_provider VARCHAR(255) DEFAULT 'LOCAL' NOT NULL;
    END IF;
END$$;
>>>>>>> db5c0875d41faf602ccea256a6cce0acc27d9f1a
