import { CommonModule } from '@angular/common';
import { Component, signal, inject, computed, effect, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { toggleTheme, getStoredTheme } from '../../shared/theme';
import { Profile, ProfileData } from '../profile/profile';
import { MatDialog } from '@angular/material/dialog';
import { Auth } from '../../core/services/auth';
import { SettingsService } from '../../core/services/settings.service';
import { NotificationService } from '../../core/services/notification.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './settings.html',
  styleUrls: ['./settings.scss'],
})
export class Settings implements AfterViewInit {
  @ViewChild('soundSelect') soundSelect!: ElementRef<HTMLSelectElement>;
  private settingsService = inject(SettingsService);
  private notificationService = inject(NotificationService);
  
  // Sidebar state
  protected sidebarExpanded = signal(true);

  // Get settings from service
  protected settings = this.settingsService.getSettingsSignal();
  
  constructor(
    private dialog: MatDialog,
    private router: Router,
    private auth: Auth
  ) {
    // Initialize theme state
    this.updateThemeState();
    
    // Sync local soundType signal with settings service
    effect(() => {
      const currentSoundType = this.settings().sound.type;
      this.soundType.set(currentSoundType);
      console.log('Effect: Sound type synced to:', currentSoundType);
      
      // Update the select element directly if it exists
      if (this.soundSelect?.nativeElement) {
        this.soundSelect.nativeElement.value = currentSoundType;
      }
    });
    
    // Debug: Log current settings on component init
    console.log('Settings component initialized with:', this.settings());
    console.log('Sound type from signal:', this.soundType());
  }
  
  // Computed signals that react to settings changes
  protected soundEnabled = computed(() => this.settings().sound.enabled);
  protected soundType = signal(this.settings().sound.type); // Use signal for dropdown binding
  protected volume = computed(() => this.settings().sound.volume);


  // Auto-Start Settings
  protected autoStartBreaks = computed(() => this.settings().autoStart.autoStartBreaks);
  protected autoStartPomodoros = computed(() => this.settings().autoStart.autoStartPomodoros);

  // Other Settings
  protected notificationsEnabled = computed(() => this.settings().notifications);


  // Modal state
  protected showDeleteModal = signal(false);
  protected showSuccessModal = signal(false);
  protected showClearSessionsModal = signal(false);
  protected showClearActivitiesModal = signal(false);

  // Theme state
  protected isDarkMode = signal(false);

  // Sound types for dropdown
  protected soundTypes = [
    { value: 'bell', label: 'Bell' },
    { value: 'chime', label: 'Chime' },
    { value: 'digital', label: 'Digital Beep' },
    { value: 'soft', label: 'Soft Ding' }
  ];

  // Toggle sidebar
  protected toggleSidebar(): void {
    this.sidebarExpanded.update((expanded: boolean) => !expanded);
  }

  onToggleTheme(): void {
    toggleTheme();
    this.updateThemeState();
  }

  private updateThemeState(): void {
    this.isDarkMode.set(getStoredTheme() === 'dark');
  }

  // Sound Settings Methods
  protected toggleSound(): void {
    const currentEnabled = this.soundEnabled();
    this.settingsService.updateSoundSettings({ enabled: !currentEnabled });
    this.showAutoSaveSuccess();
  }

  protected onSoundTypeChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    const type = select.value as 'bell' | 'chime' | 'digital' | 'soft';
    console.log('Sound type changed to:', type);
    console.log('Current soundType() before update:', this.soundType());
    this.settingsService.updateSoundSettings({ type });
    console.log('Current soundType() after update:', this.soundType());
    this.showAutoSaveSuccess();
  }

  protected onVolumeChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const volume = parseInt(input.value, 10);
    this.settingsService.updateSoundSettings({ volume });
    this.showAutoSaveSuccess();
    console.log('Volume changed to:', volume);
  }



  protected testSound(): void {
    const soundType = this.soundType();
    console.log('🔊 Testing sound:', soundType);
    this.settingsService.playSound(soundType);
  }

  // Auto-Start Methods
  protected toggleAutoStartBreaks(): void {
    const currentAutoStartBreaks = this.autoStartBreaks();
    this.settingsService.updateAutoStartSettings({ autoStartBreaks: !currentAutoStartBreaks });
    this.showAutoSaveSuccess();
  }

  protected toggleAutoStartPomodoros(): void {
    const currentAutoStartPomodoros = this.autoStartPomodoros();
    this.settingsService.updateAutoStartSettings({ autoStartPomodoros: !currentAutoStartPomodoros });
    this.showAutoSaveSuccess();
  }

  // Other Settings Methods
  protected toggleNotifications(): void {
    const currentNotifications = this.notificationsEnabled();
    const newNotificationState = !currentNotifications;
    
    this.settingsService.updateSettings({ notifications: newNotificationState });
    this.showAutoSaveSuccess();
    
    // If enabling notifications, initialize FCM
    if (newNotificationState) {
      console.log('🔔 Notifications enabled - initializing FCM...');
      // FCM will be initialized automatically when first notification is sent
      // This is handled in the notification service
    }
  }

  protected testNotification(): void {
    console.log('🔔 Testing desktop notification...');
    console.log('🔍 Current permission:', Notification.permission);
    console.log('🔍 Notification API available:', 'Notification' in window);
    
    // Check if Notification API is available
    if (!('Notification' in window)) {
      console.log('❌ Notification API not supported in this browser');
      alert('Notifications are not supported in this browser');
      return;
    }
    
    // Test both direct notification and service notification
    console.log('🧪 Testing direct notification...');
    this.testDirectNotification();
    
    console.log('🧪 Testing service notification...');
    this.notificationService.testDesktopNotification();
  }

  private testDirectNotification(): void {
    // Request permission if needed
    if (Notification.permission === 'default') {
      console.log('📱 Requesting notification permission...');
      Notification.requestPermission().then(permission => {
        console.log('📱 Permission result:', permission);
        if (permission === 'granted') {
          this.sendTestNotification();
        } else {
          console.log('❌ Notification permission denied');
          alert('Notification permission was denied. Please enable notifications in your browser settings.');
        }
      });
    } else if (Notification.permission === 'granted') {
      console.log('✅ Permission already granted, sending notification...');
      this.sendTestNotification();
    } else {
      console.log('❌ Notifications are blocked');
      alert('Notifications are blocked. Please enable them in your browser settings and try again.');
    }
  }

  private sendTestNotification(): void {
    try {
      console.log('🚀 Creating notification...');
      
      // Simple, guaranteed-to-work notification
      const notification = new Notification('Pomodify Test', {
        body: 'Desktop notification is working!',
        icon: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
      });
      
      console.log('📦 Notification created successfully');
      
      notification.onclick = () => {
        console.log('👆 Notification clicked!');
        window.focus();
        notification.close();
      };
      
      // Auto-close after 5 seconds
      setTimeout(() => {
        notification.close();
      }, 5000);
      
      console.log('✅ Test notification sent successfully!');
      
    } catch (error) {
      console.error('❌ Error creating notification:', error);
      
      // Fallback: Try even simpler notification
      try {
        new Notification('Pomodify Test');
        console.log('✅ Fallback notification sent!');
      } catch (fallbackError) {
        console.error('❌ Fallback notification also failed:', fallbackError);
        alert('Notification failed: ' + fallbackError);
      }
    }
  }



  protected onLogout(): void {
    this.auth.logout();
  }

  // Open profile modal using MatDialog to match other pages
  protected openProfileModal(): void {
    this.dialog
      .open(Profile, {
        width: '550px',
        maxWidth: '90vw',
        panelClass: 'profile-dialog',
      })
      .afterClosed()
      .subscribe((result: ProfileData) => {
        if (result) {
          console.log('Profile updated:', result);
          // TODO(Delumen, Ivan): persist profile changes to backend
        }
      });
  }

  // Auto-save feedback
  protected autoSaveStatus = signal<'idle' | 'saving' | 'saved'>('idle');

  private showAutoSaveSuccess(): void {
    this.autoSaveStatus.set('saving');
    setTimeout(() => {
      this.autoSaveStatus.set('saved');
      setTimeout(() => {
        this.autoSaveStatus.set('idle');
      }, 2000);
    }, 300);
  }

  protected onCloseSuccessModal(): void {
    this.showSuccessModal.set(false);
  }

  // Delete account
  protected onDeleteAccount(): void {
    this.showDeleteModal.set(true);
  }

  protected onConfirmDelete(): void {
    this.showDeleteModal.set(false);
    // TODO: Call backend API to delete account
    console.log('Deleting account...');
    alert('Account deletion requested. You will be logged out.');
    this.auth.logout();
  }

  protected onCancelDelete(): void {
    this.showDeleteModal.set(false);
  }

  // Clear Session History
  protected onClearSessions(): void {
    this.showClearSessionsModal.set(true);
  }

  protected onConfirmClearSessions(): void {
    this.showClearSessionsModal.set(false);
    // TODO: Call backend API to clear session history
    console.log('Clearing session history...');
    this.showSuccessModal.set(true);
  }

  protected onCancelClearSessions(): void {
    this.showClearSessionsModal.set(false);
  }

  // Clear Activity Data
  protected onClearActivities(): void {
    this.showClearActivitiesModal.set(true);
  }

  protected onConfirmClearActivities(): void {
    this.showClearActivitiesModal.set(false);
    // TODO: Call backend API to clear activity data
    console.log('Clearing activity data...');
    this.showSuccessModal.set(true);
  }

  protected onCancelClearActivities(): void {
    this.showClearActivitiesModal.set(false);
  }

  ngAfterViewInit(): void {
    // Ensure the select element shows the correct value after view init
    if (this.soundSelect?.nativeElement) {
      this.soundSelect.nativeElement.value = this.soundType();
      console.log('AfterViewInit: Set select value to:', this.soundType());
    }
    
    // Add global test function for debugging
    (window as any).testNotificationDirect = () => {
      console.log('🧪 Direct notification test from window function');
      if (Notification.permission === 'granted') {
        new Notification('Direct Test', { body: 'This is a direct test!' });
        console.log('✅ Direct notification sent');
      } else {
        Notification.requestPermission().then(p => {
          if (p === 'granted') {
            new Notification('Direct Test', { body: 'Permission granted and notification sent!' });
            console.log('✅ Permission granted, notification sent');
          } else {
            console.log('❌ Permission denied');
          }
        });
      }
    };
    
    console.log('🔧 Added window.testNotificationDirect() function for debugging');
  }
}
