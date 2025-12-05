# Local Testing Guide - Settings API Integration

## Prerequisites
- Java 17+ installed
- Node.js 18+ installed
- MySQL/PostgreSQL running locally
- Git on `staging` branch

## Step 1: Setup Backend (Spring Boot)

### 1.1 Navigate to backend folder
```bash
cd pomodify-backend
```

### 1.2 Configure database
Edit `src/main/resources/application.properties` or `.env.local`:
```properties
spring.datasource.url=jdbc:mysql://localhost:3306/pomodify
spring.datasource.username=your_username
spring.datasource.password=your_password
server.port=8080
```

### 1.3 Run backend
```bash
# Using Maven wrapper
./mvnw spring-boot:run

# Or if you have Maven installed
mvn spring-boot:run
```

### 1.4 Verify backend is running
Open browser: `http://localhost:8080/api/v1/settings`
- Should return 401 (Unauthorized) - this is correct, means API is up

## Step 2: Setup Frontend (Angular)

### 2.1 Navigate to frontend folder
```bash
cd pomodify-frontend
```

### 2.2 Update environment for local testing
Edit `src/environments/environment.ts`:
```typescript
export const environment = {
  production: false,
  apiUrl: 'http://localhost:8080/api/v1',  // ← Change this to local
  useMockBackend: false,
};
```

### 2.3 Install dependencies (if not done)
```bash
npm install
```

### 2.4 Run frontend
```bash
npm start
# Or
ng serve
```

### 2.5 Open app
Browser: `http://localhost:4200`

## Step 3: Test Settings API Integration

### 3.1 Login to the app
- Use your test account or create new one
- Check browser console for logs

### 3.2 Open Browser DevTools
- Press F12
- Go to **Network** tab
- Filter by "settings"

### 3.3 Test GET Settings
1. After login, you should see:
   - `GET http://localhost:8080/api/v1/settings`
   - Status: 200 OK
   - Response body with your settings

**Console logs to look for:**
```
[SettingsService] Loading settings from API...
Settings loaded from API successfully
```

### 3.4 Test PATCH Settings
1. Go to Settings page (if you have one) or use the service directly
2. Change any setting (volume, sound type, theme, etc.)
3. Check Network tab:
   - `PATCH http://localhost:8080/api/v1/settings`
   - Status: 200 OK
   - Request body with updated settings

**Console logs to look for:**
```
Settings saved to API successfully
```

### 3.5 Test Persistence
1. Change a setting (e.g., volume to 80)
2. Refresh the page (F5)
3. Setting should still be 80 (loaded from API)

### 3.6 Test Offline Mode
1. Stop the backend server
2. Change a setting
3. Should see console warning:
   ```
   Failed to save settings to API: [error details]
   ```
4. Settings still work (saved to localStorage)
5. Restart backend
6. Refresh page → settings should sync

## Step 4: Verify Database

### 4.1 Check settings table
```sql
SELECT * FROM user_settings WHERE user_id = YOUR_USER_ID;
```

Should see your updated settings stored in database.

## Step 5: Test Different Scenarios

### Scenario 1: First-time user
1. Create new account
2. Check if default settings are returned
3. Modify settings
4. Verify they're saved to database

### Scenario 2: Cross-device sync (simulate)
1. Login on browser 1
2. Change settings (e.g., theme to DARK)
3. Open incognito/another browser
4. Login with same account
5. Settings should match (theme = DARK)

### Scenario 3: Conflict resolution
1. Open app in 2 tabs
2. Change different settings in each tab
3. Last write wins (expected behavior)

## Troubleshooting

### Backend not starting?
- Check if port 8080 is already in use
- Verify database is running
- Check application logs for errors

### Frontend can't connect to backend?
- Verify `environment.ts` has correct URL
- Check CORS configuration in backend
- Look for errors in browser console

### Settings not saving?
- Check Network tab for failed requests
- Verify JWT token is being sent (Authorization header)
- Check backend logs for validation errors

### 401 Unauthorized errors?
- Token might be expired
- Logout and login again
- Check if `authTokenInterceptor` is working

## Expected Network Requests

### On App Init (after login)
```
GET /api/v1/settings
Authorization: Bearer <your-jwt-token>

Response 200:
{
  "userId": 123,
  "soundType": "BELL",
  "notificationSound": true,
  "volume": 70,
  "tickSound": false,
  "autoStartBreaks": false,
  "autoStartPomodoros": false,
  "theme": "LIGHT",
  "notificationsEnabled": true,
  "googleCalendarSync": false
}
```

### On Settings Update
```
PATCH /api/v1/settings
Authorization: Bearer <your-jwt-token>
Content-Type: application/json

{
  "volume": 80,
  "theme": "DARK"
}

Response 200:
{
  "userId": 123,
  "soundType": "BELL",
  "notificationSound": true,
  "volume": 80,
  "tickSound": false,
  "autoStartBreaks": false,
  "autoStartPomodoros": false,
  "theme": "DARK",
  "notificationsEnabled": true,
  "googleCalendarSync": false
}
```

## Clean Up After Testing

### Reset environment.ts
```typescript
export const environment = {
  production: false,
  apiUrl: 'https://api.pomodify.site/api/v1',  // ← Back to production
  useMockBackend: false,
};
```

### Stop servers
- Backend: Ctrl+C in terminal
- Frontend: Ctrl+C in terminal

## Notes

- Don't commit `environment.ts` with local URLs
- Use `.env.local` for backend secrets (already in .gitignore)
- Test both success and failure scenarios
- Check browser console for helpful logs

## Quick Test Checklist

- [ ] Backend running on port 8080
- [ ] Frontend running on port 4200
- [ ] Can login successfully
- [ ] GET /settings returns data
- [ ] PATCH /settings saves data
- [ ] Settings persist after refresh
- [ ] Offline mode works (localStorage fallback)
- [ ] No console errors
- [ ] Database shows updated settings

---

**Ready to merge?** Make sure all tests pass and environment.ts is reset to production URL!
