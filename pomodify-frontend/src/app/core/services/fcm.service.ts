import { Injectable, signal } from '@angular/core';
import { getMessaging, getToken, onMessage, Messaging } from 'firebase/messaging';
import { initializeApp, FirebaseApp } from 'firebase/app';
import { environment } from '../../../environments/environment';

export interface FCMState {
  token: string | null;
  permission: NotificationPermission;
  isSupported: boolean;
  error: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class FcmService {
  private app: FirebaseApp | null = null;
  private messaging: Messaging | null = null;
  private readonly STORAGE_KEY = 'fcm_token';
  
  // Reactive state
  private fcmState = signal<FCMState>({
    token: null,
    permission: 'default',
    isSupported: false,
    error: null
  });

  constructor() {
    this.initializeFirebase();
  }

  private initializeFirebase(): void {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      this.fcmState.update(state => ({
        ...state,
        isSupported: false,
        error: 'Notifications not supported in this browser'
      }));
      return;
    }

    try {
      this.app = initializeApp(environment.firebase);
      this.messaging = getMessaging(this.app);
      
      this.fcmState.update(state => ({
        ...state,
        isSupported: true,
        permission: Notification.permission
      }));

      // Load saved token
      const savedToken = localStorage.getItem(this.STORAGE_KEY);
      if (savedToken) {
        this.fcmState.update(state => ({ ...state, token: savedToken }));
      }

      // Listen for foreground messages
      this.listenToMessages();
    } catch (error) {
      console.error('Firebase initialization error:', error);
      this.fcmState.update(state => ({
        ...state,
        error: 'Failed to initialize Firebase'
      }));
    }
  }

  // Get current state as signal
  getState() {
    return this.fcmState.asReadonly();
  }

  // Request notification permission and get FCM token
  async requestPermission(): Promise<string | null> {
    if (!this.messaging) {
      console.error('Firebase Messaging not initialized');
      return null;
    }

    try {
      const permission = await Notification.requestPermission();
      this.fcmState.update(state => ({ ...state, permission }));

      if (permission === 'granted') {
        const token = await getToken(this.messaging, {
          vapidKey: environment.firebase.vapidKey
        });

        if (token) {
          console.log('FCM Token:', token);
          localStorage.setItem(this.STORAGE_KEY, token);
          this.fcmState.update(state => ({ ...state, token, error: null }));
          
          // TODO: Send token to backend
          // await this.sendTokenToBackend(token);
          
          return token;
        } else {
          console.warn('No registration token available');
          this.fcmState.update(state => ({
            ...state,
            error: 'Failed to get FCM token'
          }));
          return null;
        }
      } else {
        console.warn('Notification permission denied');
        this.fcmState.update(state => ({
          ...state,
          error: 'Notification permission denied'
        }));
        return null;
      }
    } catch (error) {
      console.error('Error requesting permission:', error);
      this.fcmState.update(state => ({
        ...state,
        error: 'Error requesting notification permission'
      }));
      return null;
    }
  }

  // Listen to foreground messages
  private listenToMessages(): void {
    if (!this.messaging) return;

    onMessage(this.messaging, (payload) => {
      console.log('Foreground message received:', payload);
      
      // Show notification when app is in foreground
      if (Notification.permission === 'granted') {
        const title = payload.notification?.title || 'Pomodify';
        const options = {
          body: payload.notification?.body || 'Timer completed!',
          icon: '/assets/icons/icon-192x192.png',
          badge: '/assets/icons/badge-72x72.png',
          tag: 'pomodify-notification',
          requireInteraction: true,
          data: payload.data
        };

        new Notification(title, options);
      }
    });
  }

  // Get current FCM token
  getToken(): string | null {
    return this.fcmState().token;
  }

  // Check if notifications are supported
  isSupported(): boolean {
    return this.fcmState().isSupported;
  }

  // Get current permission status
  getPermission(): NotificationPermission {
    return this.fcmState().permission;
  }

  // Send test notification (for testing purposes)
  async sendTestNotification(): Promise<void> {
    if (Notification.permission === 'granted') {
      new Notification('Test Notification', {
        body: 'This is a test notification from Pomodify!',
        icon: '/assets/icons/icon-192x192.png',
        tag: 'test-notification'
      });
    } else {
      console.warn('Cannot send test notification: permission not granted');
    }
  }

  // Delete token (for logout or disable notifications)
  async deleteToken(): Promise<void> {
    localStorage.removeItem(this.STORAGE_KEY);
    this.fcmState.update(state => ({ ...state, token: null }));
    // TODO: Notify backend to remove token
  }

  // TODO: Send token to backend
  // private async sendTokenToBackend(token: string): Promise<void> {
  //   try {
  //     await this.http.post('/api/notifications/register', { token }).toPromise();
  //   } catch (error) {
  //     console.error('Error sending token to backend:', error);
  //   }
  // }
}
