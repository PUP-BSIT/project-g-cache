import { CommonModule } from '@angular/common';
import { Component, signal, HostListener } from '@angular/core';
import { RouterLink, RouterLinkActive, Router } from '@angular/router';
import { toggleTheme } from '../../shared/theme';

@Component({
  selector: 'app-report',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './report.html',
  styleUrl: './report.scss',
})
export class Report {
  // Sidebar state
  protected sidebarExpanded = signal(true);

  constructor(private router: Router) {}

  // Toggle sidebar
  protected toggleSidebar(): void {
    this.sidebarExpanded.update((expanded) => !expanded);
  }

  onToggleTheme() {
    toggleTheme();
  }

  // Handle navigation icon click
  onNavIconClick(event: MouseEvent, route: string): void {
    // Check if we're already on this route
    if (this.router.url === route) {
      // If on the same route, just toggle the sidebar
      event.preventDefault();
      this.toggleSidebar();
    }
    // If different route, let the navigation happen normally
  }

  // Collapse sidebar when clicking main content
  onMainContentClick(): void {
    if (this.sidebarExpanded()) {
      this.sidebarExpanded.set(false);
    }
  }
}
