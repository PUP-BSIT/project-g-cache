// activities.ts
import { CommonModule } from '@angular/common';
import { Component, computed, signal, HostListener, inject, effect, OnInit } from '@angular/core';
import { RouterLink, RouterLinkActive, Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { FormsModule } from '@angular/forms';
import { toggleTheme } from '../../shared/theme';
import {
  CreateActivityModal,
  ActivityData,
} from '../../shared/components/create-activity-modal/create-activity-modal';
import { EditActivityModal } from '../../shared/components/edit-activity-modal/edit-activity-modal';
import { DeleteActivityModal } from '../../shared/components/delete-activity-modal/delete-activity-modal';
import { AddSessionModal, SessionData } from '../../shared/components/add-session-modal/add-session-modal';
import { EditSessionModal } from '../../shared/components/edit-session-modal/edit-session-modal';
import { Profile, ProfileData } from '../profile/profile';
import { Auth } from '../../core/services/auth';
import { ActivityService } from '../../core/services/activity.service';

export type Session = {
  id: string;
  focusTimeMinutes: number;
  breakTimeMinutes: number;
  note?: string;
  createdAt: string;
};

type Activity = {
  activityId: number;
  activityTitle: string;
  activityDescription: string;
  categoryId?: number;
  categoryName?: string;
  createdAt?: string;
  sessions?: Session[];
  colorTag: string; // Required: color theme for the activity
};

export type TimerMode = 'classic' | 'freestyle';

export type SessionState = {
  mode: TimerMode;
  focusMinutes: number;
  breakMinutes: number;
  cycles?: number;
  cyclesCompleted: number;
  isRunning: boolean;
  isPaused: boolean;
  currentPhase: 'focus' | 'break';
  timeRemaining: number;
  totalSessionTime: number;
};

@Component({
  selector: 'app-activities',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, FormsModule],
  templateUrl: './activities.html',
  styleUrl: './activities.scss',
})
export class ActivitiesPage implements OnInit {
  private dialog = inject(MatDialog);
  private router = inject(Router);
  private auth = inject(Auth);
  private activityService = inject(ActivityService);

  // Sidebar state
  protected sidebarExpanded = signal(true);

  // Timer states
  protected activeSession = signal<SessionState | null>(null);
  protected selectedActivityForTimer = signal<Activity | null>(null);
  protected timerInterval = signal<any>(null);

  // Toggle sidebar
  protected toggleSidebar(): void {
    this.sidebarExpanded.update((expanded: boolean) => !expanded);
  }

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

  onToggleTheme() {
    toggleTheme();
  }

  // --- State ---
  protected readonly selectedActivity = signal<Activity | null>(null);
  protected readonly activities = signal<Activity[]>([]);
  protected readonly isLoading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  ngOnInit() {
    this.loadActivities();
  }

  private loadActivities(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);
    
    this.activityService.getAllActivities().subscribe({
      next: (response: any) => {
        // Handle the API response format from the backend
        const activitiesList = response.activities || response || [];
        const mapped = activitiesList.map((activity: any) => ({
          activityId: activity.activityId || activity.id,
          activityTitle: activity.activityTitle || activity.name,
          activityDescription: activity.activityDescription || '',
          categoryId: activity.categoryId,
          categoryName: activity.categoryName || activity.category,
          createdAt: activity.createdAt || new Date().toISOString(),
          sessions: activity.sessions || [],
          colorTag: activity.colorTag || 'teal' // Default to teal if not provided
        }));
        this.activities.set(mapped);
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Error loading activities:', error);
        this.errorMessage.set('Failed to load activities. Please try again.');
        this.isLoading.set(false);
      }
    });
  }

  protected readonly searchQuery = signal('');
  protected readonly selectedCategory = signal<number | null>(null);

  // Get unique categories from activities
  protected readonly availableCategories = computed(() => {
    const categories = new Map<number, string>();
    this.activities().forEach((activity: Activity) => {
      if (activity.categoryId && activity.categoryName) {
        categories.set(activity.categoryId, activity.categoryName);
      }
    });
    return Array.from(categories.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  });

  protected readonly filteredActivities = computed(() => {
    let filtered = this.activities();
    
    // Filter by category
    const categoryId = this.selectedCategory();
    if (categoryId !== null) {
      filtered = filtered.filter((activity: Activity) => activity.categoryId === categoryId);
    }
    
    // Filter by search query
    const query = this.searchQuery().toLowerCase();
    if (query) {
      filtered = filtered.filter(
        (activity: Activity) =>
          activity.activityTitle.toLowerCase().includes(query) ||
          activity.activityDescription.toLowerCase().includes(query) ||
          (activity.categoryName && activity.categoryName.toLowerCase().includes(query))
      );
    }
    
    return filtered;
  });

  // --- Pagination ---
  protected readonly pageSize = signal(6); // items per page
  protected readonly currentPage = signal(1);

  protected readonly totalPages = computed(() => {
    const total = Math.ceil(this.filteredActivities().length / this.pageSize());
    return total || 0;
  });

  protected readonly pagesArray = computed(() => {
    const tp = this.totalPages();
    return Array.from({ length: tp }, (_, i) => i + 1);
  });

  // Paged activities (slice of filtered list)
  protected readonly pagedActivities = computed(() => {
    const page = Math.max(1, this.currentPage());
    const size = this.pageSize();
    const start = (page - 1) * size;
    return this.filteredActivities().slice(start, start + size);
  });

  // --- Actions ---
  protected onSearchInput(event: Event): void {
    const inputElement = event.target as HTMLInputElement;
    if (inputElement) {
      this.onSearchChange(inputElement.value);
    }
  }

  protected onSearchChange(query: string): void {
    this.searchQuery.set(query);
    // when searching, go back to page 1
    this.currentPage.set(1);
  }

  protected selectCategory(categoryId: number | null): void {
    this.selectedCategory.set(categoryId);
    // when filtering, go back to page 1
    this.currentPage.set(1);
  }

  protected setPage(n: number): void {
    const tp = this.totalPages();
    if (n < 1) n = 1;
    if (n > tp) n = tp;
    this.currentPage.set(n);
  }

  protected prevPage(): void {
    this.setPage(this.currentPage() - 1);
  }

  protected nextPage(): void {
    this.setPage(this.currentPage() + 1);
  }

  protected openCreateActivityModal(): void {
    this.dialog
      .open(CreateActivityModal)
      .afterClosed()
      .subscribe((result: ActivityData) => {
        if (result) {
          console.log('New activity data from modal:', result);
          
          // Create activity via API
          const createRequest = {
            name: result.name,
            icon: '📌', // Default icon, can be customized later
            category: result.category || 'General',
            colorTag: result.colorTag,
            estimatedHoursPerWeek: result.estimatedHoursPerWeek || 0
          };

          this.activityService.createActivity(createRequest).subscribe({
            next: (createdActivity: any) => {
              console.log('Activity created successfully:', createdActivity);
              
              // Map the response to our Activity type
              const newActivity: Activity = {
                activityId: createdActivity.activityId || createdActivity.id,
                activityTitle: createdActivity.activityTitle || createdActivity.name,
                activityDescription: createdActivity.activityDescription || '',
                categoryId: createdActivity.categoryId,
                categoryName: createdActivity.categoryName || createdActivity.category,
                colorTag: createdActivity.colorTag || result.colorTag,
                sessions: createdActivity.sessions || [],
                createdAt: createdActivity.createdAt || new Date().toISOString()
              };

              // Automatically redirect to timer page with the new activity
              this.initializeTimer(newActivity, 'classic', 25, 5, 4);
            },
            error: (error) => {
              console.error('Error creating activity:', error);
              this.errorMessage.set('Failed to create activity. Please try again.');
            }
          });
        }
      });
  }

  protected openEditActivityModal(activity: Activity): void {
    const data: ActivityData = {
      name: activity.activityTitle,
      category: activity.categoryName || '',
      colorTag: 'teal',
      estimatedHoursPerWeek: 1,
    };

    this.dialog
      .open(EditActivityModal, { data })
      .afterClosed()
      .subscribe((updated: ActivityData) => {
        if (updated) {
          console.log('Updated activity:', updated);
          this.loadActivities(); // Reload activities from API
        }
      });
  }

  protected openDeleteActivityModal(activity: Activity): void {
    const data = { id: activity.activityId, name: activity.activityTitle };
    this.dialog
      .open(DeleteActivityModal, { data })
      .afterClosed()
      .subscribe((confirmed: boolean) => {
        if (confirmed) {
          console.log('Delete confirmed for', activity.activityTitle);
          this.activityService.deleteActivity(activity.activityId.toString()).subscribe({
            next: () => {
              this.loadActivities(); // Reload activities from API
              // Clear selection if deleted activity was selected
              if (this.selectedActivity()?.activityId === activity.activityId) {
                this.selectedActivity.set(null);
              }
            },
            error: (error) => {
              console.error('Error deleting activity:', error);
              this.errorMessage.set('Failed to delete activity. Please try again.');
            }
          });
        }
      });
  }

  protected selectActivity(activity: Activity): void {
    this.selectedActivity.set(activity);
  }

  protected closeActivityView(): void {
    this.selectedActivity.set(null);
  }

  protected openAddSessionModal(activity: Activity): void {
    this.dialog
      .open(AddSessionModal)
      .afterClosed()
      .subscribe((result: SessionData) => {
        if (result) {
          console.log('New session created:', result);
          this.loadActivities(); // Reload activities from API
        }
      });
  }

  protected openEditSessionModal(activity: Activity, session: Session): void {
    const data: SessionData = {
      focusTimeMinutes: session.focusTimeMinutes,
      breakTimeMinutes: session.breakTimeMinutes,
      note: session.note,
    };

    this.dialog
      .open(EditSessionModal, { data: { session: data } })
      .afterClosed()
      .subscribe((updated: SessionData) => {
        if (updated) {
          console.log('Updated session:', updated);
          this.loadActivities(); // Reload activities from API
        }
      });
  }

  protected deleteSession(activity: Activity, session: Session): void {
    if (confirm(`Are you sure you want to delete this session?`)) {
      this.activityService.deleteSession(activity.activityId.toString(), session.id).subscribe({
        next: () => {
          this.loadActivities(); // Reload activities from API
        },
        error: (error) => {
          console.error('Error deleting session:', error);
          this.errorMessage.set('Failed to delete session. Please try again.');
        }
      });
    }
  }

  protected startSession(activity: Activity, session: Session): void {
    // Navigate to dashboard with activity and session info
    this.router.navigate(['/dashboard'], {
      queryParams: {
        activityId: activity.activityId,
        sessionId: session.id,
        focusTime: session.focusTimeMinutes,
        breakTime: session.breakTimeMinutes
      }
    });
  }

  // --- Timer Methods ---
  protected initializeTimer(activity: Activity, mode: TimerMode = 'classic', focusMinutes: number = 25, breakMinutes: number = 5, cycles: number = 4): void {
    this.selectedActivityForTimer.set(activity);
    
    const sessionState: SessionState = {
      mode,
      focusMinutes,
      breakMinutes,
      cycles: mode === 'classic' ? cycles : undefined,
      cyclesCompleted: 0,
      isRunning: false,
      isPaused: false,
      currentPhase: 'focus',
      timeRemaining: focusMinutes * 60, // in seconds
      totalSessionTime: mode === 'classic' ? (focusMinutes + breakMinutes) * cycles * 60 : 0
    };
    
    this.activeSession.set(sessionState);
  }

  protected getTimerDisplay(): string {
    const session = this.activeSession();
    if (!session) return '00:00';
    
    const minutes = Math.floor(session.timeRemaining / 60);
    const seconds = session.timeRemaining % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }

  protected getCycleDuration(): number {
    const session = this.activeSession();
    if (!session) return 0;
    return session.focusMinutes + session.breakMinutes;
  }

  protected getTotalSessionMinutes(): number {
    const session = this.activeSession();
    if (!session) return 0;
    
    if (session.mode === 'freestyle') {
      return 0; // Unlimited
    }
    
    return (session.focusMinutes + session.breakMinutes) * (session.cycles || 1);
  }

  protected startTimer(): void {
    const session = this.activeSession();
    if (!session) return;
    
    session.isRunning = true;
    session.isPaused = false;
    
    const interval = setInterval(() => {
      const current = this.activeSession();
      if (!current || !current.isRunning) {
        clearInterval(interval);
        return;
      }
      
      current.timeRemaining--;
      
      // Check if phase is complete
      if (current.timeRemaining <= 0) {
        this.completePhase();
      }
    }, 1000);
    
    this.timerInterval.set(interval);
    this.activeSession.set(session);
  }

  protected pauseTimer(): void {
    const session = this.activeSession();
    if (!session) return;
    
    session.isRunning = false;
    session.isPaused = true;
    
    const interval = this.timerInterval();
    if (interval) clearInterval(interval);
    
    this.activeSession.set(session);
  }

  protected resumeTimer(): void {
    this.startTimer();
  }

  protected resetCurrentPhase(): void {
    const session = this.activeSession();
    if (!session) return;
    
    session.isRunning = false;
    session.isPaused = false;
    
    // Reset time for current phase
    if (session.currentPhase === 'focus') {
      session.timeRemaining = session.focusMinutes * 60;
    } else {
      session.timeRemaining = session.breakMinutes * 60;
    }
    
    const interval = this.timerInterval();
    if (interval) clearInterval(interval);
    
    this.activeSession.set(session);
  }

  protected stopCurrentCycle(): void {
    const session = this.activeSession();
    if (!session) return;
    
    session.isRunning = false;
    session.isPaused = false;
    session.currentPhase = 'focus';
    session.timeRemaining = session.focusMinutes * 60;
    
    const interval = this.timerInterval();
    if (interval) clearInterval(interval);
    
    this.activeSession.set(session);
  }

  protected cancelSession(): void {
    const interval = this.timerInterval();
    if (interval) clearInterval(interval);
    
    this.activeSession.set(null);
    this.selectedActivityForTimer.set(null);
  }

  private completePhase(): void {
    const session = this.activeSession();
    if (!session) return;
    
    if (session.currentPhase === 'focus') {
      // Switch to break
      session.currentPhase = 'break';
      session.timeRemaining = session.breakMinutes * 60;
    } else {
      // Switch to focus and increment cycle
      session.cyclesCompleted++;
      
      // Check if session is complete
      if (session.mode === 'classic' && session.cycles && session.cyclesCompleted >= session.cycles) {
        this.finishSession();
        return;
      }
      
      // Restart focus phase
      session.currentPhase = 'focus';
      session.timeRemaining = session.focusMinutes * 60;
    }
    
    session.isRunning = true;
    this.activeSession.set(session);
  }

  private finishSession(): void {
    const interval = this.timerInterval();
    if (interval) clearInterval(interval);
    
    this.activeSession.set(null);
    this.selectedActivityForTimer.set(null);
  }

  protected updateFocusTime(minutes: number): void {
    const session = this.activeSession();
    if (!session || session.isRunning || session.isPaused) return;
    
    session.focusMinutes = Math.max(1, minutes);
    if (session.currentPhase === 'focus') {
      session.timeRemaining = session.focusMinutes * 60;
    }
    this.activeSession.set(session);
  }

  protected updateBreakTime(minutes: number): void {
    const session = this.activeSession();
    if (!session || session.isRunning || session.isPaused) return;
    
    session.breakMinutes = Math.max(1, minutes);
    if (session.currentPhase === 'break') {
      session.timeRemaining = session.breakMinutes * 60;
    }
    this.activeSession.set(session);
  }

  protected updateCycles(cycles: number): void {
    const session = this.activeSession();
    if (!session || session.isRunning || session.isPaused || session.mode !== 'classic') return;
    
    session.cycles = Math.max(1, cycles);
    session.totalSessionTime = (session.focusMinutes + session.breakMinutes) * session.cycles * 60;
    this.activeSession.set(session);
  }

  protected switchMode(mode: TimerMode): void {
    const session = this.activeSession();
    if (!session || session.isRunning || session.isPaused) return;
    
    session.mode = mode;
    
    if (mode === 'classic') {
      session.cycles = 4;
      session.totalSessionTime = (session.focusMinutes + session.breakMinutes) * 4 * 60;
    } else {
      session.cycles = undefined;
      session.totalSessionTime = 0;
    }
    
    this.activeSession.set(session);
  }

  protected formatDate(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins} min${diffMins !== 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hr${diffHours !== 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
    
    return date.toLocaleDateString();
  }

  private getActivityIcon(title: string): string {
    const icons: { [key: string]: string } = {
      'math': '📘',
      'angular': '{}',
      'design': '🎨',
      'kotlin': '</>',
      'document': '📄',
      'javascript': '</>',
      'study': '📚',
      'work': '💼',
      'programming': '💻',
      'dev': '👨‍💻',
    };
    
    const lowerTitle = title.toLowerCase();
    for (const [key, icon] of Object.entries(icons)) {
      if (lowerTitle.includes(key)) {
        return icon;
      }
    }
    return '📌'; // default icon
  }

  protected getActivityIconForCard(activity: Activity): string {
    return this.getActivityIcon(activity.activityTitle);
  }

  protected getColorClass(colorTag: string): string {
    // Map color tags to CSS classes
    const colorMap: { [key: string]: string } = {
      'red': 'color-red',
      'orange': 'color-orange',
      'yellow': 'color-yellow',
      'green': 'color-green',
      'blue': 'color-blue',
      'purple': 'color-purple',
      'teal': 'color-teal'
    };
    
    return colorMap[colorTag] || 'color-teal';
  }

  protected getColorHex(colorTag: string): string {
    // Map color tags to hex values for timer theming
    const colorHexMap: { [key: string]: string } = {
      'red': '#EF4444',
      'orange': '#F97316',
      'yellow': '#FBBF24',
      'green': '#10B981',
      'blue': '#3B82F6',
      'purple': '#8B5CF6',
      'teal': '#5FA9A4'
    };
    
    return colorHexMap[colorTag] || '#5FA9A4';
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
          // TODO(Delumen, Ivan): persist profile changes to backend
        }
      });
  }
}
