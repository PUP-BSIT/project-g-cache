import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject, firstValueFrom, Subject } from 'rxjs';
import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging';
import { API } from '../config/api.config';
import { environment } from '../../../environments/environment';

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
        console.log('🔥 Initializing Firebase app...');
        console.log('🔧 Firebase config:', environment.firebase);
        
        // Always try to initialize a new app with a unique name
        const appName = `pomodify-app-${Date.now()}`;
        this.app = initializeApp(environment.firebase, appName);
        console.log('✅ Firebase app initialized with name:', appName);
        
      } catch (error) {
        console.error('❌ Firebase app initialization failed:', error);
        
        // Complete fallback - return null and handle gracefully
        console.log('⚠️ Using fallback mode - no Firebase app');
        this.app = null;
        throw new Error('Firebase initialization failed - using fallback mode');
      }
    }
    return this.app;
  }

async initializeFCM(): Promise<void> {
    try {
      console.log('🔔 Starting FCM initialization...');
      
      // Check notification permission first
      const permission = await Notification.requestPermission();
      console.log('📱 Notification permission:', permission);
      if (permission !== 'granted') {
        console.log('❌ Notification permission denied');
        throw new Error('Notification permission denied');
      }

      // Try Firebase initialization
      try {
        if (!(await isSupported())) {
          throw new Error('FCM not supported on this browser');
        }

        // Register service worker
        console.log('🔧 Registering service worker...');
        const swReg = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
        console.log('✅ Service worker registered');
        
        // Initialize Firebase app
        const app = this.initializeFirebaseApp();
        if (!app) {
          throw new Error('Firebase app initialization failed');
        }
        
        const messaging = getMessaging(app);
        console.log('🔥 Firebase messaging initialized');
        
        // Get FCM token
        console.log('🎫 Getting FCM token...');
        const token = await getToken(messaging, { 
          vapidKey: environment.vapidKey, 
          serviceWorkerRegistration: swReg 
        });
        
        if (!token) {
          throw new Error('No FCM token available');
        }

        console.log('✅ FCM token obtained:', token.substring(0, 20) + '...');
        this.fcmToken$.next(token);
        
        // Register token with backend
        console.log('📡 Registering token with backend...');
        const response = await firstValueFrom(this.registerToken(token));
        console.log('✅ Token registered with backend successfully:', response);
        
        // Listen for foreground messages
        onMessage(messaging, (payload: any) => {
          console.log('📨 Foreground FCM message:', payload);
          this.messageSubject.next(payload);
        });
        
        console.log('🎉 FCM initialization completed successfully!');
        
      } catch (firebaseError: any) {
        console.log('⚠️ Firebase FCM failed, using simple browser notifications:', firebaseError?.message || firebaseError);
        
        // Fallback: Register a simple token with backend
        const simpleToken = `browser-fallback-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
        console.log('📡 Registering fallback token with backend...');
        
        try {
          await firstValueFrom(this.registerToken(simpleToken));
          console.log('✅ Fallback token registered successfully');
        } catch (tokenError: any) {
          console.log('❌ Fallback token registration failed:', tokenError?.message || tokenError);
        }
        
        // Still throw error so notification service can handle fallback
        throw firebaseError;
      }

    } catch (error: any) {
      console.error('❌ FCM initialization failed:', error?.message || error);
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

  getFcmToken(): Observable<string | null> {
    return this.fcmToken$.asObservable();
  }
}