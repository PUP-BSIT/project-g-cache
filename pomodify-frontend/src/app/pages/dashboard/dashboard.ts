import { CommonModule } from '@angular/common';
import { Component, computed, signal, HostListener, inject, OnInit } from '@angular/core';
import { RouterLink, RouterLinkActive, Router, ActivatedRoute, Params } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { toggleTheme } from '../../shared/theme';
import {
  CreateActivityModal,
  ActivityData,
} from '../../shared/components/create-activity-modal/create-activity-modal';
import { EditActivityModal } from '../../shared/components/edit-activity-modal/edit-activity-modal';
import { DeleteActivityModal } from '../../shared/components/delete-activity-modal/delete-activity-modal';
import { Profile, ProfileData } from '../profile/profile';
import { Timer } from '../../shared/services/timer';

type Activity = {
  id: string;
  name: string;
  icon: string;
  lastAccessed: string;
};

type StoredActivity = Activity & Record<string, unknown>;

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.scss'],
})
export class Dashboard implements OnInit {
  private dialog = inject(MatDialog);
  private timer = inject(Timer);
  // Router for route-aware sidebar clicks
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private readonly STORAGE_KEY = 'pomodify-activities';

  // Visual alert for timer completion
  protected showCompletionAlert = signal(false);

  // Sidebar state
  protected sidebarExpanded = signal(true);

  constructor() {
    // Set up the completion callback.
    this.timer.setOnComplete(() => {
      this.onTimerComplete();
    });
  }

  ngOnInit(): void {
    // Load activities first
    this.loadActivitiesFromStorage();
    
    // Check for query params to select activity
    this.route.queryParams.subscribe((params: Params) => {
      this.handleQueryParams(params);
    });
  }

  private handleQueryParams(params: Params): void {
    // Set timer if session info is provided (can be done immediately)
    if (params['focusTime']) {
      const focusTime = parseInt(params['focusTime'], 10);
      if (!isNaN(focusTime) && focusTime > 0) {
        // Set timer duration (in minutes)
        this.timer.setDuration(focusTime);
      }
    }

    // Handle activity selection (need to wait for activities to be loaded)
    if (params['activityId']) {
      const activityId = params['activityId'];
      const activities = this.activities();
      
      // If activities are already loaded, select immediately
      if (activities.length > 0) {
        const activityExists = activities.some((a: Activity) => a.id === activityId);
        if (activityExists) {
          this.selectActivity(activityId);
        }
      } else {
        // If activities not loaded yet, wait a bit and try again
        setTimeout(() => {
          const loadedActivities = this.activities();
          if (loadedActivities.length > 0) {
            const activityExists = loadedActivities.some((a: Activity) => a.id === activityId);
            if (activityExists) {
              this.selectActivity(activityId);
            }
          }
        }, 100);
      }
    }
  }

  private loadActivitiesFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as StoredActivity[] | null;
        const dashboardActivities: Activity[] = Array.isArray(parsed)
          ? parsed.map((activity) => ({
              id: activity.id,
              name: activity.name,
              icon: activity.icon,
              lastAccessed: activity.lastAccessed,
            }))
          : [];
        if (dashboardActivities.length > 0) {
          this.activities.set(dashboardActivities);
          const currentSelected = this.selectedActivityId();
          if (!currentSelected || !dashboardActivities.some((activity) => activity.id === currentSelected)) {
            this.selectedActivityId.set(dashboardActivities[0].id);
          }
          return;
        }
      }
      this.setDefaultActivities();
    } catch (error) {
      console.error('Error loading activities from storage:', error);
      this.setDefaultActivities();
    }
  }

  private setDefaultActivities(): void {
    const defaults: Activity[] = [
      { id: 'math', name: 'Study Math', icon: '📘', lastAccessed: '1 hr ago' },
      { id: 'angular', name: 'Learn Angular', icon: '{}', lastAccessed: '2 days ago' },
      { id: 'design', name: 'Design Prototype', icon: '🎨', lastAccessed: '3 days ago' },
      { id: 'kotlin', name: 'Learn Kotlin', icon: '</>', lastAccessed: '1 week ago' },
    ];
    this.activities.set(defaults);
    this.selectedActivityId.set(defaults[0].id);
  }

  // Toggle sidebar
  protected toggleSidebar(): void {
    this.sidebarExpanded.update((expanded) => !expanded);
  }

  protected onToggleTheme(): void {
    toggleTheme();
  }

  // Close sidebar on mobile when clicking outside
  @HostListener('document:click', ['$event'])
  onClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.sidebar') && !target.closest('.sidebar-toggle')) {
      if (window.innerWidth < 768) {
        this.sidebarExpanded.set(false);
      }
    }
  }
  // --- State ---
  protected readonly activities = signal<Activity[]>([]);

  protected readonly selectedActivityId = signal<string>('');

  protected readonly currentActivity = computed(() => {
    const activities = this.activities();
    const selectedId = this.selectedActivityId();
    if (activities.length === 0) {
      return null;
    }
    return activities.find((a) => a.id === selectedId) ?? activities[0];
  });

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

  protected onActivitySelectChange(event: Event): void {
    const selectElement = event.target as HTMLSelectElement | null;
    if (selectElement) {
      this.selectActivity(selectElement.value);
    }
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
    this.dialog
      .open(CreateActivityModal)
      .afterClosed()
      .subscribe((result: ActivityData) => {
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
      estimatedHoursPerWeek: 3,
    };

    this.dialog
      .open(EditActivityModal, { data: sample })
      .afterClosed()
      .subscribe((updated: ActivityData) => {
        if (updated) {
          console.log('Updated activity:', updated);
          // TODO: persist updated activity and update UI
        }
      });
  }

  protected openDeleteActivityModal(): void {
    const sample = { id: 'math', name: 'Study Math' };
    this.dialog
      .open(DeleteActivityModal, { data: sample })
      .afterClosed()
      .subscribe((confirmed: boolean) => {
        if (confirmed) {
          console.log('Delete confirmed for', sample);
          // TODO: remove from activities and call backend
        }
      });
  }


  // Format seconds as MM:SS for display in the circle.
  private formatTime(totalSeconds: number): string {
    const minutes = Math.floor(totalSeconds / 60)
      .toString()
      .padStart(2, '0');
    const seconds = (totalSeconds % 60).toString().padStart(2, '0');
    return `${minutes}:${seconds}`;
  }

  // Called when the timer reaches zero.
  private onTimerComplete(): void {
    // Play a completion sound.
    this.playCompletionSound();

    // Show visual alert.
    this.showCompletionAlert.set(true);

    // Hide alert after 5 seconds.
    setTimeout(() => {
      this.showCompletionAlert.set(false);
    }, 5000);
  }

  // Play a simple beep sound when timer completes.
  private playCompletionSound(): void {
    try {
      // Create a simple audio context beep.
      const extendedWindow = window as Window & { webkitAudioContext?: typeof AudioContext };
      const AudioContextCtor = window.AudioContext ?? extendedWindow.webkitAudioContext;
      if (!AudioContextCtor) {
        console.warn('AudioContext is not supported in this browser.');
        return;
      }
      const audioContext = new AudioContextCtor();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      // Pleasant notification tone.
      oscillator.frequency.value = 800;
      oscillator.type = 'sine';

      // Fade out.
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 1);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 1);
    } catch (error) {
      console.warn('Unable to play completion sound:', error);
    }
  }

  // Dismiss the completion alert manually.
  protected dismissAlert(): void {
    this.showCompletionAlert.set(false);
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

  // Collapse sidebar when clicking main content area
  protected onMainContentClick(): void {
    if (this.sidebarExpanded()) {
      this.sidebarExpanded.set(false);
    }
  }

  // --- Profile Modal ---
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
