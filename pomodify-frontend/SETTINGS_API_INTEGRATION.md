# Settings API Integration

## Overview
The Settings Service now integrates with the backend API to persist user settings across devices and sessions.

## How It Works

### Data Flow
1. **On App Init**: Settings load from localStorage (instant) → then sync from API (background)
2. **On Update**: Settings save to localStorage (instant) → then save to API (background)
3. **On Error**: Falls back to localStorage if API is unavailable

### Dual Storage Strategy
- **localStorage**: Provides instant feedback and offline support
- **Backend API**: Provides persistence across devices and sessions

## API Endpoints

### GET `/api/v1/settings`
Loads user settings from the backend.

**Response:**
```json
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

### PATCH `/api/v1/settings`
Updates user settings (partial update supported).

**Request:**
```json
{
  "soundType": "SOFT_DING",
  "volume": 80,
  "theme": "DARK"
}
```

## Data Mapping

### Sound Types
| Frontend | Backend |
|----------|---------|
| bell | BELL |
| chime | CHYME |
| digital | DIGITAL_BEEP |
| soft | SOFT_DING |

### Theme
| Frontend | Backend |
|----------|---------|
| LIGHT | LIGHT |
| DARK | DARK |

## Usage

### Load Settings
```typescript
// Settings auto-load on service init
const settings = settingsService.getSettings();

// Or manually reload from API
await settingsService.loadSettingsFromAPI();
```

### Update Settings
```typescript
// Update sound settings (saves to both localStorage and API)
settingsService.updateSoundSettings({
  enabled: true,
  type: 'bell',
  volume: 80
});

// Update auto-start settings
settingsService.updateAutoStartSettings({
  autoStartBreaks: true,
  autoStartPomodoros: false
});

// Update general settings
settingsService.updateSettings({
  notifications: true,
  calendarSync: false,
  theme: 'DARK'
});
```

### Check Loading/Error State
```typescript
// Check if loading from API
const isLoading = settingsService.isLoading();

// Check for errors
const error = settingsService.getError();
if (error) {
  console.error('Settings error:', error);
}
```

## Error Handling

### Network Failures
- Service logs warning to console
- Falls back to localStorage
- Sets error signal for UI to display

### Authentication Errors
- Handled by `authErrorInterceptor`
- User redirected to login if needed

### Validation Errors
- Logged to console
- Previous settings retained

## Migration Strategy

When a user logs in for the first time after this integration:
1. Backend returns default settings (or previously saved settings)
2. Frontend merges with localStorage settings
3. Backend settings take priority
4. Merged settings saved back to API

## Testing

### Manual Testing
1. Login to the app
2. Change settings (sound, volume, theme, etc.)
3. Refresh the page → settings should persist
4. Login from another device → settings should sync
5. Go offline → settings should still work (localStorage)
6. Come back online → settings should sync to API

### Check Network Tab
- GET `/api/v1/settings` on app init
- PATCH `/api/v1/settings` on each update

## Notes

- Settings sync happens in the background (non-blocking)
- localStorage provides instant feedback
- API failures don't break the user experience
- Authentication handled automatically by interceptors
- Countdown seconds (3-5) not stored in backend (frontend-only)

## Future Enhancements

- Conflict resolution for simultaneous updates from multiple devices
- Settings versioning
- Bulk settings import/export
- Settings history/audit log
