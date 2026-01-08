import { CommonModule } from '@angular/common';
import { Component, signal, inject, computed, effect, ViewChild, ElementRef, AfterViewInit, OnInit } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { toggleTheme } from '../../shared/theme';
import { Profile, ProfileData } from '../profile/profile';
import { MatDialog } from '@angular/material/dialog';
import { Auth } from '../../core/services/auth';
import { SettingsService } from '../../core/services/settings.service';
import { NotificationService } from '../../core/services/notification.service';
import { UserProfileService } from '../../core/services/user-profile.service';
import { Logger } from '../../core/services/logger.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './settings.html',
  styleUrls: ['./settings.scss'],
})
export class Settings implements OnInit, AfterViewInit {
  @ViewChild('soundSelect') soundSelect!: ElementRef<HTMLSelectElement>;
  private settingsService = inject(SettingsService);
  private notificationService = inject(NotificationService);
  private userProfileService = inject(UserProfileService);
  
  // Profile picture from shared service - updates when profile changes
  protected profilePictureUrl = this.userProfileService.profilePictureUrl;
  
  // Sidebar state
  protected sidebarExpanded = signal(true);
  protected isLoggingOut = signal(false);

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
      Logger.log('Effect: Sound type synced to:', currentSoundType);
      
      // Update the select element directly if it exists
      if (this.soundSelect?.nativeElement) {
        this.soundSelect.nativeElement.value = currentSoundType;
      }
    });
    
    // Debug: Log current settings on component init
    Logger.log('Settings component initialized with:', this.settings());
    Logger.log('Sound type from signal:', this.soundType());
  }

  ngOnInit(): void {
    // Auto-collapse sidebar on mobile
    if (typeof window !== 'undefined' && window.innerWidth <= 768) {
      this.sidebarExpanded.set(false);
    }
    
    // Update theme state when component initializes
    this.updateThemeState();
    
    // Fetch user profile and sync with shared service
    this.auth.fetchAndStoreUserProfile().then(user => {
      if (user) {
        this.userProfileService.updateUserProfile({
          firstName: user.firstName || '',
          lastName: user.lastName || '',
          email: user.email || '',
          profilePictureUrl: user.profilePictureUrl || null,
          backupEmail: user.backupEmail || null,
          isEmailVerified: user.isEmailVerified || false
        });
      }
    }).catch(err => console.error('[Settings] Failed to fetch profile', err));
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
    // Add haptic feedback for mobile devices
    if ('vibrate' in navigator && typeof (navigator as any).vibrate === 'function') {
      (navigator as any).vibrate(50);
    }
    
    toggleTheme();
    
    // Update theme state after a short delay to ensure DOM has been updated
    setTimeout(() => {
      this.updateThemeState();
    }, 100);
    
    this.showAutoSaveSuccess('Dark Mode');
  }

  private updateThemeState(): void {
    // Check actual DOM state instead of just localStorage
    // This ensures the toggle reflects the actual applied theme
    const actuallyDark = document.documentElement.classList.contains('theme-dark');
    this.isDarkMode.set(actuallyDark);
  }

  // Sound Settings Methods
  protected toggleSound(): void {
    const currentEnabled = this.soundEnabled();
    this.settingsService.updateSoundSettings({ enabled: !currentEnabled });
    this.showAutoSaveSuccess('Notification Sound');
  }

  protected onSoundTypeChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    const type = select.value as 'bell' | 'chime' | 'digital' | 'soft';
    Logger.log('Sound type changed to:', type);
    Logger.log('Current soundType() before update:', this.soundType());
    this.settingsService.updateSoundSettings({ type });
    Logger.log('Current soundType() after update:', this.soundType());
    this.showAutoSaveSuccess('Sound Type');
  }

  protected onVolumeChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const volume = parseInt(input.value, 10);
    this.settingsService.updateSoundSettings({ volume });
    this.showAutoSaveSuccess('Volume');
    Logger.log('Volume changed to:', volume);
  }



  protected testSound(): void {
    const soundType = this.soundType();
    Logger.log('🔊 Testing sound:', soundType);
    this.settingsService.playSound(soundType);
  }

  // Auto-Start Methods
  protected toggleAutoStartBreaks(): void {
    const currentAutoStartBreaks = this.autoStartBreaks();
    this.settingsService.updateAutoStartSettings({ autoStartBreaks: !currentAutoStartBreaks });
    this.showAutoSaveSuccess('Auto-start Breaks');
  }

  protected toggleAutoStartPomodoros(): void {
    const currentAutoStartPomodoros = this.autoStartPomodoros();
    this.settingsService.updateAutoStartSettings({ autoStartPomodoros: !currentAutoStartPomodoros });
    this.showAutoSaveSuccess('Auto-start Pomodoros');
  }

  // Other Settings Methods
  protected toggleNotifications(): void {
    const currentNotifications = this.notificationsEnabled();
    const newNotificationState = !currentNotifications;
    
    this.settingsService.updateSettings({ notifications: newNotificationState });
    this.showAutoSaveSuccess('Desktop Notifications');
    
    // If enabling notifications, initialize FCM
    if (newNotificationState) {
      Logger.log('🔔 Notifications enabled - initializing FCM...');
      // FCM will be initialized automatically when first notification is sent
      // This is handled in the notification service
    }
  }





  protected onLogout(): void {
    this.isLoggingOut.set(true);
    this.auth.logout()
      .finally(() => {
        this.isLoggingOut.set(false);
      });
  }

  protected navigateTo(route: string): void {
    this.router.navigate([route]);
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
          Logger.log('Profile updated:', result);
          // TODO(Delumen, Ivan): persist profile changes to backend
        }
      });
  }

  // Modal states removed - now using full-width layout

  // Auto-save feedback
  protected autoSaveStatus = signal<'idle' | 'saving' | 'saved'>('idle');
  protected savedSettingName = signal<string>('');

  private showAutoSaveSuccess(settingName: string = 'Settings'): void {
    this.savedSettingName.set(settingName);
    this.autoSaveStatus.set('saving');
    setTimeout(() => {
      this.autoSaveStatus.set('saved');
      setTimeout(() => {
        this.autoSaveStatus.set('idle');
        this.savedSettingName.set('');
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
    Logger.log('Deleting account...');
    this.auth.deleteAccount()
      .then(() => {
        Logger.log('Account deleted successfully');
      })
      .catch((error) => {
        console.error('Failed to delete account:', error);
        alert('Failed to delete account. Please try again.');
      });
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
    Logger.log('Clearing session history...');
    this.settingsService.clearSessionHistory().subscribe({
      next: (response) => {
        Logger.log('Session history cleared:', response.message);
        this.showSuccessModal.set(true);
      },
      error: (error) => {
        console.error('Failed to clear session history:', error);
        alert('Failed to clear session history. Please try again.');
      }
    });
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
    Logger.log('Clearing activity data...');
    this.settingsService.clearActivityData().subscribe({
      next: (response) => {
        Logger.log('Activity data cleared:', response.message);
        this.showSuccessModal.set(true);
      },
      error: (error) => {
        console.error('Failed to clear activity data:', error);
        alert('Failed to clear activity data. Please try again.');
      }
    });
  }

  protected onCancelClearActivities(): void {
    this.showClearActivitiesModal.set(false);
  }

  ngAfterViewInit(): void {
    // Ensure the select element shows the correct value after view init
    if (this.soundSelect?.nativeElement) {
      this.soundSelect.nativeElement.value = this.soundType();
      Logger.log('AfterViewInit: Set select value to:', this.soundType());
    }
    

  }
}
