import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, firstValueFrom, Subject } from 'rxjs';
import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging';
import { API } from '../config/api.config';
import { environment } from '../../../environments/environment';
import { Logger } from './logger.service';

export interface PushStatus {
  registered: boolean;
  enabled: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class FcmService {
  private http = inject(HttpClient);
  
  private app: any = null;
  private fcmToken$ = new BehaviorSubject<string | null>(null);
  private messageSubject = new Subject<any>();

  get messages$() {
    return this.messageSubject.asObservable();
  }

  private initializeFirebaseApp() {
    if (!this.app) {
      try {
        Logger.log('🔥 Initializing Firebase app...');
        
        // Always try to initialize a new app with a unique name
        const appName = `pomodify-app-${Date.now()}`;
        this.app = initializeApp(environment.firebase, appName);
        Logger.log('✅ Firebase app initialized with name:', appName);
        
      } catch (error) {
        // Firebase app initialization failed - using fallback mode
        Logger.log('⚠️ Using fallback mode - no Firebase app');
        this.app = null;
        throw new Error('Firebase initialization failed - using fallback mode');
      }
    }
    return this.app;
  }

async initializeFCM(): Promise<void> {
    try {
      Logger.log('🔔 Starting FCM initialization...');
      
      // Check notification permission first
      const permission = await Notification.requestPermission();
      Logger.log('📱 Notification permission:', permission);
      if (permission !== 'granted') {
        Logger.log('❌ Notification permission denied');
        throw new Error('Notification permission denied');
      }

      // Try Firebase initialization
      try {
        if (!(await isSupported())) {
          throw new Error('FCM not supported on this browser');
        }

        // Register service worker
        Logger.log('🔧 Registering service worker...');
        const swReg = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
        Logger.log('✅ Service worker registered, state:', swReg.active?.state);
        
        // Wait for service worker to be ready and active
        await navigator.serviceWorker.ready;
        Logger.log('✅ Service worker is ready');
        
        // If there's a waiting service worker, activate it immediately
        if (swReg.waiting) {
          Logger.log('🔄 Activating waiting service worker...');
          swReg.waiting.postMessage({ type: 'SKIP_WAITING' });
        }
        
        // Wait a bit for the service worker to take control
        if (!navigator.serviceWorker.controller) {
          Logger.log('⏳ Waiting for service worker to take control...');
          await new Promise<void>((resolve) => {
            navigator.serviceWorker.addEventListener('controllerchange', () => {
              Logger.log('✅ Service worker now controlling the page');
              resolve();
            }, { once: true });
            // Timeout after 3 seconds
            setTimeout(() => {
              Logger.log('⚠️ Service worker control timeout, proceeding anyway');
              resolve();
            }, 3000);
          });
        }
        
        // Send login state to service worker
        if (navigator.serviceWorker.controller) {
          navigator.serviceWorker.controller.postMessage({
            type: 'SET_LOGIN_STATE',
            isLoggedIn: true
          });
          Logger.log('📡 Sent login state to service worker');
        } else {
          Logger.log('⚠️ No service worker controller available');
        }
        
        // Initialize Firebase app
        const app = this.initializeFirebaseApp();
        if (!app) {
          throw new Error('Firebase app initialization failed');
        }
        
        const messaging = getMessaging(app);
        Logger.log('🔥 Firebase messaging initialized');
        
        // Get FCM token
        Logger.log('🎫 Getting FCM token...');
        const token = await getToken(messaging, { 
          vapidKey: environment.vapidKey, 
          serviceWorkerRegistration: swReg 
        });
        
        if (!token) {
          throw new Error('No FCM token available');
        }

        Logger.log('✅ FCM token obtained:', token.substring(0, 20) + '...');
        this.fcmToken$.next(token);
        
        // Register token with backend
        Logger.log('📡 Registering token with backend...');
        const response = await firstValueFrom(this.registerToken(token));
        Logger.log('✅ Token registered with backend successfully:', response);
        
        // Listen for foreground messages
        onMessage(messaging, (payload: any) => {
          Logger.log('📨 Foreground FCM message:', payload);
          this.messageSubject.next(payload);
        });
        
        Logger.log('🎉 FCM initialization completed successfully!');
        
      } catch (firebaseError: any) {
        Logger.log('⚠️ Firebase FCM failed, using browser-only notifications:', firebaseError?.message || firebaseError);
        
        // DO NOT register fallback tokens - they cannot receive FCM messages
        // Backend notifications will not work without a real FCM token
        // User will only get notifications when the tab is open
        Logger.log('⚠️ Background notifications will NOT work without FCM');
        Logger.log('⚠️ User will only receive notifications when the app tab is open/focused');
        
        // Still throw error so notification service can handle fallback
        throw firebaseError;
      }

    } catch (error: any) {
      // FCM initialization failed
      throw error;
    }
  }

  registerToken(token: string): Observable<any> {
    return this.http.post(API.PUSH.REGISTER_TOKEN, { token }, { withCredentials: true, responseType: 'text' });
  }

  unregisterToken(): Observable<any> {
    return this.http.delete(API.PUSH.UNREGISTER_TOKEN, { withCredentials: true, responseType: 'text' });
  }

  getStatus(): Observable<PushStatus> {
    return this.http.get<PushStatus>(API.PUSH.STATUS, { withCredentials: true });
  }

  enablePush(): Observable<any> {
    return this.http.put(API.PUSH.ENABLE, {}, { withCredentials: true, responseType: 'text' });
  }

  disablePush(): Observable<any> {
    return this.http.put(API.PUSH.DISABLE, {}, { withCredentials: true, responseType: 'text' });
  }

  /**
   * Get debug information about push notification status
   */
  getDebugInfo(): Observable<any> {
    return this.http.get(API.PUSH.DEBUG, { withCredentials: true });
  }

  /**
   * Send a test push notification to verify FCM is working
   */
  sendTestNotification(title?: string, body?: string): Observable<any> {
    const payload: any = {};
    if (title) payload.title = title;
    if (body) payload.body = body;
    return this.http.post(API.PUSH.TEST, payload, { withCredentials: true });
  }

  getFcmToken(): Observable<string | null> {
    return this.fcmToken$.asObservable();
  }
}