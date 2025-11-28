import { CommonModule } from '@angular/common';
import { Component, computed, signal, HostListener, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, Router } from '@angular/router';
import { toggleTheme } from '../../shared/theme';
import { Profile, ProfileData } from '../profile/profile';

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
}
