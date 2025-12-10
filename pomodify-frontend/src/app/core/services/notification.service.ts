import { Injectable, inject } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { SettingsService, AppSettings } from './settings.service';
import { FcmService } from './fcm.service';
import { Auth } from './auth';

export interface NotificationContext {
  title: string;
  body: string;
  sessionId?: number;
  activityId?: number;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private settingsService = inject(SettingsService);
  private fcmService = inject(FcmService);
  private authService = inject(Auth);
  
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
      console.log('🔧 Current notification settings:');
      console.log('  - Notifications enabled:', settings.notifications);
      console.log('  - Sound enabled:', settings.sound.enabled);
      console.log('  - Sound type:', settings.sound.type);
      console.log('  - Browser permission:', Notification.permission);
      console.log('  - Tab visible:', this.isTabVisible());
      
      if (!settings.notifications) {
        console.log('💡 To enable notifications: Go to Settings → Turn on "Notifications" toggle');
      }
      
      if (Notification.permission !== 'granted') {
        console.log('💡 To grant browser permission: Click "Allow" when prompted or check browser settings');
      }
      
      return {
        appNotifications: settings.notifications,
        browserPermission: Notification.permission,
        soundEnabled: settings.sound.enabled,
        tabVisible: this.isTabVisible()
      };
    };
    
    (window as any).forceTestNotification = async () => {
      console.log('🚨 Force testing notification...');
      const testContext = {
        title: '🧪 Force Test Notification',
        body: 'This notification bypasses app settings for testing'
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
    
    console.log('🔧 Added global debug functions:');
    console.log('  - checkNotificationSettings() - Check current settings');
    console.log('  - forceTestNotification() - Force test notification');
    console.log('  - enableNotifications() - Enable notifications in app');
  }

  private handleTabBecameVisible(): void {
    // When user returns to tab, show any pending notifications as modals
    if (this.pendingNotifications.length > 0) {
      this.showPendingNotificationsAsModals();
      this.pendingNotifications = [];
    }
  }

  private showPendingNotificationsAsModals(): void {
    // TODO: Implement modal display for pending notifications
    // This will be implemented when we create the completion modal
    console.log('Showing pending notifications as modals:', this.pendingNotifications);
  }

  /**
   * Handle session completion notifications based on tab visibility and settings
   */
  async handleSessionCompletion(context: NotificationContext): Promise<void> {
    const settings = this.settingsService.getSettings();
    const isTabVisible = this.isTabVisible$.value;
    const jwt = this.authService.getAccessToken();

    console.log('🎯 Session completion - Tab visible:', isTabVisible);
    console.log('⚙️ Settings - Notifications:', settings.notifications, 'Sound:', settings.sound.enabled);
    console.log('🔊 Sound type:', settings.sound.type, 'Volume:', settings.sound.volume);

    // ALWAYS play sound first if enabled, regardless of tab visibility
    if (settings.sound.enabled) {
      console.log('🔊 Playing completion sound immediately:', settings.sound.type);
      this.settingsService.playSound(settings.sound.type);
    }

    if (isTabVisible) {
      // User is on the tab - handle immediately
      await this.handleForegroundCompletion(context, settings);
    } else {
      // User is not on the tab (closed or different tab)
      await this.handleBackgroundCompletion(context, settings, jwt);
    }
  }

  private async handleForegroundCompletion(context: NotificationContext, settings: AppSettings): Promise<void> {
    // When user is actively on the tab
    if (settings.sound.enabled) {
      console.log('🔊 Playing completion sound:', settings.sound.type);
      this.settingsService.playSound(settings.sound.type);
    }
    
    // Show immediate visual feedback (could be a toast or modal)
    console.log('Foreground completion:', context.title);
  }

  private async handleBackgroundCompletion(context: NotificationContext, settings: AppSettings, jwt: string | null): Promise<void> {
    // DESKTOP CLOSED TAB BEHAVIOR
    console.log('🔍 Background completion - Notifications enabled:', settings.notifications, 'Sound enabled:', settings.sound.enabled);
    
    if (settings.notifications && settings.sound.enabled) {
      // Both push notification AND sound enabled
      console.log('📱 Both notifications and sound enabled - sending push notification');
      await this.sendPushNotification(context, jwt);
      this.playBackgroundSound();
    } else if (settings.notifications && !settings.sound.enabled) {
      // Only push notification enabled, sound disabled
      console.log('📱 Only notifications enabled - sending push notification');
      await this.sendPushNotification(context, jwt);
      // No sound
    } else if (!settings.notifications && settings.sound.enabled) {
      // Only sound enabled, no push notification
      console.log('🔊 Only sound enabled - no push notification');
      console.log('💡 To enable desktop notifications, go to Settings and turn on "Notifications"');
      this.playBackgroundSound();
    } else {
      console.log('❌ Both notifications and sound disabled - doing nothing');
      console.log('💡 To enable notifications, go to Settings and turn on "Notifications"');
    }

    // Store for modal display when user returns
    this.pendingNotifications.push(context);
  }

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
          
          // Auto-close after 10 seconds
          setTimeout(() => {
            notification.close();
          }, 10000);
          
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
   * Handle phase completion (focus -> break or break -> focus)
   */
  async handlePhaseCompletion(context: NotificationContext): Promise<void> {
    const settings = this.settingsService.getSettings();
    const isTabVisible = this.isTabVisible$.value;
    const jwt = this.authService.getAccessToken();

    console.log('🎯 Phase completion - Tab visible:', isTabVisible);
    console.log('⚙️ Settings - Notifications:', settings.notifications, 'Sound:', settings.sound.enabled);
    console.log('🔊 Sound type:', settings.sound.type, 'Volume:', settings.sound.volume);

    // ALWAYS play sound first if enabled, regardless of tab visibility
    if (settings.sound.enabled) {
      console.log('🔊 Playing phase completion sound immediately:', settings.sound.type);
      this.settingsService.playSound(settings.sound.type);
    }

    if (isTabVisible) {
      // User is on the tab - handle immediately
      await this.handleForegroundCompletion(context, settings);
    } else {
      // User is not on the tab (closed or different tab)
      await this.handleBackgroundCompletion(context, settings, jwt);
    }
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
    this.pendingNotifications = [];
  }

  /**
   * Test desktop notification directly
   */
  async testDesktopNotification(): Promise<void> {
    console.log('🧪 Testing desktop notification from service...');
    
    const testContext: NotificationContext = {
      title: '🍅 Pomodify Test',
      body: 'Test notification from NotificationService!'
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