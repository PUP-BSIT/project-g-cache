import { Injectable, inject } from '@angular/core';
import { NotificationService } from './notification.service';
import { Logger } from './logger.service';

@Injectable({
  providedIn: 'root'
})
export class NotificationTestService {
  private notificationService = inject(NotificationService);

  /**
   * Test the desktop closed tab behavior
   * Call this method and then switch to another tab or close the tab
   */
  async testDesktopClosedTabBehavior(): Promise<void> {
    Logger.log('Testing desktop closed tab behavior...');
    Logger.log('Current tab visibility:', this.notificationService.isTabVisible());
    
    // Simulate a session completion
    const testContext = {
      title: 'Test Session Completed!',
      body: 'This is a test notification for desktop closed tab behavior',
      sessionId: 999,
      activityId: 999
    };

    await this.notificationService.handleSessionCompletion(testContext);
    Logger.log('Test notification triggered');
  }

  /**
   * Test phase completion notification
   */
  async testPhaseCompletion(): Promise<void> {
    Logger.log('Testing phase completion...');
    
    const testContext = {
      title: 'Focus Phase Complete!',
      body: 'Time for a break in "Test Activity"',
      sessionId: 999,
      activityId: 999
    };

    await this.notificationService.handlePhaseCompletion(testContext);
    Logger.log('Phase completion test triggered');
  }

  /**
   * Get current notification status for debugging
   */
  getNotificationStatus(): any {
    return {
      isTabVisible: this.notificationService.isTabVisible(),
      pendingNotifications: this.notificationService.getPendingNotificationsCount(),
      notificationPermission: Notification.permission,
      serviceWorkerSupported: 'serviceWorker' in navigator
    };
  }
}