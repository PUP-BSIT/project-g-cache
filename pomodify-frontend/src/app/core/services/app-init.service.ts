// Clear old tokens from localStorage on app start (migration to cookie-based auth)
(() => {
  try {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('currentUser');
    // Silent in production - only log in development
  } catch (e) {
    // Silent cleanup - no need to log
  }
})();
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { FcmService } from './fcm.service';
import { Auth } from './auth';
import { Logger } from './logger.service';

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
      Logger.log('Initializing FCM for authenticated user...');
      await this.fcmService.initializeFCM();
      Logger.log('FCM initialization completed');
    } catch (error) {
      // FCM initialization failed - silently handle
    }
  }

  /**
   * Clean up FCM when user logs out
   */
  async cleanupNotifications(): Promise<void> {
    try {
      // JWT is no longer needed, auth is handled by cookies
      Logger.log('Cleaning up FCM registration...');
      await firstValueFrom(this.fcmService.unregisterToken());
      Logger.log('FCM cleanup completed');
    } catch (error) {
      // FCM cleanup failed - silently handle
    }
  }
}