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
      const jwt = this.authService.getAccessToken();
      if (jwt) {
        console.log('Initializing FCM for authenticated user...');
        await this.fcmService.initializeFCM(jwt);
        console.log('FCM initialization completed');
      } else {
        console.log('No JWT token available, skipping FCM initialization');
      }
    } catch (error) {
      console.error('Failed to initialize FCM:', error);
    }
  }

  /**
   * Clean up FCM when user logs out
   */
  async cleanupNotifications(): Promise<void> {
    try {
      const jwt = this.authService.getAccessToken();
      if (jwt) {
        console.log('Cleaning up FCM registration...');
        await firstValueFrom(this.fcmService.unregisterToken(jwt));
        console.log('FCM cleanup completed');
      }
    } catch (error) {
      console.error('Failed to cleanup FCM:', error);
    }
  }
}