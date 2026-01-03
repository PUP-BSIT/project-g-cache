// Clear old tokens from localStorage on app start (migration to cookie-based auth)
(() => {
  try {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('currentUser');
    console.log('[AppInit] Cleared legacy tokens from localStorage');
  } catch (e) {
    console.warn('[AppInit] Unable to clear legacy tokens', e);
  }
})();
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { FcmService } from './fcm.service';
import { Auth } from './auth';

@Injectable({
  providedIn: 'root'
})
export class AppInitService {
  private fcmService = inject(FcmService);
  private authService = inject(Auth);

  /**
   * Initialize FCM when user is authenticated
   */
  async initializeNotifications(): Promise<void> {
    try {
      // JWT is no longer needed, auth is handled by cookies
      console.log('Initializing FCM for authenticated user...');
      await this.fcmService.initializeFCM();
      console.log('FCM initialization completed');
    } catch (error) {
      console.error('Failed to initialize FCM:', error);
    }
  }

  /**
   * Clean up FCM when user logs out
   */
  async cleanupNotifications(): Promise<void> {
    try {
      // JWT is no longer needed, auth is handled by cookies
      console.log('Cleaning up FCM registration...');
      await firstValueFrom(this.fcmService.unregisterToken());
      console.log('FCM cleanup completed');
    } catch (error) {
      console.error('Failed to cleanup FCM:', error);
    }
  }
}