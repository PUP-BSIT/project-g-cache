import { CommonModule } from '@angular/common';
import { Component, signal, HostListener } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
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

  // Toggle sidebar
  protected toggleSidebar(): void {
    this.sidebarExpanded.update((expanded) => !expanded);
  }

  onToggleTheme() {
    toggleTheme();
  }

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

  // Report state - placeholder data
  protected readonly weeklyStats = signal({
    totalHours: 24.5,
    sessionsCompleted: 18,
    averageSession: 82,
    longestStreak: 7,
  });

  protected readonly activityBreakdown = signal([
    { name: 'Study Math', hours: 8.5, percentage: 35, color: '#5FA9A4' },
    { name: 'Learn Angular', hours: 6.0, percentage: 24, color: '#7BC4BF' },
    { name: 'Design Prototype', hours: 5.5, percentage: 22, color: '#52C97C' },
    { name: 'Learn Kotlin', hours: 4.5, percentage: 19, color: '#F4C430' },
  ]);

  protected readonly dailyProgress = signal([
    { day: 'Mon', hours: 3.5 },
    { day: 'Tue', hours: 4.0 },
    { day: 'Wed', hours: 3.0 },
    { day: 'Thu', hours: 4.5 },
    { day: 'Fri', hours: 5.0 },
    { day: 'Sat', hours: 2.5 },
    { day: 'Sun', hours: 2.0 },
  ]);
}
