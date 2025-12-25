# How to Verify the Deployment Fix

## Before Pushing

1. **Review the changes**:
   ```bash
   git status
   git diff .github/workflows/deploy.yml
   git diff pomodify-backend/src/main/resources/db/migration/
   ```

2. **Commit and push**:
   ```bash
   git add .
   git commit -m "Fix deployment: Use DDL_AUTO=update and make migrations idempotent"
   git push origin main
   ```

## Monitor the Deployment

### 1. Watch GitHub Actions
- Go to: https://github.com/YOUR_USERNAME/project-g-cache/actions
- Click on the latest "Deploy to Production" workflow
- Watch the "Deploy via SSH" step

### 2. Key Log Messages to Look For

**✅ Success Indicators:**
```
✅ Database is ready
Starting backend container with Flyway migrations...
Backend startup logs (first 50 lines):
  .   ____          _            __ _ _
 /\\ / ___'_ __ _ _(_)_ __  __ _ \ \ \ \
...
Hibernate: create table if not exists app_user ...
Flyway Community Edition ... by Redgate
Successfully validated 9 migrations
Migrating schema "public" to version ...
Successfully applied X migrations
Started PomodifyApiApplication in X.XXX seconds
✅ Frontend is healthy
✅ Backend is healthy and responding
✅ Flyway migrations completed successfully
✅ Core database tables verified
🎉 DEPLOYMENT COMPLETED SUCCESSFULLY
```

**❌ Error Indicators:**
```
❌ Failed to start backend container
❌ Backend health check failed after 90 retries
PSQLException: Connection refused
FlywayException: Migration failed
BeanCreationException: Error creating bean
```

### 3. Check Backend Logs Directly (if needed)

SSH into your EC2 instance:
```bash
ssh -i your-key.pem ubuntu@your-ec2-ip
```

Check backend container:
```bash
# Is it running?
sudo docker ps | grep pomodify-backend

# View logs
sudo docker logs pomodify-backend

# Follow logs in real-time
sudo docker logs -f pomodify-backend

# Check last 100 lines
sudo docker logs pomodify-backend 2>&1 | tail -100

# Search for errors
sudo docker logs pomodify-backend 2>&1 | grep -i "error\|exception\|failed"

# Check Flyway specifically
sudo docker logs pomodify-backend 2>&1 | grep -i "flyway"
```

### 4. Test the Application

**Frontend:**
```bash
curl http://your-domain:8080
# Should return HTML
```

**Backend Health:**
```bash
curl http://your-domain:8081/actuator/health
# Should return: {"status":"UP"}
```

**Backend API:**
```bash
curl http://your-domain:8081/api/v2/health
# Should return API response
```

**Through Nginx (if configured):**
```bash
curl https://api.pomodify.site/actuator/health
curl https://pomodify.site
```

### 5. Verify Database Schema

Connect to your database:
```bash
PGPASSWORD='your-password' psql -h your-db-host -U your-username -d your-database -p 5432
```

Check tables:
```sql
-- List all tables
\dt

-- Check Flyway history
SELECT * FROM flyway_schema_history ORDER BY installed_rank;

-- Verify core tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('app_user', 'activity', 'pomodoro_session', 'user_settings', 'user_badge');

-- Check auth_provider column exists
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'app_user' 
AND column_name = 'auth_provider';
```

Expected Flyway history:
```
 installed_rank | version | description                          | success 
----------------+---------+--------------------------------------+---------
              1 | 1       |                                      | t
              2 | 2       | add user push token enabled          | t
              3 | 3       | create user settings                 | t
              4 | 4       | create user badge table              | t
              5 | 5       | add timer sync fields                | t
              6 | 6       | remove tick sound column             | t
              7 | 7       | remove google calendar sync column   | t
              8 | 8       | add auth provider to app user        | t
              9 | 9       | create pomodoro session table        | t
```

## Troubleshooting

### If Backend Still Times Out

1. **Check if it's a Flyway issue**:
   ```bash
   sudo docker logs pomodify-backend 2>&1 | grep -A 10 "Flyway"
   ```

2. **Check if it's a database connection issue**:
   ```bash
   sudo docker logs pomodify-backend 2>&1 | grep -i "connection\|database"
   ```

3. **Check if it's a Spring Boot issue**:
   ```bash
   sudo docker logs pomodify-backend 2>&1 | grep -i "started\|failed\|error"
   ```

### If Migrations Fail

1. **Check Flyway schema history**:
   ```sql
   SELECT * FROM flyway_schema_history WHERE success = false;
   ```

2. **Manually repair if needed**:
   ```sql
   -- If a migration is marked as failed but you've fixed it
   DELETE FROM flyway_schema_history WHERE version = 'X' AND success = false;
   ```

3. **Restart backend container**:
   ```bash
   sudo docker restart pomodify-backend
   sudo docker logs -f pomodify-backend
   ```

### If 502 Persists

1. **Check nginx configuration**:
   ```bash
   sudo nginx -t
   sudo systemctl status nginx
   sudo cat /etc/nginx/sites-available/default
   ```

2. **Check if backend is listening**:
   ```bash
   sudo netstat -tlnp | grep 8081
   curl http://localhost:8081/actuator/health
   ```

3. **Check Docker network**:
   ```bash
   sudo docker network inspect pomodify-net
   ```

## Success Criteria

✅ Deployment completes in under 10 minutes
✅ No timeout errors
✅ Backend health check passes
✅ Frontend loads successfully
✅ No 502 Bad Gateway errors
✅ All 9 Flyway migrations applied
✅ Database schema is complete
✅ Application is accessible via domain

## Next Steps After Successful Deployment

1. Test user registration/login
2. Test pomodoro timer functionality
3. Verify Google OAuth works
4. Check email notifications
5. Monitor logs for any runtime errors
6. Set up monitoring/alerting for future deployments
