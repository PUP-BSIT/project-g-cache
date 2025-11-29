import { CommonModule } from '@angular/common';
import { Component, signal, HostListener, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { toggleTheme } from '../../shared/theme';
import { Profile, ProfileData } from '../profile/profile';
import { Auth } from '../../core/services/auth';

@Component({
  selector: 'app-report',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './report.html',
  styleUrl: './report.scss',
})
export class Report {
  private dialog = inject(MatDialog);
  private router = inject(Router);
  private auth = inject(Auth);

  // Sidebar state
  protected sidebarExpanded = signal(true);

  // Toggle sidebar
  protected toggleSidebar(): void {
    this.sidebarExpanded.update((expanded) => !expanded);
  }

  onToggleTheme() {
    toggleTheme();
  }

  // Handle navigation icon click - expand sidebar, no bounce
  protected onNavIconClick(event: MouseEvent, route: string): void {
    // Always expand sidebar when navigating
    if (!this.sidebarExpanded()) {
      this.sidebarExpanded.set(true);
    }
    // If already on the same route, prevent navigation but keep sidebar expanded
    if (this.router.url === route) {
      event.preventDefault();
    }
  }

  // Collapse sidebar when clicking main content
  onMainContentClick(): void {
    if (this.sidebarExpanded()) {
      this.sidebarExpanded.set(false);
    }
  }

  protected onLogout(): void {
    this.auth.logout();
  }

  // Profile Modal
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
