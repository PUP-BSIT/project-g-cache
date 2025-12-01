# Firebase Cloud Messaging (FCM) Setup Guide

This guide will help you set up Firebase Cloud Messaging for push notifications in Pomodify.

## Prerequisites
- A Google account
- Node.js and npm installed

## Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project" or select an existing project
3. Enter project name (e.g., "pomodify")
4. Follow the setup wizard

## Step 2: Register Your Web App

1. In Firebase Console, click the **Web icon** (</>) to add a web app
2. Enter app nickname (e.g., "Pomodify Web")
3. Check "Also set up Firebase Hosting" (optional)
4. Click "Register app"
5. Copy the Firebase configuration object

## Step 3: Get Your Firebase Config

You'll receive a config object like this:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef123456"
};
```

## Step 4: Generate VAPID Key

1. In Firebase Console, go to **Project Settings** (gear icon)
2. Navigate to **Cloud Messaging** tab
3. Scroll down to **Web Push certificates**
4. Click **Generate key pair**
5. Copy the generated VAPID key

## Step 5: Update Environment Files

### Update `src/environments/environment.ts`:

```typescript
export const environment = {
  production: true,
  apiUrl: 'https://api.pomodify.site/api/v1',
  useMockBackend: false,
  firebase: {
    apiKey: 'YOUR_API_KEY',
    authDomain: 'YOUR_PROJECT_ID.firebaseapp.com',
    projectId: 'YOUR_PROJECT_ID',
    storageBucket: 'YOUR_PROJECT_ID.appspot.com',
    messagingSenderId: 'YOUR_MESSAGING_SENDER_ID',
    appId: 'YOUR_APP_ID',
    vapidKey: 'YOUR_VAPID_KEY'  // From Step 4
  }
};
```

### Update `public/firebase-messaging-sw.js`:

Replace the placeholder config with your actual Firebase config:

```javascript
firebase.initializeApp({
  apiKey: 'YOUR_API_KEY',
  authDomain: 'YOUR_PROJECT_ID.firebaseapp.com',
  projectId: 'YOUR_PROJECT_ID',
  storageBucket: 'YOUR_PROJECT_ID.appspot.com',
  messagingSenderId: 'YOUR_MESSAGING_SENDER_ID',
  appId: 'YOUR_APP_ID'
});
```

## Step 6: Test Push Notifications

1. Run the app: `npm start`
2. Go to Settings page
3. Enable "Push Notifications"
4. Allow notifications when prompted by browser
5. Click "Send Test" button
6. You should see a test notification!

## Step 7: Send Notifications from Backend (Later)

To send notifications from your Spring Boot backend, you'll need:

1. Download Firebase Admin SDK service account key:
   - Go to **Project Settings** > **Service Accounts**
   - Click **Generate new private key**
   - Save the JSON file securely

2. Add Firebase Admin SDK to Spring Boot (see backend documentation)

## Troubleshooting

### "Notifications not supported"
- Make sure you're using HTTPS (or localhost for development)
- Check if your browser supports notifications

### "Permission denied"
- User must manually enable notifications in browser settings
- Clear site data and try again

### Token not generated
- Check browser console for errors
- Verify VAPID key is correct
- Ensure service worker is registered properly

### Notifications not received
- Check if FCM token is being sent to backend
- Verify Firebase project settings
- Check browser notification settings

## Browser Support

Push notifications work on:
- ✅ Chrome/Edge (Desktop & Android)
- ✅ Firefox (Desktop & Android)
- ✅ Safari (macOS 16.4+, iOS 16.4+)
- ❌ Internet Explorer (not supported)

## Security Notes

⚠️ **Never commit your Firebase config to public repositories!**

- Use environment variables for sensitive data
- Add `.env` files to `.gitignore`
- Use different Firebase projects for dev/staging/production

## Resources

- [Firebase Cloud Messaging Documentation](https://firebase.google.com/docs/cloud-messaging)
- [Web Push Notifications Guide](https://web.dev/push-notifications-overview/)
- [Service Workers API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
