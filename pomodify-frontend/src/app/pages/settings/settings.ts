import { CommonModule } from '@angular/common';
import { Component, signal, inject, computed, effect, ViewChild, ElementRef, AfterViewInit, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { toggleTheme } from '../../shared/theme';
import { Profile, ProfileData } from '../profile/profile';
import { MatDialog } from '@angular/material/dialog';
import { Auth } from '../../core/services/auth';
import { SettingsService } from '../../core/services/settings.service';
import { NotificationService } from '../../core/services/notification.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './settings.html',
  styleUrls: ['./settings.scss'],
})
export class Settings implements OnInit, AfterViewInit {
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

  ngOnInit(): void {
    // Update theme state when component initializes
    this.updateThemeState();
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
    
    this.showAutoSaveSuccess();
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





  protected onLogout(): void {
    this.auth.logout();
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
          console.log('Profile updated:', result);
          // TODO(Delumen, Ivan): persist profile changes to backend
        }
      });
  }

  // Modal states removed - now using full-width layout

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
    

  }
}
