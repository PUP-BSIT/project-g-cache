# Deployment Issue Summary

## Problem
Backend was timing out during startup with 502 Bad Gateway error. The deployment script waited for health check but backend never became ready.

## Root Cause
**Incomplete Flyway migrations + Wrong DDL strategy**

The V1 migration only created the `pomodoro_session` table but referenced other tables (`activity`, `app_user`) that didn't exist. The database schema was originally created by JPA's `ddl-auto=update`, but production was using `ddl-auto=none`, causing a mismatch.

## Solution Applied

### 1. Changed DDL Strategy (Critical Fix)
```yaml
# Before
-e DDL_AUTO=none

# After  
-e DDL_AUTO=update
```

This allows JPA to create the base schema from entity definitions, then Flyway applies incremental migrations.

### 2. Made All Migrations Idempotent
- **V1**: Added `IF NOT EXISTS` and `IF EXISTS` checks
- **V2**: Added table existence check before ALTER
- **V6, V7**: Added `IF EXISTS` to DROP COLUMN
- **V9**: Already idempotent

### 3. Fixed Other Issues
- Added missing `DB_USERNAME` environment variable
- Fixed container name in diagnostics (`pomodify-backend` not `pomodoro-backend`)
- Increased timeout from 20m to 30m
- Increased health check retries from 50 to 90
- Removed quotes from environment variables

## Files Changed

1. `.github/workflows/deploy.yml` - Deployment configuration
2. `pomodify-backend/src/main/resources/db/migration/V1__.sql` - Made idempotent
3. `pomodify-backend/src/main/resources/db/migration/V2__add_user_push_token_enabled.sql` - Added table check
4. `pomodify-backend/src/main/resources/db/migration/V6__remove_tick_sound_column.sql` - Added IF EXISTS
5. `pomodify-backend/src/main/resources/db/migration/V7__remove_google_calendar_sync_column.sql` - Added IF EXISTS

## Testing the Fix

Push to main branch and monitor:

1. **Docker images build successfully** ✓
2. **Backend container starts** - Check logs: `sudo docker logs pomodify-backend`
3. **JPA creates schema** - Look for "Hibernate: create table" messages
4. **Flyway runs migrations** - Look for "Flyway" messages
5. **Health check passes** - `/actuator/health` returns `{"status":"UP"}`
6. **502 error resolved** - Frontend can reach backend

## Expected Deployment Time
- Image pull: ~30 seconds
- Database ready check: ~5 seconds
- Backend startup: 2-3 minutes
  - JPA schema creation: ~30 seconds
  - Flyway migrations: ~10 seconds
  - Spring Boot initialization: ~90 seconds
- Health checks: ~1 minute
- **Total: ~4-5 minutes**

## Rollback Plan

If deployment still fails:

1. Check backend logs: `sudo docker logs pomodify-backend`
2. Look for specific errors:
   - `PSQLException` - Database connection issue
   - `FlywayException` - Migration failure
   - `BeanCreationException` - Spring configuration issue
3. Verify secrets are set correctly in GitHub
4. Check database is accessible from EC2
5. Consider manual migration if needed

## Long-term Recommendation

Create a complete V0 or V1 migration with full schema definition, then make V2-V9 truly incremental. This would allow using `ddl-auto=none` in production for better control.

Alternatively, continue with the hybrid approach (JPA + Flyway) which works well for most applications.
