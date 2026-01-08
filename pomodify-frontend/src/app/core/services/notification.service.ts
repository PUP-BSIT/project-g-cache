import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, firstValueFrom } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { SettingsService, AppSettings } from './settings.service';
import { FcmService } from './fcm.service';
import { Auth } from './auth';
import { MobileDetectionService } from './mobile-detection.service';
import { NotificationModalComponent, NotificationModalData } from '../../shared/components/notification-modal/notification-modal.component';
import { TimerSyncService, TimerCompletionEvent } from './timer-sync.service';
import { Logger } from './logger.service';

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
  private timerSyncService = inject(TimerSyncService);
  
  private isTabVisible$ = new BehaviorSubject<boolean>(true);
  private pendingNotifications: NotificationContext[] = [];
  
  // Track if we're on the timer page (to avoid duplicate notifications)
  private isOnTimerPage = false;

  constructor() {
    this.initializeVisibilityTracking();
    this.initializeServiceWorkerMessageListener();
    
    // Subscribe to FCM messages to handle foreground notifications
    this.fcmService.messages$.subscribe(payload => {
      Logger.log('🔔 Received foreground FCM message in NotificationService:', payload);
      this.handleFcmMessage(payload);
    });
    
    // Subscribe to timer completion events for background notifications
    // This handles notifications when user navigates away from timer page
    this.timerSyncService.timerComplete$.subscribe(event => {
      Logger.log('🔔 Timer completion event received in NotificationService:', event);
      // Only handle if NOT on timer page (timer page handles its own notifications)
      if (!this.isOnTimerPage) {
        this.handleBackgroundTimerCompletion(event);
      } else {
        Logger.log('🔔 On timer page - letting session-timer handle notification');
      }
    });
  }
  
  /**
   * Listen for messages from the service worker to play notification sounds
   * This handles sound playback when push notifications arrive via FCM
   */
  private initializeServiceWorkerMessageListener(): void {
    if (typeof navigator !== 'undefined' && navigator.serviceWorker) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        Logger.log('🔔 Received message from service worker:', event.data);
        
        if (event.data?.type === 'PLAY_NOTIFICATION_SOUND') {
          const soundType = event.data.soundType || this.settingsService.getSettings().sound.type;
          Logger.log('🔊 Playing notification sound from service worker request:', soundType);
          this.settingsService.playSound(soundType);
        }
      });
      
      Logger.log('🔔 Service worker message listener initialized for notification sounds');
    }
  }
  
  /**
   * Set whether we're currently on the timer page
   * Called by session-timer component to prevent duplicate notifications
   */
  setOnTimerPage(isOnPage: boolean): void {
    this.isOnTimerPage = isOnPage;
    Logger.log('🔔 Timer page status:', isOnPage ? 'ON timer page' : 'NOT on timer page');
  }
  
  /**
   * Handle timer completion when user is NOT on the timer page
   */
  private async handleBackgroundTimerCompletion(event: TimerCompletionEvent): Promise<void> {
    Logger.log('🔔 Handling background timer completion:', event);
    
    const activityTitle = event.activityTitle || 'Activity';
    const nextPhase = event.phase === 'FOCUS' ? 'BREAK' : 'FOCUS';
    const phaseName = event.phase === 'LONG_BREAK' ? 'Long Break' : event.phase;
    
    const context: NotificationContext = {
      title: `${phaseName} Phase Complete!`,
      body: `Time for a ${nextPhase.toLowerCase()} in "${activityTitle}"`,
      sessionId: event.sessionId,
      activityId: event.activityId,
      activityTitle: activityTitle,
      type: 'phase-complete'
    };
    
    await this.handlePhaseCompletion(context);
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
      
      Logger.log('Current notification settings:');
      Logger.log('  - Device type:', deviceType);
      Logger.log('  - Notifications enabled:', settings.notifications);
      Logger.log('  - Sound enabled:', settings.sound.enabled);
      Logger.log('  - Sound type:', settings.sound.type);
      Logger.log('  - Browser permission:', Notification.permission);
      Logger.log('  - Tab visible:', this.isTabVisible());
      Logger.log('  - PWA notifications supported:', this.mobileDetection.supportsPWANotifications());
      
      if (!settings.notifications) {
        Logger.log('To enable notifications: Go to Settings → Turn on "Notifications" toggle');
      }
      
      if (Notification.permission !== 'granted') {
        Logger.log('To grant browser permission: Click "Allow" when prompted or check browser settings');
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
      Logger.log('Force testing notification...');
      const testContext = {
        title: 'Force Test Notification',
        body: 'This notification bypasses app settings for testing',
        type: 'phase-complete' as const,
        activityTitle: 'Test Activity'
      };
      await this.sendPushNotification(testContext, this.authService.getAccessToken());
    };
    
    (window as any).enableNotifications = () => {
      Logger.log('Enabling notifications in app settings...');
      this.settingsService.updateSettings({ notifications: true });
      Logger.log('Notifications enabled! Now test with a timer completion.');
    };
    
    (window as any).testFCMRegistration = async () => {
      Logger.log('Testing FCM registration...');
      // JWT is no longer needed, auth is handled by cookies
      
      try {
        await this.fcmService.initializeFCM();
        Logger.log('FCM registration test completed successfully!');
      } catch (error) {
        Logger.log('FCM registration test failed:', error);
      }
    };
    
    (window as any).testMobileModal = () => {
      Logger.log('📱 Testing mobile notification modal...');
      this.showNotificationModal({
        title: 'Test Mobile Modal',
        body: 'This is a test of the mobile notification modal',
        type: 'session-complete',
        activityTitle: 'Test Activity',
        nextAction: 'Great job! Take a break.'
      });
    };
    
    (window as any).testBackendPush = async () => {
      Logger.log('🔔 Testing backend push notification...');
      try {
        const result = await firstValueFrom(this.fcmService.sendTestNotification(
          '🧪 Backend Test',
          'This notification was sent from the backend via FCM'
        ));
        Logger.log('Backend push test result:', result);
        return result;
      } catch (error) {
        Logger.log('Backend push test failed:', error);
        return { success: false, error };
      }
    };
    
    (window as any).checkPushDebug = async () => {
      Logger.log('🔍 Checking push notification debug info...');
      try {
        const result = await firstValueFrom(this.fcmService.getDebugInfo());
        Logger.log('Push debug info:', result);
        return result;
      } catch (error) {
        Logger.log('Failed to get push debug info:', error);
        return { error };
      }
    };
  }

  private handleTabBecameVisible(): void {
    if (this.pendingNotifications.length > 0 && this.shouldShowPendingNotifications()) {
      this.showPendingNotificationsAsModals();
      this.pendingNotifications = [];
    }
  }

  private shouldShowPendingNotifications(): boolean {
    // Check if user is logged in using auth service's isLoggedIn method
    if (!this.authService.isLoggedIn()) {
      Logger.log('User not logged in - clearing pending notifications');
      this.pendingNotifications = [];
      return false;
    }

    // Check if user is on a relevant page (not login/signup/landing)
    const currentUrl = window.location.pathname;
    const irrelevantPages = ['/login', '/signup', '/landing', '/'];
    
    if (irrelevantPages.some(page => currentUrl.includes(page))) {
      Logger.log('User on irrelevant page - not showing pending notifications');
      return false;
    }

    const thirtyMinutesAgo = Date.now() - (30 * 60 * 1000);
    const recentNotifications = this.pendingNotifications.filter(notification => {
      return (notification as any).timestamp > thirtyMinutesAgo;
    });

    if (recentNotifications.length !== this.pendingNotifications.length) {
      Logger.log('Filtering out old pending notifications');
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
   * NOTE: This is for FCM messages received when app is in foreground
   * We only play sound here since browser notification is already shown by sendPushNotification
   */
  private handleFcmMessage(payload: any): void {
    const notification = payload.notification;
    const data = payload.data;
    
    if (!notification) return;

    Logger.log('🔔 FCM message received - playing sound only (notification already shown)');
    
    // Only play sound for FCM messages, don't create another notification
    // The browser notification was already created by sendPushNotification
    const settings = this.settingsService.getSettings();
    if (settings.sound.enabled) {
      this.settingsService.playSound(settings.sound.type);
    }
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

    Logger.log('Notification triggered:', {
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
    Logger.log('Foreground notification - Device:', deviceType);
    
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
    Logger.log('Mobile foreground notification');

    if (settings.sound.enabled) {
      Logger.log('Playing mobile completion sound:', settings.sound.type);
      this.settingsService.playSound(settings.sound.type);
    }

    if (settings.notifications) {
      const notificationSent = await this.tryMobileBrowserNotification(context);
      
      if (!notificationSent) {
        Logger.log('Browser notification not available, showing modal fallback');
        this.showNotificationModal(context);
      }
    } else {
      Logger.log('Mobile notifications disabled - sound only');
    }
  }

  /**
   * Try to send browser notification on mobile (Android)
   * Returns true if notification was sent, false if not supported/denied
   */
  private async tryMobileBrowserNotification(context: NotificationContext): Promise<boolean> {
    try {
      if (!('Notification' in window)) {
        Logger.log('Notification API not available on this device');
        return false;
      }

      let permission = Notification.permission;

      if (permission === 'default') {
        Logger.log('Requesting notification permission on mobile...');
        permission = await Notification.requestPermission();
      }

      if (permission === 'granted') {
        Logger.log('Permission granted, sending mobile browser notification...');
        
        const notification = new Notification(context.title, {
          body: context.body,
          icon: '/assets/images/logo.png',
          tag: 'pomodify-session',
          requireInteraction: true 
        });

        notification.onclick = () => {
          Logger.log('Mobile notification clicked - focusing window');
          window.focus();
          notification.close();
        };

        Logger.log('Mobile browser notification sent successfully!');
        return true;
      }

      if (permission === 'denied') {
        Logger.log('Notification permission denied on mobile');
      }

      return false;
    } catch (error) {
      Logger.log('Mobile browser notification failed:', error);
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
    
    Logger.log('Desktop foreground notification - same as background behavior');
    
    if (settings.notifications && settings.sound.enabled) {
      Logger.log('Both notifications and sound enabled - sending push notification + playing sound simultaneously');
      // Play sound and send notification simultaneously (no await) for better sync
      this.settingsService.playSound(settings.sound.type);
      this.sendPushNotification(context, jwt);
    } else if (settings.notifications && !settings.sound.enabled) {
      Logger.log('Only notifications enabled - sending push notification (no sound)');
      this.sendPushNotification(context, jwt);
    } else if (!settings.notifications && settings.sound.enabled) {
      Logger.log('Only sound enabled - playing sound (no push notification)');
      this.settingsService.playSound(settings.sound.type);
    } else {
      // Both disabled - nothing happens
      Logger.log('Both notifications and sound disabled - doing nothing');
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
    Logger.log('Background notification - Notifications enabled:', settings.notifications, 'Sound enabled:', settings.sound.enabled);
    
    if (settings.notifications && settings.sound.enabled) {
      Logger.log('Both notifications and sound enabled - sending push notification + playing sound simultaneously');
      // Play sound and send notification simultaneously for better sync
      this.playBackgroundSound();
      this.sendPushNotification(context, jwt);
    } else if (settings.notifications && !settings.sound.enabled) {
      Logger.log('Only notifications enabled - sending push notification (no sound)');
      this.sendPushNotification(context, jwt);
    } else if (!settings.notifications && settings.sound.enabled) {
      Logger.log('Only sound enabled - playing sound (no push notification)');
      this.playBackgroundSound();
    } else {
      Logger.log('Both notifications and sound disabled - doing nothing');
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
      Logger.log('📱 Notification modal closed by user:', result);
    });
  }

  /**
   * Send push notification (desktop notification)
   * Only sends a single browser notification - no FCM to avoid duplicates
   */
  private async sendPushNotification(context: NotificationContext, _jwt: string | null): Promise<void> {
    try {
      Logger.log('Sending desktop push notification:', context.title);
      
      // Check notification permission first
      let permission = Notification.permission;
      
      if (permission === 'default') {
        Logger.log('Requesting notification permission...');
        permission = await Notification.requestPermission();
      }
      
      if (permission === 'granted') {
        // Send browser notification directly (most reliable)
        Logger.log('Permission granted, sending desktop notification...');
        
        try {
          const notification = new Notification(context.title, {
            body: context.body,
            icon: '/assets/images/logo.png',
            tag: 'pomodify-session' // Same tag prevents duplicate notifications
          });
          
          // Add click handler to focus the app
          notification.onclick = () => {
            Logger.log('Notification clicked - focusing window');
            window.focus();
            notification.close();
          };
          
          Logger.log('🎉 Desktop notification sent successfully!');
          
        } catch (notificationError) {
          Logger.log('Notification creation failed:', notificationError);
          
          // Ultra-simple fallback
          try {
            new Notification(context.title);
            Logger.log('Fallback notification sent');
          } catch (fallbackError) {
            Logger.log('Even fallback notification failed:', fallbackError);
          }
        }
        
        // NOTE: Removed FCM initialization here to prevent duplicate notifications
        // FCM should only be initialized once during app startup, not on every notification
        
      } else if (permission === 'denied') {
        Logger.log('Notification permission denied by user');
      } else {
        Logger.log('Notification permission not available');
      }
      
    } catch (error) {
      Logger.log('Failed to send push notification:', error);
    }
  }

  private playBackgroundSound(): void {
    const settings = this.settingsService.getSettings();
    Logger.log('Playing background sound:', settings.sound.type);
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
    Logger.log('Clearing pending notifications');
    this.pendingNotifications = [];
  }

  /**
   * Clear pending notifications on logout
   */
  onUserLogout(): void {
    Logger.log('User logged out - clearing all pending notifications');
    this.clearPendingNotifications();
  }

  /**
   * Test desktop notification directly
   */
  async testDesktopNotification(): Promise<void> {
    Logger.log('Testing desktop notification from service...');
    
    const testContext: NotificationContext = {
      title: 'Pomodify Test Notification',
      body: 'Test notification from NotificationService!',
      type: 'phase-complete',
      activityTitle: 'Test Activity'
    };
    
    const settings = this.settingsService.getSettings();
    const jwt = this.authService.getAccessToken();
    
    Logger.log('Test settings:', { notifications: settings.notifications, sound: settings.sound.enabled });
    
    if (!settings.notifications) {
      Logger.log('Notifications are disabled in settings. Enabling temporarily for test...');
      await this.sendPushNotification(testContext, jwt);
    } else {
      await this.sendPushNotification(testContext, jwt);
    }
  }

  /**
   * Force send desktop notification (bypasses settings check)
   */
  async forceDesktopNotification(context: NotificationContext): Promise<void> {
    Logger.log('Force sending desktop notification (bypassing settings)...');
    const jwt = this.authService.getAccessToken();
    await this.sendPushNotification(context, jwt);
  }
}
