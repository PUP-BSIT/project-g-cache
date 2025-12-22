# Deployment Fixes Applied

## Issues Identified

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
- Removed: `SPRING_FLYWAY_ENABLED` (already in application.properties)
- Removed: `SPRING_FLYWAY_BASELINE_ON_MIGRATE` (already in application.properties)
- Fixed: `JWT_REFRESH_EXPIRATION` (was `JWT_REFRESH_TOKEN_EXPIRATION`)

### Health Check Configuration
- Initial wait: 60 seconds (reduced from 180s)
- Retries: 90 (increased from 50)
- Sleep interval: 5 seconds (increased from 4s)
- Total max wait: ~8.5 minutes (increased from ~6.3 minutes)

### Diagnostics
- Fixed container name from `pomodoro-backend` to `pomodify-backend`
- Added early log output after initial wait

## Expected Behavior

1. Backend container starts with proper environment variables
2. Flyway migrations run automatically (configured in application.properties)
3. Spring Boot application starts
4. Health check endpoint becomes available at `/actuator/health`
5. Deployment completes successfully within 30 minutes

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
