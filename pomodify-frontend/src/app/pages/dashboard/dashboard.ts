import { CommonModule } from '@angular/common';
import { Component, computed, signal, HostListener, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { toggleTheme } from '../../shared/theme';
import { CreateActivityModal, ActivityData } from '../../shared/components/create-activity-modal/create-activity-modal';
import { EditActivityModal } from '../../shared/components/edit-activity-modal/edit-activity-modal';
import { DeleteActivityModal } from '../../shared/components/delete-activity-modal/delete-activity-modal';
import { CreateNoteModal, NoteData as CreateNoteData } from '../../shared/components/create-note-modal/create-note-modal';
import { EditNoteModal, NoteData as EditNoteData } from '../../shared/components/edit-note-modal/edit-note-modal';
import { DeleteNoteModal } from '../../shared/components/delete-note-modal/delete-note-modal';
import { Profile, ProfileData } from '../profile/profile';
import { Timer } from '../../shared/services/timer';

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
  styleUrls: ['./dashboard.scss'],
})
export class Dashboard {
  private dialog = inject(MatDialog);
  // Router used for route-aware sidebar click handling
  private router = inject(Router);

  // Sidebar state
  protected sidebarExpanded = signal(true);

  constructor() {
    // Set up the completion callback.
    this.timer.setOnComplete(() => {
      this.onTimerComplete();
    });
  }

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

  // Timer state is provided by the Timer service.
  protected readonly focusTime = computed(() => this.formatTime(this.timer.remainingSeconds()));
  protected readonly isTimerRunning = this.timer.isRunning;
  protected readonly isPaused = this.timer.isPaused;

  protected readonly currentStreak = signal(4);
  protected readonly todayFocusHours = signal(3);
  protected readonly totalSessions = signal(2);

  // --- Actions ---
  protected selectActivity(activityId: string): void {
    this.selectedActivityId.set(activityId);
  }

  protected playTimer(): void {
    // Start or resume the countdown.
    this.timer.start();
  }

  protected pauseTimer(): void {
    // Pause the countdown but keep the remaining time.
    this.timer.pause();
  }

  protected stopTimer(): void {
    // Stop and reset the countdown back to 25:00.
    this.timer.stop();
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