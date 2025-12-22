# Deployment Fixes Applied - UPDATED

## Root Cause Analysis

The deployment was failing because of **Flyway migration issues**:

1. **V1 migration is incomplete** - Only creates `pomodoro_session` table, not the base schema (`app_user`, `activity`, etc.)
2. **V1 was not idempotent** - Used `CREATE TABLE` without `IF NOT EXISTS` and `DROP` without `IF EXISTS`
3. **V2 referenced non-existent table** - Tried to alter `user_push_token` which doesn't exist in fresh database
4. **V6 and V7 not idempotent** - Used `DROP COLUMN` without `IF EXISTS`
5. **DDL_AUTO was set to 'none'** - Prevented JPA from creating base schema
6. **Container name mismatch** - Diagnostics checked wrong container name
7. **Timeout too short** - Not enough time for migrations + startup

## Critical Fix: Schema Creation Strategy

The database schema was originally created by JPA's `ddl-auto=update`, not by Flyway migrations. V1-V9 are incremental changes, not a complete schema definition.

**Solution**: Changed `DDL_AUTO=none` to `DDL_AUTO=update` in production deployment to allow JPA to create/update the base schema, then Flyway applies incremental migrations on top.

This hybrid approach:
- ✅ JPA creates base tables from entity definitions
- ✅ Flyway applies incremental schema changes
- ✅ Works on both fresh and existing databases
- ✅ Maintains schema version tracking

### 1. Command Timeout Too Short
**Problem**: The SSH action had `command_timeout: 20m` which wasn't enough for the full deployment process including Flyway migrations.

**Fix**: Increased to `command_timeout: 30m` and connection timeout to `timeout: 600s`

### 2. Container Name Mismatch in Diagnostics
**Problem**: The error diagnostics were checking for `pomodoro-backend` but the actual container name is `pomodify-backend`.

**Fix**: Updated all references to use the correct container name `pomodify-backend`

### 3. Missing DB_USERNAME Environment Variable
**Problem**: The backend container wasn't receiving the `DB_USERNAME` environment variable, only `DB_URL` and `DB_PASSWORD`.

**Fix**: Added `-e DB_USERNAME=${{ secrets.DB_USERNAME }}` to the docker run command

### 4. Unnecessary Flyway Environment Variables
**Problem**: The deployment script was setting `SPRING_FLYWAY_ENABLED` and `SPRING_FLYWAY_BASELINE_ON_MIGRATE` as environment variables, but these are already configured in `application.properties`.

**Fix**: Removed these redundant environment variables. Flyway is enabled by default in the application.properties with proper baseline configuration.

### 5. Quoted Environment Variables
**Problem**: Environment variables were wrapped in single quotes (e.g., `'prod'`, `'true'`) which can cause issues with Spring Boot property parsing.

**Fix**: Removed quotes from all environment variables

### 6. Insufficient Health Check Retries
**Problem**: Backend health check had 50 retries × 4 seconds = 200 seconds (~3.3 minutes) which might not be enough for Flyway migrations + Spring Boot startup.

**Fix**: 
- Increased retries from 50 to 90
- Increased sleep interval from 4 to 5 seconds
- Total wait time now: 90 × 5 = 450 seconds (~7.5 minutes)
- Reduced initial sleep from 180s to 60s to start checking earlier

### 7. Added Early Log Visibility
**Problem**: No visibility into backend startup process until health check fails.

**Fix**: Added log output after initial 60-second wait to show startup progress and catch errors early

## Summary of Changes

### Timeout Configuration
```yaml
timeout: 600s          # Increased from 360s
command_timeout: 30m   # Increased from 20m
```

### Backend Container Environment Variables
- Added: `DB_USERNAME`
- Removed quotes from all values
- **Changed: `DDL_AUTO=update`** (was `none`) - Critical fix to allow JPA schema creation
- Fixed: `JWT_REFRESH_EXPIRATION` (was `JWT_REFRESH_TOKEN_EXPIRATION`)

### Migration Files Made Idempotent
All migration files now use safe SQL patterns:

**V1__.sql**:
- Changed `CREATE TABLE` to `CREATE TABLE IF NOT EXISTS`
- Changed `DROP TABLE` to `DROP TABLE IF EXISTS`
- Changed `DROP SEQUENCE` to `DROP SEQUENCE IF EXISTS`
- Wrapped `ALTER TABLE ADD CONSTRAINT` in conditional block

**V2__add_user_push_token_enabled.sql**:
- Wrapped in `DO $$ BEGIN ... END $$` block
- Checks if `user_push_token` table exists before altering

**V6__remove_tick_sound_column.sql**:
- Changed `DROP COLUMN` to `DROP COLUMN IF EXISTS`

**V7__remove_google_calendar_sync_column.sql**:
- Changed `DROP COLUMN` to `DROP COLUMN IF EXISTS`

**V9** was already idempotent with proper `IF NOT EXISTS` checks.

### Health Check Configuration
- Initial wait: 60 seconds (reduced from 180s)
- Retries: 90 (increased from 50)
- Sleep interval: 5 seconds (increased from 4s)
- Total max wait: ~8.5 minutes (increased from ~6.3 minutes)

### Diagnostics
- Fixed container name from `pomodoro-backend` to `pomodify-backend`
- Added early log output after initial wait

## Expected Behavior

1. Backend container starts with `DDL_AUTO=update`
2. JPA creates/updates base schema from entity definitions
3. Flyway runs incremental migrations (V1-V9) to add columns, indexes, etc.
4. Spring Boot application completes startup
5. Health check endpoint becomes available at `/actuator/health`
6. Deployment completes successfully

## Why This Approach Works

### Hybrid Schema Management
- **JPA (ddl-auto=update)**: Creates base tables from `@Entity` classes
  - `app_user`, `activity`, `pomodoro_session`, `user_settings`, etc.
  - Handles entity relationships and constraints
  - Safe for production (only adds, never drops)

- **Flyway**: Applies incremental changes
  - Column additions (V2, V5, V8)
  - Column removals (V6, V7)
  - Table restructuring (V9)
  - Maintains version history in `flyway_schema_history`

### Benefits
- ✅ Works on fresh databases (JPA creates schema)
- ✅ Works on existing databases (Flyway tracks applied migrations)
- ✅ All migrations are idempotent (safe to re-run)
- ✅ No manual schema setup required
- ✅ Version controlled schema changes

## Flyway Configuration

Flyway is configured in `application.properties`:
```properties
spring.flyway.baselineOnMigrate=true
spring.flyway.baselineVersion=0
spring.flyway.ignoreMissingMigrations=true
spring.flyway.validateOnMigrate=false
```

This configuration:
- Enables automatic baseline creation for existing databases
- Ignores missing migrations (for flexibility)
- Skips validation to avoid strict version checking issues
- Runs automatically when Spring Boot starts

## Testing Recommendations

1. Monitor the deployment logs for Flyway migration messages
2. Check that all 9 migrations (V1-V9) are applied successfully
3. Verify the backend logs show "Started Application" message
4. Confirm health endpoint returns `{"status":"UP"}`
5. Test database schema has all expected tables

## Rollback Plan

If deployment still fails:
1. Check backend container logs: `sudo docker logs pomodify-backend`
2. Verify database connectivity: Test with psql command
3. Check Flyway migration status in database: `SELECT * FROM flyway_schema_history;`
4. Verify all secrets are properly set in GitHub
5. Consider running migrations manually if Flyway fails
