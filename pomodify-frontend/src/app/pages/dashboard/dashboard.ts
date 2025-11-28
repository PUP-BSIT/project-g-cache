import { CommonModule } from '@angular/common';
import { Component, computed, signal, HostListener, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { toggleTheme } from '../../shared/theme';
import { CreateActivityModal, ActivityData } from '../../shared/components/create-activity-modal/create-activity-modal';
import { EditActivityModal } from '../../shared/components/edit-activity-modal/edit-activity-modal';
import { DeleteActivityModal } from '../../shared/components/delete-activity-modal/delete-activity-modal';

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
  private dialog = inject(MatDialog);
  // Router used for route-aware sidebar click handling
  private router = inject(Router);

  // Sidebar state
  protected sidebarExpanded = signal(true);

  // Toggle sidebar
  protected toggleSidebar(): void {
    this.sidebarExpanded.update(expanded => !expanded);
  }

  // Handle navigation icon click (prevents navigation when already on the same route and toggles sidebar)
  protected onNavIconClick(event: MouseEvent, route: string): void {
    if (this.router.url === route) {
      event.preventDefault();
      this.toggleSidebar();
      return;
    }

    event.preventDefault();
    this.router.navigateByUrl(route).catch(err => console.error('Navigation error', err));
  }

  onToggleTheme() { toggleTheme(); }

  // Collapse sidebar when clicking main content
  protected onMainContentClick(): void {
    if (this.sidebarExpanded()) {
      this.sidebarExpanded.set(false);
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

  protected openCreateActivityModal(): void {
    this.dialog.open(CreateActivityModal).afterClosed().subscribe((result: ActivityData) => {
      if (result) {
        console.log('New activity created:', result);
        // TODO: Send to backend and add to activities list
      }
    });
  }

  protected openEditActivityModal(): void {
    // Sample data to demonstrate the Edit Activity modal UI
    const sample: ActivityData = {
      name: 'Study Math',
      category: 'Study',
      colorTag: 'blue',
      estimatedHoursPerWeek: 3
    };

    this.dialog.open(EditActivityModal, { data: sample }).afterClosed().subscribe((updated: ActivityData) => {
      if (updated) {
        console.log('Updated activity:', updated);
        // TODO: persist updated activity and update UI
      }
    });
  }

  protected openDeleteActivityModal(): void {
    const sample = { id: 'math', name: 'Study Math' };
    this.dialog.open(DeleteActivityModal, { data: sample }).afterClosed().subscribe((confirmed: boolean) => {
      if (confirmed) {
        console.log('Delete confirmed for', sample);
        // TODO: remove from activities and call backend
      }
    });
  }
}