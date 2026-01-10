-- =====================================================
-- V18 Migration - Fix password_reset_token expiry_date timezone
-- Changes TIMESTAMP to TIMESTAMP WITH TIME ZONE for proper
-- timezone handling with Java Instant
-- =====================================================

DELETE FROM password_reset_token;
ALTER TABLE password_reset_token ALTER COLUMN expiry_date TYPE TIMESTAMP WITH TIME ZONE;
