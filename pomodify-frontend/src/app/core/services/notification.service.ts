import { Injectable, inject } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { SettingsService, AppSettings } from './settings.service';
import { FcmService } from './fcm.service';
import { Auth } from './auth';
import { MobileDetectionService } from './mobile-detection.service';
import { NotificationModalComponent, NotificationModalData } from '../../shared/components/notification-modal/notification-modal.component';

export interface NotificationContext {
  title: string;
  body: string;
  sessionId?: number;
  activityId?: number;
  activityTitle?: string;
  type?: 'session-complete' | 'phase-complete';
  nextAction?: string;
  timestamp?: number;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private settingsService = inject(SettingsService);
  private fcmService = inject(FcmService);
  private authService = inject(Auth);
  private mobileDetection = inject(MobileDetectionService);
  private dialog = inject(MatDialog);
  
  private isTabVisible$ = new BehaviorSubject<boolean>(true);
  private pendingNotifications: NotificationContext[] = [];

  constructor() {
    this.initializeVisibilityTracking();
    
    // Subscribe to FCM messages to handle foreground notifications
    this.fcmService.messages$.subscribe(payload => {
      console.log('🔔 Received foreground FCM message in NotificationService:', payload);
      this.handleFcmMessage(payload);
    });
  }

  private initializeVisibilityTracking(): void {
    
    // Track tab visibility changes
    document.addEventListener('visibilitychange', () => {
      const isVisible = !document.hidden;
      this.isTabVisible$.next(isVisible);
      
      if (isVisible) {
        this.handleTabBecameVisible();
      }
    });

    // Track window focus/blur
    window.addEventListener('focus', () => {
      this.isTabVisible$.next(true);
      this.handleTabBecameVisible();
    });

    window.addEventListener('blur', () => {
      this.isTabVisible$.next(false);
    });
    
    // Add global debug functions for troubleshooting
    this.addGlobalDebugFunctions();
  }

  private addGlobalDebugFunctions(): void {
    // Add global functions for debugging notifications
    (window as any).checkNotificationSettings = () => {
      const settings = this.settingsService.getSettings();
      const deviceType = this.mobileDetection.getDeviceType();
      
      console.log('Current notification settings:');
      console.log('  - Device type:', deviceType);
      console.log('  - Notifications enabled:', settings.notifications);
      console.log('  - Sound enabled:', settings.sound.enabled);
      console.log('  - Sound type:', settings.sound.type);
      console.log('  - Browser permission:', Notification.permission);
      console.log('  - Tab visible:', this.isTabVisible());
      console.log('  - PWA notifications supported:', this.mobileDetection.supportsPWANotifications());
      
      if (!settings.notifications) {
        console.log('To enable notifications: Go to Settings → Turn on "Notifications" toggle');
      }
      
      if (Notification.permission !== 'granted') {
        console.log('To grant browser permission: Click "Allow" when prompted or check browser settings');
      }
      
      return {
        deviceType,
        appNotifications: settings.notifications,
        browserPermission: Notification.permission,
        soundEnabled: settings.sound.enabled,
        tabVisible: this.isTabVisible(),
        pwaSupported: this.mobileDetection.supportsPWANotifications()
      };
    };
    
    (window as any).forceTestNotification = async () => {
      console.log('Force testing notification...');
      const testContext = {
        title: 'Force Test Notification',
        body: 'This notification bypasses app settings for testing',
        type: 'phase-complete' as const,
        activityTitle: 'Test Activity'
      };
      await this.sendPushNotification(testContext, this.authService.getAccessToken());
    };
    
    (window as any).enableNotifications = () => {
      console.log('Enabling notifications in app settings...');
      this.settingsService.updateSettings({ notifications: true });
      console.log('Notifications enabled! Now test with a timer completion.');
    };
    
    (window as any).testFCMRegistration = async () => {
      console.log('Testing FCM registration...');
      // JWT is no longer needed, auth is handled by cookies
      
      try {
        await this.fcmService.initializeFCM();
        console.log('FCM registration test completed successfully!');
      } catch (error) {
        console.log('FCM registration test failed:', error);
      }
    };
    
    (window as any).testMobileModal = () => {
      console.log('📱 Testing mobile notification modal...');
      this.showNotificationModal({
        title: 'Test Mobile Modal',
        body: 'This is a test of the mobile notification modal',
        type: 'session-complete',
        activityTitle: 'Test Activity',
        nextAction: 'Great job! Take a break.'
      });
    };
  }

  private handleTabBecameVisible(): void {
    if (this.pendingNotifications.length > 0 && this.shouldShowPendingNotifications()) {
      this.showPendingNotificationsAsModals();
      this.pendingNotifications = [];
    }
  }

  private shouldShowPendingNotifications(): boolean {
    // Check if user is logged in
    const jwt = this.authService.getAccessToken();
    if (!jwt) {
      console.log('User not logged in - clearing pending notifications');
      this.pendingNotifications = [];
      return false;
    }

    // Check if user is on a relevant page (not login/signup/landing)
    const currentUrl = window.location.pathname;
    const irrelevantPages = ['/login', '/signup', '/landing', '/'];
    
    if (irrelevantPages.some(page => currentUrl.includes(page))) {
      console.log('User on irrelevant page - not showing pending notifications');
      return false;
    }

    const thirtyMinutesAgo = Date.now() - (30 * 60 * 1000);
    const recentNotifications = this.pendingNotifications.filter(notification => {
      return (notification as any).timestamp > thirtyMinutesAgo;
    });

    if (recentNotifications.length !== this.pendingNotifications.length) {
      console.log('Filtering out old pending notifications');
      this.pendingNotifications = recentNotifications;
    }

    return this.pendingNotifications.length > 0;
  }

  private showPendingNotificationsAsModals(): void {
    this.pendingNotifications.forEach(context => {
      this.showNotificationModal(context);
    });
  }

  /**
   * Handle incoming FCM message
   */
  private handleFcmMessage(payload: any): void {
    const notification = payload.notification;
    const data = payload.data;
    
    if (!notification) return;

    const context: NotificationContext = {
      title: notification.title,
      body: notification.body,
      sessionId: data?.sessionId ? parseInt(data.sessionId) : undefined,
      activityId: data?.activityId ? parseInt(data.activityId) : undefined,
      type: 'session-complete', // Default to session complete if not specified
      nextAction: 'View Session'
    };

    // We treat FCM messages as "foreground" if the app is open
    this.handleNotification(context);
  }

  /**
   * Handle session completion notifications based on device type and tab visibility
   */
  async handleSessionCompletion(context: NotificationContext): Promise<void> {
    const enhancedContext = {
      ...context,
      type: 'session-complete' as const,
      nextAction: 'Congratulations! You completed your session.'
    };

    await this.handleNotification(enhancedContext);
  }

  /**
   * Handle phase completion notifications based on device type and tab visibility
   */
  async handlePhaseCompletion(context: NotificationContext): Promise<void> {
    const enhancedContext = {
      ...context,
      type: 'phase-complete' as const,
      nextAction: context.title.includes('FOCUS') 
        ? 'Time for a break! Step away from your work.'
        : 'Break time is over. Ready to focus again?'
    };

    await this.handleNotification(enhancedContext);
  }

  /**
   * Main notification handler - determines behavior based on device and visibility
   */
  private async handleNotification(context: NotificationContext): Promise<void> {
    const settings = this.settingsService.getSettings();
    const isTabVisible = this.isTabVisible$.value;
    const deviceType = this.mobileDetection.getDeviceType();
    const jwt = this.authService.getAccessToken();

    console.log('Notification triggered:', {
      type: context.type,
      tabVisible: isTabVisible,
      deviceType,
      notifications: settings.notifications,
      sound: settings.sound.enabled
    });

    if (isTabVisible) {
      await this.handleForegroundNotification(context, settings, deviceType);
    } else {
      await this.handleBackgroundNotification(context, settings, jwt);
    }
  }

  /**
   * Handle notifications when site is visible (foreground)
   */
  private async handleForegroundNotification(
    context: NotificationContext, 
    settings: AppSettings, 
    deviceType: string
  ): Promise<void> {
    console.log('Foreground notification - Device:', deviceType);
    
    if (deviceType === 'mobile' || deviceType === 'tablet') {
      await this.handleMobileForegroundNotification(context, settings);
    } else {
      await this.handleDesktopForegroundNotification(context, settings);
    }
  }

  /**
   * Handle mobile foreground notifications (browser notification with modal fallback + sound)
   */
  private async handleMobileForegroundNotification(
    context: NotificationContext, 
    settings: AppSettings
  ): Promise<void> {
    console.log('Mobile foreground notification');

    if (settings.sound.enabled) {
      console.log('Playing mobile completion sound:', settings.sound.type);
      this.settingsService.playSound(settings.sound.type);
    }

    if (settings.notifications) {
      const notificationSent = await this.tryMobileBrowserNotification(context);
      
      if (!notificationSent) {
        console.log('Browser notification not available, showing modal fallback');
        this.showNotificationModal(context);
      }
    } else {
      console.log('Mobile notifications disabled - sound only');
    }
  }

  /**
   * Try to send browser notification on mobile (Android)
   * Returns true if notification was sent, false if not supported/denied
   */
  private async tryMobileBrowserNotification(context: NotificationContext): Promise<boolean> {
    try {
      if (!('Notification' in window)) {
        console.log('Notification API not available on this device');
        return false;
      }

      let permission = Notification.permission;

      if (permission === 'default') {
        console.log('Requesting notification permission on mobile...');
        permission = await Notification.requestPermission();
      }

      if (permission === 'granted') {
        console.log('Permission granted, sending mobile browser notification...');
        
        const notification = new Notification(context.title, {
          body: context.body,
          icon: '/assets/images/logo.png',
          tag: 'pomodify-session',
          requireInteraction: true 
        });

        notification.onclick = () => {
          console.log('Mobile notification clicked - focusing window');
          window.focus();
          notification.close();
        };

        console.log('Mobile browser notification sent successfully!');
        return true;
      }

      if (permission === 'denied') {
        console.log('Notification permission denied on mobile');
      }

      return false;
    } catch (error) {
      console.error('Mobile browser notification failed:', error);
      return false;
    }
  }

  /**
   * Handle desktop foreground notifications (same as background)
   */
  private async handleDesktopForegroundNotification(
    context: NotificationContext, 
    settings: AppSettings
  ): Promise<void> {
    const jwt = this.authService.getAccessToken();
    
    console.log('Desktop foreground notification - same as background behavior');
    
    if (settings.notifications && settings.sound.enabled) {
      console.log('Both notifications and sound enabled - sending push notification + playing sound');
      await this.sendPushNotification(context, jwt);
      this.settingsService.playSound(settings.sound.type);
    } else if (settings.notifications && !settings.sound.enabled) {
      console.log('Only notifications enabled - sending push notification (no sound)');
      await this.sendPushNotification(context, jwt);
    } else if (!settings.notifications && settings.sound.enabled) {
      console.log('Only sound enabled - playing sound (no push notification)');
      this.settingsService.playSound(settings.sound.type);
    } else {
      // Both disabled - nothing happens
      console.log('Both notifications and sound disabled - doing nothing');
    }
  }

  /**
   * Handle notifications when site is not visible (background)
   */
  private async handleBackgroundNotification(
    context: NotificationContext, 
    settings: AppSettings, 
    jwt: string | null
  ): Promise<void> {
    console.log('Background notification - Notifications enabled:', settings.notifications, 'Sound enabled:', settings.sound.enabled);
    
    if (settings.notifications && settings.sound.enabled) {
      console.log('Both notifications and sound enabled - sending push notification + playing sound');
      await this.sendPushNotification(context, jwt);
      this.playBackgroundSound();
    } else if (settings.notifications && !settings.sound.enabled) {
      console.log('Only notifications enabled - sending push notification (no sound)');
      await this.sendPushNotification(context, jwt);
    } else if (!settings.notifications && settings.sound.enabled) {
      console.log('Only sound enabled - playing sound (no push notification)');
      this.playBackgroundSound();
    } else {
      console.log('Both notifications and sound disabled - doing nothing');
    }

    const contextWithTimestamp = {
      ...context,
      timestamp: Date.now()
    };
    this.pendingNotifications.push(contextWithTimestamp);
  }

  /**
   * Show notification modal for mobile devices
   */
  private showNotificationModal(context: NotificationContext): void {
    const modalData: NotificationModalData = {
      title: context.title,
      body: context.body,
      type: context.type || 'phase-complete',
      activityTitle: context.activityTitle,
      nextAction: context.nextAction
    };

    const dialogRef = this.dialog.open(NotificationModalComponent, {
      width: '90vw',
      maxWidth: '400px',
      disableClose: false,
      hasBackdrop: true,
      backdropClass: 'notification-modal-backdrop',
      panelClass: 'notification-modal-panel',
      data: modalData
    });

    dialogRef.afterClosed().subscribe(result => {
      console.log('📱 Notification modal closed by user:', result);
    });
  }

  /**
   * Send push notification (desktop notification)
   */
  private async sendPushNotification(context: NotificationContext, jwt: string | null): Promise<void> {
    try {
      console.log('Sending desktop push notification:', context.title);
      
      // Check notification permission first
      let permission = Notification.permission;
      
      if (permission === 'default') {
        console.log('Requesting notification permission...');
        permission = await Notification.requestPermission();
      }
      
      if (permission === 'granted') {
        // Send browser notification directly (most reliable)
        console.log('Permission granted, sending desktop notification...');
        
        try {
          const notification = new Notification(context.title, {
            body: context.body,
            icon: '/assets/images/logo.png',
            tag: 'pomodify-session'
          });
          
          // Add click handler to focus the app
          notification.onclick = () => {
            console.log('Notification clicked - focusing window');
            window.focus();
            notification.close();
          };
          
          // No auto-close - let user decide when to dismiss
          
          console.log('🎉 Desktop notification sent successfully!');
          
        } catch (notificationError) {
          console.error('Notification creation failed:', notificationError);
          
          // Ultra-simple fallback
          try {
            new Notification(context.title);
            console.log('Fallback notification sent');
          } catch (fallbackError) {
            console.error('Even fallback notification failed:', fallbackError);
          }
        }
        
        // Also try FCM registration in background (for future use)
        // JWT is no longer needed, auth is handled by cookies
        this.fcmService.initializeFCM().catch(error => {
          console.log('FCM registration failed (not critical):', error);
        });
        
      } else if (permission === 'denied') {
        console.log('Notification permission denied by user');
      } else {
        console.log('Notification permission not available');
      }
      
    } catch (error) {
      console.error('Failed to send push notification:', error);
    }
  }

  private playBackgroundSound(): void {
    const settings = this.settingsService.getSettings();
    console.log('Playing background sound:', settings.sound.type);
    this.settingsService.playSound(settings.sound.type);
  }

  /**
   * Get current tab visibility status
   */
  isTabVisible(): boolean {
    return this.isTabVisible$.value;
  }

  /**
   * Get pending notifications count
   */
  getPendingNotificationsCount(): number {
    return this.pendingNotifications.length;
  }

  /**
   * Clear pending notifications
   */
  clearPendingNotifications(): void {
    console.log('Clearing pending notifications');
    this.pendingNotifications = [];
  }

  /**
   * Clear pending notifications on logout
   */
  onUserLogout(): void {
    console.log('User logged out - clearing all pending notifications');
    this.clearPendingNotifications();
  }

  /**
   * Test desktop notification directly
   */
  async testDesktopNotification(): Promise<void> {
    console.log('Testing desktop notification from service...');
    
    const testContext: NotificationContext = {
      title: 'Pomodify Test Notification',
      body: 'Test notification from NotificationService!',
      type: 'phase-complete',
      activityTitle: 'Test Activity'
    };
    
    const settings = this.settingsService.getSettings();
    const jwt = this.authService.getAccessToken();
    
    console.log('Test settings:', { notifications: settings.notifications, sound: settings.sound.enabled });
    
    if (!settings.notifications) {
      console.log('Notifications are disabled in settings. Enabling temporarily for test...');
      await this.sendPushNotification(testContext, jwt);
    } else {
      await this.sendPushNotification(testContext, jwt);
    }
  }

  /**
   * Force send desktop notification (bypasses settings check)
   */
  async forceDesktopNotification(context: NotificationContext): Promise<void> {
    console.log('Force sending desktop notification (bypassing settings)...');
    const jwt = this.authService.getAccessToken();
    await this.sendPushNotification(context, jwt);
  }
}