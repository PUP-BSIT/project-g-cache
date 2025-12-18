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
  }

  private initializeVisibilityTracking(): void {
    console.log('🔍 Initializing tab visibility tracking...');
    
    // Track tab visibility changes
    document.addEventListener('visibilitychange', () => {
      const isVisible = !document.hidden;
      console.log('👁️ Tab visibility changed:', isVisible ? 'VISIBLE' : 'HIDDEN');
      this.isTabVisible$.next(isVisible);
      
      if (isVisible) {
        this.handleTabBecameVisible();
      }
    });

    // Track window focus/blur
    window.addEventListener('focus', () => {
      console.log('🎯 Window focused');
      this.isTabVisible$.next(true);
      this.handleTabBecameVisible();
    });

    window.addEventListener('blur', () => {
      console.log('😴 Window blurred');
      this.isTabVisible$.next(false);
    });
    
    console.log('✅ Tab visibility tracking initialized');
    
    // Add global debug functions for troubleshooting
    this.addGlobalDebugFunctions();
  }

  private addGlobalDebugFunctions(): void {
    // Add global functions for debugging notifications
    (window as any).checkNotificationSettings = () => {
      const settings = this.settingsService.getSettings();
      const deviceType = this.mobileDetection.getDeviceType();
      
      console.log('🔧 Current notification settings:');
      console.log('  - Device type:', deviceType);
      console.log('  - Notifications enabled:', settings.notifications);
      console.log('  - Sound enabled:', settings.sound.enabled);
      console.log('  - Sound type:', settings.sound.type);
      console.log('  - Browser permission:', Notification.permission);
      console.log('  - Tab visible:', this.isTabVisible());
      console.log('  - PWA notifications supported:', this.mobileDetection.supportsPWANotifications());
      
      if (!settings.notifications) {
        console.log('💡 To enable notifications: Go to Settings → Turn on "Notifications" toggle');
      }
      
      if (Notification.permission !== 'granted') {
        console.log('💡 To grant browser permission: Click "Allow" when prompted or check browser settings');
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
      console.log('🚨 Force testing notification...');
      const testContext = {
        title: '🧪 Force Test Notification',
        body: 'This notification bypasses app settings for testing',
        type: 'phase-complete' as const,
        activityTitle: 'Test Activity'
      };
      await this.sendPushNotification(testContext, this.authService.getAccessToken());
    };
    
    (window as any).enableNotifications = () => {
      console.log('🔧 Enabling notifications in app settings...');
      this.settingsService.updateSettings({ notifications: true });
      console.log('✅ Notifications enabled! Now test with a timer completion.');
    };
    
    (window as any).testFCMRegistration = async () => {
      console.log('🧪 Testing FCM registration...');
      const jwt = this.authService.getAccessToken();
      if (!jwt) {
        console.log('❌ No JWT token available. Please login first.');
        return;
      }
      
      try {
        await this.fcmService.initializeFCM(jwt);
        console.log('✅ FCM registration test completed successfully!');
      } catch (error) {
        console.log('❌ FCM registration test failed:', error);
      }
    };
    
    (window as any).testMobileModal = () => {
      console.log('📱 Testing mobile notification modal...');
      this.showNotificationModal({
        title: '🧪 Test Mobile Modal',
        body: 'This is a test of the mobile notification modal',
        type: 'session-complete',
        activityTitle: 'Test Activity',
        nextAction: 'Great job! Take a break.'
      });
    };
    
    console.log('🔧 Added global debug functions:');
    console.log('  - checkNotificationSettings() - Check current settings');
    console.log('  - forceTestNotification() - Force test notification');
    console.log('  - enableNotifications() - Enable notifications in app');
    console.log('  - testFCMRegistration() - Test FCM registration');
    console.log('  - testMobileModal() - Test mobile notification modal');
  }

  private handleTabBecameVisible(): void {
    // When user returns to tab, show any pending notifications as modals
    // BUT only if user is still logged in and on a relevant page
    if (this.pendingNotifications.length > 0 && this.shouldShowPendingNotifications()) {
      this.showPendingNotificationsAsModals();
      this.pendingNotifications = [];
    }
  }

  private shouldShowPendingNotifications(): boolean {
    // Check if user is logged in
    const jwt = this.authService.getAccessToken();
    if (!jwt) {
      console.log('🚫 User not logged in - clearing pending notifications');
      this.pendingNotifications = [];
      return false;
    }

    // Check if user is on a relevant page (not login/signup/landing)
    const currentUrl = window.location.pathname;
    const irrelevantPages = ['/login', '/signup', '/landing', '/'];
    
    if (irrelevantPages.some(page => currentUrl.includes(page))) {
      console.log('🚫 User on irrelevant page - not showing pending notifications');
      return false;
    }

    // Check if notifications are from recent session (within last 30 minutes)
    const thirtyMinutesAgo = Date.now() - (30 * 60 * 1000);
    const recentNotifications = this.pendingNotifications.filter(notification => {
      // Add timestamp to notifications when they're created
      return (notification as any).timestamp > thirtyMinutesAgo;
    });

    if (recentNotifications.length !== this.pendingNotifications.length) {
      console.log('🕒 Filtering out old pending notifications');
      this.pendingNotifications = recentNotifications;
    }

    return this.pendingNotifications.length > 0;
  }

  private showPendingNotificationsAsModals(): void {
    // Show pending notifications as modals when user returns
    this.pendingNotifications.forEach(context => {
      this.showNotificationModal(context);
    });
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

    console.log('🎯 Notification triggered:', {
      type: context.type,
      tabVisible: isTabVisible,
      deviceType,
      notifications: settings.notifications,
      sound: settings.sound.enabled
    });

    if (isTabVisible) {
      // Site is visible - handle foreground notifications
      await this.handleForegroundNotification(context, settings, deviceType);
    } else {
      // Site is not visible - handle background notifications
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
    console.log('🔍 Foreground notification - Device:', deviceType);
    
    if (deviceType === 'mobile' || deviceType === 'tablet') {
      // MOBILE/TABLET: Show modal instead of push notification
      await this.handleMobileForegroundNotification(context, settings);
    } else {
      // DESKTOP: Same behavior as background (push notification + sound)
      await this.handleDesktopForegroundNotification(context, settings);
    }
  }

  /**
   * Handle mobile foreground notifications (modal + sound)
   */
  private async handleMobileForegroundNotification(
    context: NotificationContext, 
    settings: AppSettings
  ): Promise<void> {
    console.log('📱 Mobile foreground notification');
    
    // Play sound if enabled
    if (settings.sound.enabled) {
      console.log('🔊 Playing mobile completion sound:', settings.sound.type);
      this.settingsService.playSound(settings.sound.type);
    }

    // Show modal if notifications enabled
    if (settings.notifications) {
      console.log('📱 Showing mobile notification modal');
      this.showNotificationModal(context);
    } else {
      console.log('📱 Mobile notifications disabled - sound only');
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
    
    console.log('🖥️ Desktop foreground notification - same as background behavior');
    
    if (settings.notifications && settings.sound.enabled) {
      // Both push notification AND sound enabled
      console.log('📱🔊 Both notifications and sound enabled - sending push notification + playing sound');
      await this.sendPushNotification(context, jwt);
      this.settingsService.playSound(settings.sound.type);
    } else if (settings.notifications && !settings.sound.enabled) {
      // Push notification enabled but sound disabled
      console.log('📱 Only notifications enabled - sending push notification (no sound)');
      await this.sendPushNotification(context, jwt);
    } else if (!settings.notifications && settings.sound.enabled) {
      // Only sound enabled, no push notification
      console.log('🔊 Only sound enabled - playing sound (no push notification)');
      this.settingsService.playSound(settings.sound.type);
    } else {
      // Both disabled - nothing happens
      console.log('❌ Both notifications and sound disabled - doing nothing');
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
    // BACKGROUND BEHAVIOR - Same for all devices
    console.log('🔍 Background notification - Notifications enabled:', settings.notifications, 'Sound enabled:', settings.sound.enabled);
    
    if (settings.notifications && settings.sound.enabled) {
      // Both push notification AND sound enabled → both happen at the same time
      console.log('📱🔊 Both notifications and sound enabled - sending push notification + playing sound');
      await this.sendPushNotification(context, jwt);
      this.playBackgroundSound();
    } else if (settings.notifications && !settings.sound.enabled) {
      // Push notification enabled but sound disabled → only push notification, no sound
      console.log('📱 Only notifications enabled - sending push notification (no sound)');
      await this.sendPushNotification(context, jwt);
    } else if (!settings.notifications && settings.sound.enabled) {
      // Only sound enabled, no push notification
      console.log('🔊 Only sound enabled - playing sound (no push notification)');
      this.playBackgroundSound();
    } else {
      // Both disabled - nothing happens
      console.log('❌ Both notifications and sound disabled - doing nothing');
    }

    // Store for modal display when user returns (with timestamp)
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

    // No auto-close - let user decide when to dismiss
    dialogRef.afterClosed().subscribe(result => {
      console.log('📱 Notification modal closed by user:', result);
    });
  }

  /**
   * Send push notification (desktop notification)
   */
  private async sendPushNotification(context: NotificationContext, jwt: string | null): Promise<void> {
    try {
      console.log('🔔 Sending desktop push notification:', context.title);
      
      // Check notification permission first
      let permission = Notification.permission;
      
      if (permission === 'default') {
        console.log('📱 Requesting notification permission...');
        permission = await Notification.requestPermission();
      }
      
      if (permission === 'granted') {
        // Send browser notification directly (most reliable)
        console.log('✅ Permission granted, sending desktop notification...');
        
        try {
          const notification = new Notification(context.title, {
            body: context.body,
            icon: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
            tag: 'pomodify-session'
          });
          
          // Add click handler to focus the app
          notification.onclick = () => {
            console.log('👆 Notification clicked - focusing window');
            window.focus();
            notification.close();
          };
          
          // No auto-close - let user decide when to dismiss
          
          console.log('🎉 Desktop notification sent successfully!');
          
        } catch (notificationError) {
          console.error('❌ Notification creation failed:', notificationError);
          
          // Ultra-simple fallback
          try {
            new Notification(context.title);
            console.log('✅ Fallback notification sent');
          } catch (fallbackError) {
            console.error('❌ Even fallback notification failed:', fallbackError);
          }
        }
        
        // Also try FCM registration in background (for future use)
        if (jwt) {
          this.fcmService.initializeFCM(jwt).catch(error => {
            console.log('⚠️ FCM registration failed (not critical):', error);
          });
        }
        
      } else if (permission === 'denied') {
        console.log('❌ Notification permission denied by user');
      } else {
        console.log('⚠️ Notification permission not available');
      }
      
    } catch (error) {
      console.error('❌ Failed to send push notification:', error);
    }
  }

  private playBackgroundSound(): void {
    // Play notification sound even when tab is not visible
    const settings = this.settingsService.getSettings();
    console.log('🔊 Playing background sound:', settings.sound.type);
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
    console.log('🧹 Clearing pending notifications');
    this.pendingNotifications = [];
  }

  /**
   * Clear pending notifications on logout
   */
  onUserLogout(): void {
    console.log('👋 User logged out - clearing all pending notifications');
    this.clearPendingNotifications();
  }

  /**
   * Test desktop notification directly
   */
  async testDesktopNotification(): Promise<void> {
    console.log('🧪 Testing desktop notification from service...');
    
    const testContext: NotificationContext = {
      title: '🍅 Pomodify Test',
      body: 'Test notification from NotificationService!',
      type: 'phase-complete',
      activityTitle: 'Test Activity'
    };
    
    // Force background behavior to test desktop notification
    const settings = this.settingsService.getSettings();
    const jwt = this.authService.getAccessToken();
    
    console.log('🔧 Test settings:', { notifications: settings.notifications, sound: settings.sound.enabled });
    
    if (!settings.notifications) {
      console.log('⚠️ Notifications are disabled in settings. Enabling temporarily for test...');
      // Force send notification for testing even if disabled
      await this.sendPushNotification(testContext, jwt);
    } else {
      await this.sendPushNotification(testContext, jwt);
    }
  }

  /**
   * Force send desktop notification (bypasses settings check)
   */
  async forceDesktopNotification(context: NotificationContext): Promise<void> {
    console.log('🚨 Force sending desktop notification (bypassing settings)...');
    const jwt = this.authService.getAccessToken();
    await this.sendPushNotification(context, jwt);
  }
}