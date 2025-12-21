-- V8__add_auth_provider_to_app_user.sql
-- Adds the missing 'auth_provider' column to the 'app_user' table for proper authentication provider tracking
ALTER TABLE app_user ADD COLUMN IF NOT EXISTS auth_provider VARCHAR(255) NOT NULL DEFAULT 'LOCAL';
