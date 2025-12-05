import { CommonModule } from '@angular/common';
import { Component, signal, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { toggleTheme, getStoredTheme } from '../../shared/theme';
import { Profile, ProfileData } from '../profile/profile';
import { MatDialog } from '@angular/material/dialog';
import { Auth } from '../../core/services/auth';
import { SettingsService } from '../../core/services/settings.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, FormsModule],
  templateUrl: './settings.html',
  styleUrls: ['./settings.scss'],
})
export class Settings {
  private settingsService = inject(SettingsService);
  
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
  }
  
  // Sound Settings
  protected soundEnabled = signal(this.settings().sound.enabled);
  protected soundType = signal(this.settings().sound.type);
  protected volume = signal(this.settings().sound.volume);
  protected tickSoundEnabled = signal(this.settings().sound.tickSound);

  // Auto-Start Settings
  protected autoStartBreaks = signal(this.settings().autoStart.autoStartBreaks);
  protected autoStartPomodoros = signal(this.settings().autoStart.autoStartPomodoros);

  // Other Settings
  protected notificationsEnabled = signal(this.settings().notifications);
  protected calendarSyncEnabled = signal(this.settings().calendarSync);

  // Modal state
  protected showDeleteModal = signal(false);
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
    this.soundEnabled.update((enabled: boolean) => !enabled);
    this.settingsService.updateSoundSettings({ enabled: this.soundEnabled() });
  }

  protected onSoundTypeChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    const type = select.value as 'bell' | 'chime' | 'digital' | 'soft';
    this.soundType.set(type);
    this.settingsService.updateSoundSettings({ type });
  }

  protected onVolumeChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const volume = parseInt(input.value, 10);
    this.volume.set(volume);
    this.settingsService.updateSoundSettings({ volume });
    console.log('Volume changed to:', volume);
  }

  protected toggleTickSound(): void {
    this.tickSoundEnabled.update((enabled: boolean) => !enabled);
    this.settingsService.updateSoundSettings({ tickSound: this.tickSoundEnabled() });
  }

  protected testSound(): void {
    this.settingsService.playSound(this.soundType());
  }

  // Auto-Start Methods
  protected toggleAutoStartBreaks(): void {
    this.autoStartBreaks.update((enabled: boolean) => !enabled);
    this.settingsService.updateAutoStartSettings({ autoStartBreaks: this.autoStartBreaks() });
  }

  protected toggleAutoStartPomodoros(): void {
    this.autoStartPomodoros.update((enabled: boolean) => !enabled);
    this.settingsService.updateAutoStartSettings({ autoStartPomodoros: this.autoStartPomodoros() });
  }

  // Other Settings Methods
  protected toggleNotifications(): void {
    this.notificationsEnabled.update((enabled: boolean) => !enabled);
    this.settingsService.updateSettings({ notifications: this.notificationsEnabled() });
  }

  protected toggleCalendarSync(): void {
    this.calendarSyncEnabled.update((enabled: boolean) => !enabled);
    this.settingsService.updateSettings({ calendarSync: this.calendarSyncEnabled() });
  }

  // Handle navigation icon click
  protected onNavIconClick(event: MouseEvent, route: string): void {
    if (this.router.url === route) {
      event.preventDefault();
      this.toggleSidebar();
      return;
    }
  }

  // Collapse sidebar when clicking main content
  protected onMainContentClick(): void {
    if (this.sidebarExpanded()) {
      this.sidebarExpanded.set(false);
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
    alert('Session history cleared successfully!');
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
    alert('Activity data cleared successfully!');
  }

  protected onCancelClearActivities(): void {
    this.showClearActivitiesModal.set(false);
  }
}
