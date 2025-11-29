import { CommonModule } from '@angular/common';
import { Component, computed, signal, HostListener, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, Router } from '@angular/router';
import { toggleTheme } from '../../shared/theme';
import { Profile, ProfileData } from '../profile/profile';
import { MatDialog } from '@angular/material/dialog';
import { Auth } from '../../core/services/auth';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './settings.html',
  styleUrls: ['./settings.scss'],
})
export class Settings {
  private dialog = inject(MatDialog);
  
  // Sidebar state
  protected sidebarExpanded = signal(true);

  // Router for route-aware sidebar clicks
  private router = inject(Router);
  private auth = inject(Auth);

  // Settings toggles
  protected notificationsEnabled = signal(true);
  protected calendarSyncEnabled = signal(false);

  // Toggle sidebar
  protected toggleSidebar(): void {
    this.sidebarExpanded.update((expanded) => !expanded);
  }

  onToggleTheme() {
    toggleTheme();
  }

  // Toggle settings
  protected toggleNotifications(): void {
    this.notificationsEnabled.update((enabled) => !enabled);
  }

  protected toggleCalendarSync(): void {
    this.calendarSyncEnabled.update((enabled) => !enabled);
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
          // TODO: persist profile changes to backend
        }
      });
  }
}
