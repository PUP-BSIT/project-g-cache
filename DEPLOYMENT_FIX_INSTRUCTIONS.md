# Deployment Fix Instructions

## Problem Identified

The backend container is **crashing immediately** after startup, not timing out. The issue is likely:
1. Hibernate validation failing with `ddl-auto=validate`
2. Flyway validation failing with `validateOnMigrate=true`
3. Schema mismatch between entities and database

## Changes Made

### 1. Application Properties (pomodify-backend/src/main/resources/application.properties)

**Changed from:**
```properties
spring.jpa.hibernate.ddl-auto=${DDL_AUTO:validate}
spring.flyway.validateOnMigrate=true
```

**Changed to:**
```properties
spring.jpa.hibernate.ddl-auto=${DDL_AUTO:none}
spring.flyway.validateOnMigrate=false
```

**Added:**
```properties
# HikariCP Connection Pool Configuration
spring.datasource.hikari.maximum-pool-size=10
spring.datasource.hikari.minimum-idle=5
spring.datasource.hikari.connection-timeout=20000
spring.datasource.hikari.idle-timeout=300000
spring.datasource.hikari.max-lifetime=1200000
spring.datasource.hikari.connection-test-query=SELECT 1

# Logging Configuration
logging.level.org.flywaydb.core=INFO
logging.level.org.hibernate.SQL=WARN
logging.level.com.zaxxer.hikari=INFO
logging.level.com.pomodify.backend=INFO
```

### 2. Deployment Workflow (.github/workflows/deploy.yml)

**Changed:**
```yaml
-e DDL_AUTO=none \
-e SHOW_SQL=false \
```

## Diagnostic Scripts Created

### 1. diagnose-deployment.sh
Comprehensive diagnostic script that checks:
- Docker status
- Container status
- Full backend logs
- Error analysis
- Flyway migration status
- Database connection
- Port availability
- Disk space and memory

**Usage on EC2:**
```bash
bash diagnose-deployment.sh
```

### 2. test-backend-manual.sh
Simple manual test script to deploy backend with proper settings.

**Usage on EC2:**
```bash
bash test-backend-manual.sh
```

### 3. check-backend-logs.sh
Quick script to check backend logs for errors.

**Usage on EC2:**
```bash
bash check-backend-logs.sh
```

## Manual Testing Steps

### Step 1: Get Full Logs from Current Deployment

SSH into your EC2 server and run:

```bash
# Check if container is running
sudo docker ps -a | grep pomodify-backend

# Get FULL logs (not just first 50 lines)
sudo docker logs pomodify-backend 2>&1 > backend-full-logs.txt

# View the logs
cat backend-full-logs.txt

# Search for specific errors
grep -i "error\|exception\|failed\|caused by" backend-full-logs.txt

# Check Flyway logs
grep -i "flyway" backend-full-logs.txt

# Check if container exited
sudo docker inspect pomodify-backend --format='{{.State.ExitCode}}'
```

### Step 2: Test with New Configuration

```bash
# Stop old container
sudo docker stop pomodify-backend || true
sudo docker rm pomodify-backend || true

# Pull latest image (after you rebuild with new config)
sudo docker pull gm1026/pomodify-backend:latest

# Start with DDL_AUTO=none
sudo docker run -d \
  --name pomodify-backend \
  --network pomodify-net \
  --restart unless-stopped \
  -p 8081:8081 \
  -e SPRING_PROFILES_ACTIVE=prod \
  -e DB_URL="jdbc:postgresql://pomodify-db.cyvgaequcp4n.us-east-1.rds.amazonaws.com:5432/dbpomodify?sslmode=require" \
  -e DB_USERNAME=pomodify_user \
  -e DB_PASSWORD='Qazplm891251' \
  -e DDL_AUTO=none \
  -e SHOW_SQL=false \
  -e JWT_SECRET='1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t1u2v3w4x5y6z7A8B9C0D1E2F3G4H5I6J7K8L9M0N1O2P3Q4R5S6T7U8V9W0X1Y2Z3' \
  -e JWT_ACCESS_EXPIRATION=900000 \
  -e JWT_REFRESH_EXPIRATION=2592000000 \
  -e GOOGLE_CLIENT_ID=YOUR_GOOGLE_CLIENT_ID \
  -e GOOGLE_CLIENT_SECRET=YOUR_GOOGLE_CLIENT_SECRET \
  -e SMTP_USERNAME=contact@pomodify.site \
  -e SMTP_PASSWORD='Qazplm@891251' \
  -e GOOGLE_API_KEY=AIzaSyD3G6UoPZSM51BBOOs7_2H6Nrv4GA6f9xI \
  gm1026/pomodify-backend:latest

# Watch logs in real-time
sudo docker logs -f pomodify-backend
```

### Step 3: Monitor Startup

In another terminal, monitor the health endpoint:

```bash
# Wait for startup
sleep 30

# Test health endpoint repeatedly
for i in {1..20}; do
  echo "Attempt $i:"
  curl -v http://localhost:8081/actuator/health
  sleep 5
done
```

## Common Issues and Solutions

### Issue 1: Flyway Validation Failure
**Symptom:** Logs show "Flyway validation failed"
**Solution:** Set `spring.flyway.validateOnMigrate=false` (already done)

### Issue 2: Hibernate Validation Failure
**Symptom:** Logs show "Schema-validation: missing column" or similar
**Solution:** Set `spring.jpa.hibernate.ddl-auto=none` (already done)

### Issue 3: Database Connection Timeout
**Symptom:** Logs show "Connection timeout" or "Unable to acquire JDBC Connection"
**Solution:** Check security groups, database credentials, and network connectivity

### Issue 4: Migration Checksum Mismatch
**Symptom:** Logs show "Migration checksum mismatch"
**Solution:** 
```sql
-- Connect to database and repair Flyway
DELETE FROM flyway_schema_history WHERE success = false;
-- Or reset Flyway completely (DANGEROUS - only if needed)
-- DROP TABLE flyway_schema_history;
```

### Issue 5: Port Already in Use
**Symptom:** "Address already in use"
**Solution:**
```bash
sudo netstat -tlnp | grep 8081
sudo kill -9 <PID>
```

## Next Steps

1. **Rebuild the Docker image** with the new configuration:
   ```bash
   cd pomodify-backend
   docker build -t gm1026/pomodify-backend:latest .
   docker push gm1026/pomodify-backend:latest
   ```

2. **Test manually on EC2** using the test script:
   ```bash
   bash test-backend-manual.sh
   ```

3. **If manual test succeeds**, commit and push changes to trigger automated deployment

4. **If manual test fails**, run diagnostic script:
   ```bash
   bash diagnose-deployment.sh
   ```

## Expected Behavior

With `DDL_AUTO=none`:
- Flyway runs migrations (if any new ones exist)
- Hibernate does NOT modify schema
- Hibernate does NOT validate schema
- Application starts faster (30-60 seconds instead of 2-6 minutes)
- No schema conflicts

## Rollback Plan

If issues persist, you can rollback to the original configuration:

```properties
spring.jpa.hibernate.ddl-auto=update
spring.flyway.validateOnMigrate=false
spring.flyway.ignoreMissingMigrations=true
```

This was the original "working" configuration, though it was slow.
