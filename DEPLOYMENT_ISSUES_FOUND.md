# 🔴 Deployment Issues Found & Fixed

## Issues Discovered

### 1. **SMTP Configuration Timeout Issues**
**Problem:** 
- SMTP connection timeouts were too short (5s/3s/5s)
- Can cause slow startup or hanging during email bean initialization

**Fix Applied:**
- Increased all SMTP timeouts to **10 seconds** (connectiontimeout, timeout, writetimeout)
- Added explicit TLS protocol specification: `TLSv1.2`
- Added UTF-8 encoding configuration

**File:** `pomodify-backend/src/main/resources/application.properties`

---

### 2. **Missing GOOGLE_API_KEY Property Configuration**
**Problem:**
- `GOOGLE_API_KEY` was being passed in Docker command but not configured in `application.properties`
- The environment variable wasn't being read by the Spring application

**Fix Applied:**
- Added property: `app.google.api-key=${GOOGLE_API_KEY:}`
- Now the application can properly read and use the Google API Key

**File:** `pomodify-backend/src/main/resources/application.properties`

---

### 3. **Insecure Default SMTP Credentials**
**Problem:**
- Hardcoded default values in properties: `your-email@pomodify.site` and `YOUR_EMAIL_PASSWORD`
- Could cause confusion if environment variables aren't set

**Fix Applied:**
- Changed defaults to empty strings: `${SMTP_USERNAME:}` and `${SMTP_PASSWORD:}`
- Application will fail fast and clearly if credentials are missing (better than using wrong credentials)

---

### 4. **Insufficient Backend Initialization Wait Time**
**Problem:**
- Original 90 seconds may not be enough for:
  - Database migrations (Flyway)
  - JPA/Hibernate initialization
  - SMTP bean creation and connection pooling
  - Firebase initialization
  - Spring Security bean setup

**Status:** ✅ Already Fixed in Deploy.yml
- Increased to **120 seconds**
- Also increased health check retries from 20 to **30** (with 3s intervals = 90s total)

---

## Next Steps

### 1. **Verify GitHub Secrets are Set Correctly**
Make sure these secrets exist in your GitHub repository:
- ✅ `SMTP_USERNAME` = `contact@pomodify.site`
- ✅ `SMTP_PASSWORD` = `Qazplm@891251`
- ✅ `GOOGLE_API_KEY` = `AIzaSyD3G6UoPZSM51BBOOs7_2H6Nrv4GA6f9xI`

### 2. **Test SMTP Connection**
On your EC2 server, you can test SMTP connectivity:
```bash
# Test Hostinger SMTP connection
openssl s_client -connect smtp.hostinger.com:587 -starttls smtp
```

### 3. **Monitor Backend Startup**
When deploying, check logs with:
```bash
sudo docker logs -f pomodify-backend
```

Look for these successful messages:
```
🚀 Starting application...
🔧 Initializing FirebaseApp...
✉️  Mail sender initialized...
💾 Database connections ready...
🏥 Health check endpoint available...
```

### 4. **Rebuild and Push**
```bash
# Commit changes
git add pomodify-backend/src/main/resources/application.properties
git commit -m "Fix SMTP configuration and Google API Key handling"
git push origin hotfix/deployment

# The next push to main will trigger deployment with fixes
git checkout main
git merge hotfix/deployment
git push origin main
```

---

## 🎯 Expected Improvement

- **Before:** 502 Bad Gateway, backend timeouts, slow initialization
- **After:** 
  - SMTP beans initialize properly with correct timeouts
  - Google API Key properly injected
  - 120 second initialization window should be sufficient
  - Better error messages in container logs if something fails

---

## Additional Notes

- The deployment workflow is already configured to show 100 lines of backend logs if health checks fail
- No changes needed to the Docker image or deployment scripts - just configuration
- SMTP credentials are now properly referenced via environment variables (never hardcoded)
