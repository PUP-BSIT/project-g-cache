# Push Notifications (Angular)

This guide explains how the Angular frontend integrates with Firebase Cloud Messaging (FCM) and how to use the deployed backend API to manage push tokens and preferences.

## What’s already set up
- Backend is deployed and exposes push endpoints under `/api/v1/push`.
- Firebase Admin service account JSON is configured on the backend (`fcm.service-account`), so server-side send works out-of-the-box.
- Backend stores one token per user and respects an `enabled` flag. Invalid tokens are pruned automatically on FCM errors.

## API quick reference
Base path: `/api/v1/push` (JWT required; token must include `user` claim)

- `POST /register-token` — Body `{ token: string }` → `200 "Token registered"`
- `DELETE /unregister-token` → `200 "Token unregistered"`
- `GET /status` → `200 { registered: boolean, enabled: boolean }`
- `PUT /enable` → `200 "Push enabled"`
- `PUT /disable` → `200 "Push disabled"`

401 is returned when the JWT is missing or the `user` claim is invalid.

## Angular integration

### 1) Install dependencies
```bash
npm install firebase @angular/fire
```

### 2) Configure Firebase (environment.ts)
Add your Firebase web config and VAPID key (public) to `environment.ts`:
```ts
export const environment = {
  production: false,
  apiBaseUrl: 'https://<your-api-host>',
  firebase: {
    apiKey: '<apiKey>',
    authDomain: '<projectId>.firebaseapp.com',
    projectId: '<projectId>',
    messagingSenderId: '<senderId>',
    appId: '<appId>'
  },
  vapidKey: '<your-public-vapid-key>'
};
```
Notes: The backend’s service account JSON is separate and already configured; the frontend still needs the web config + VAPID key.

### 3) App module setup
```ts
// app.module.ts
import { NgModule } from '@angular/core';
import { provideFirebaseApp, initializeApp } from '@angular/fire/app';
import { provideMessaging, getMessaging } from '@angular/fire/messaging';

@NgModule({
  imports: [
    provideFirebaseApp(() => initializeApp(environment.firebase)),
    provideMessaging(() => getMessaging()),
  ],
})
export class AppModule {}
```

### 4) Service worker for background notifications
Create `src/firebase-messaging-sw.js` and ensure it’s served at `/firebase-messaging-sw.js` (include in `angular.json` assets if needed):
```js
self.addEventListener('push', (event) => {
  if (!event.data) return;
  let data = {};
  try { data = event.data.json(); } catch (_) { data = { notification: { title: 'Notification', body: event.data.text() } }; }
  const title = data.notification?.title || 'Notification';
  const options = { body: data.notification?.body || '' };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = '/';
  event.waitUntil(clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windows => {
    for (const c of windows) { if (c.url.includes(url) && 'focus' in c) return c.focus(); }
    if (clients.openWindow) return clients.openWindow(url);
  }));
});
```

### 5) Angular PushService
```ts
// push.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging';
import { environment } from '../environments/environment';

@Injectable({ providedIn: 'root' })
export class PushService {
  private http = inject(HttpClient);
  private app = initializeApp(environment.firebase);

  async init(jwt: string) {
    if (!(await isSupported())) return;
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return;

    const swReg = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
    const messaging = getMessaging(this.app);
    const token = await getToken(messaging, { vapidKey: environment.vapidKey, serviceWorkerRegistration: swReg });
    if (!token) return;

    const headers = new HttpHeaders({ 'Authorization': `Bearer ${jwt}` });
    await this.http.post(`${environment.apiBaseUrl}/api/v1/push/register-token`, { token }, { headers }).toPromise();

    onMessage(messaging, (payload) => {
      console.log('Foreground push:', payload);
      // TODO: surface a toast or notification UI
    });
  }

  status(jwt: string) {
    return this.http.get<{registered:boolean, enabled:boolean}>(`${environment.apiBaseUrl}/api/v1/push/status`, {
      headers: { Authorization: `Bearer ${jwt}` }
    });
  }

  enable(jwt: string) {
    return this.http.put(`${environment.apiBaseUrl}/api/v1/push/enable`, {}, {
      headers: { Authorization: `Bearer ${jwt}` }, responseType: 'text'
    });
  }

  disable(jwt: string) {
    return this.http.put(`${environment.apiBaseUrl}/api/v1/push/disable`, {}, {
      headers: { Authorization: `Bearer ${jwt}` }, responseType: 'text'
    });
  }

  unregister(jwt: string) {
    return this.http.delete(`${environment.apiBaseUrl}/api/v1/push/unregister-token`, {
      headers: { Authorization: `Bearer ${jwt}` }, responseType: 'text'
    });
  }
}
```

Call `pushService.init(jwt)` after login, and `unregister(jwt)` on logout.

## Self-testing the deployed API

Use these to verify connectivity on your own.

### A) Quick CURL checks
Replace `BASE` with your API host and `TOKEN` with your JWT.
```bash
# Status (should be 200 with registered/enabled flags)
curl -i -H "Authorization: Bearer $TOKEN" "$BASE/api/v1/push/status"

# Enable / Disable
curl -i -X PUT -H "Authorization: Bearer $TOKEN" "$BASE/api/v1/push/enable"
curl -i -X PUT -H "Authorization: Bearer $TOKEN" "$BASE/api/v1/push/disable"

# Unregister token
curl -i -X DELETE -H "Authorization: Bearer $TOKEN" "$BASE/api/v1/push/unregister-token"
```
Expected auth failures return `401`.

### B) Angular HttpClient ping
```ts
this.pushService.status(jwt).subscribe(console.log, console.error);
```
Should log `{ registered: boolean, enabled: boolean }` from the server.

### C) VS Code HTTP client
Create a `push.http` file locally:
```
### Status
GET {{base}}/api/v1/push/status
Authorization: Bearer {{token}}

### Enable
PUT {{base}}/api/v1/push/enable
Authorization: Bearer {{token}}
```

## Server-side sending
- Service: `PushNotificationService#sendNotificationToUser(userId, title, body)` sends a `WebpushNotification` via FCM.
- Works only if `fcm.service-account` is set (already configured in backend).

Example:
```java
pushNotificationService.sendNotificationToUser(123L, "Session Completed", "You finished a 25-minute focus session");
```

## Best practices & notes
- Always include `Authorization: Bearer <JWT>` in requests.
- Re-register token on app start and after permission changes; tokens can rotate.
- Use HTTPS; push requires secure context.
- If foreground messages don’t show, handle them via `onMessage`.
- If background messages don’t show, confirm SW is served at `/firebase-messaging-sw.js`.
