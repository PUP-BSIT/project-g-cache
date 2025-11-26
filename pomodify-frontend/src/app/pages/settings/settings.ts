import { CommonModule } from '@angular/common';
import { Component, computed, signal, HostListener } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { toggleTheme } from '../../shared/theme';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './settings.html',
  styleUrls: ['./settings.scss'],
})
export class Settings {
  // Sidebar state
  protected sidebarExpanded = signal(true);

  // Settings toggles
  protected notificationsEnabled = signal(true);
  protected calendarSyncEnabled = signal(false);

  // Toggle sidebar
  protected toggleSidebar(): void {
    this.sidebarExpanded.update(expanded => !expanded);
  }

  onToggleTheme() { toggleTheme(); }

  // Close sidebar on mobile when clicking outside
  @HostListener('document:click', ['$event'])
  onClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.closest('.sidebar') && !target.closest('.sidebar-toggle')) {
      if (window.innerWidth < 768) {
        this.sidebarExpanded.set(false);
      }
    }
  }

  // Toggle settings
  protected toggleNotifications(): void {
    this.notificationsEnabled.update(enabled => !enabled);
  }

  protected toggleCalendarSync(): void {
    this.calendarSyncEnabled.update(enabled => !enabled);
  }
}
