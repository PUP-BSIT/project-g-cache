
DO $$
BEGIN
	-- Add the column if it does not exist
	IF NOT EXISTS (
		SELECT 1 FROM information_schema.columns 
		WHERE table_name='app_user' AND column_name='auth_provider'
	) THEN
		ALTER TABLE app_user ADD COLUMN auth_provider VARCHAR(255);
	END IF;

	-- Set all NULLs to 'LOCAL'
	UPDATE app_user SET auth_provider = 'LOCAL' WHERE auth_provider IS NULL;

	-- Set NOT NULL constraint if not already set
	BEGIN
		ALTER TABLE app_user ALTER COLUMN auth_provider SET NOT NULL;
	EXCEPTION WHEN others THEN
		-- ignore if already set
	END;

	-- Set default if not already set
	BEGIN
		ALTER TABLE app_user ALTER COLUMN auth_provider SET DEFAULT 'LOCAL';
	EXCEPTION WHEN others THEN
		-- ignore if already set
	END;
END$$;
