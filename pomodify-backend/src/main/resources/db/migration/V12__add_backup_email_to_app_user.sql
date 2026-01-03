-- Add backup_email column to app_user table for account recovery
ALTER TABLE app_user ADD COLUMN backup_email VARCHAR(255);
