import { CommonModule } from '@angular/common';
import { Component, computed, signal, HostListener } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

interface Activity {
  id: string;
  name: string;
  icon: string;
  lastAccessed: string;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard {
  // Sidebar state
  protected sidebarExpanded = signal(true);

  // Toggle sidebar
  protected toggleSidebar(): void {
    this.sidebarExpanded.update(expanded => !expanded);
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
  // --- State ---
  protected readonly activities = signal<Activity[]>([
    { id: 'math', name: 'Study Math', icon: '📘', lastAccessed: '1 hr ago' },
    { id: 'angular', name: 'Learn Angular', icon: '{}', lastAccessed: '2 days ago' },
    { id: 'design', name: 'Design Prototype', icon: '🎨', lastAccessed: '3 days ago' },
    { id: 'kotlin', name: 'Learn Kotlin', icon: '</>', lastAccessed: '1 week ago' },
  ]);

  protected readonly selectedActivityId = signal('math');

  protected readonly currentActivity = computed(() =>
    this.activities().find(a => a.id === this.selectedActivityId()) ?? this.activities()[0]
  );

  protected readonly focusTime = signal('25:00');
  protected readonly isTimerRunning = signal(false);
  protected readonly isPaused = signal(false);

  protected readonly currentStreak = signal(4);
  protected readonly todayFocusHours = signal(3);
  protected readonly totalSessions = signal(2);

  // --- Actions ---
  protected selectActivity(activityId: string): void {
    this.selectedActivityId.set(activityId);
  }

  protected playTimer(): void {
    this.isTimerRunning.set(true);
    this.isPaused.set(false);
  }

  protected pauseTimer(): void {
    if (!this.isTimerRunning()) {
      return;
    }
    this.isPaused.set(true);
  }

  protected stopTimer(): void {
    this.isTimerRunning.set(false);
    this.isPaused.set(false);
  }
}
