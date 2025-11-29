// activities.ts
import { CommonModule } from '@angular/common';
import { Component, computed, signal, HostListener, inject, effect } from '@angular/core';
import { RouterLink, RouterLinkActive, Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
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

export type Session = {
  id: string;
  focusTimeMinutes: number;
  breakTimeMinutes: number;
  note?: string;
  createdAt: string;
};

type Activity = {
  id: string;
  name: string;
  icon: string;
  category: string;
  colorTag: string;
  estimatedHoursPerWeek: number;
  lastAccessed: string;
  sessions: Session[];
};

@Component({
  selector: 'app-activities',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './activities.html',
  styleUrl: './activities.scss',
})
export class ActivitiesPage {
  private dialog = inject(MatDialog);
  private router = inject(Router);
  private auth = inject(Auth);
  private readonly STORAGE_KEY = 'pomodify-activities';

  // Sidebar state
  protected sidebarExpanded = signal(true);

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

  constructor() {
    // Load initial activities immediately so the first render has data
    this.loadActivitiesFromStorage();

    // Save to localStorage whenever activities change
    effect(() => {
      const activities = this.activities();
      this.saveActivitiesToStorage(activities);
    });

    // clamp currentPage if totalPages decreases
    effect(() => {
      const tp = this.totalPages();
      if (tp === 0) {
        this.currentPage.set(1);
      } else if (this.currentPage() > tp) {
        this.currentPage.set(tp);
      }
    });
  }

  private loadActivitiesFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        this.activities.set(parsed);
      } else {
        // Initialize with default activities if nothing stored
        this.activities.set([
          {
            id: 'math',
            name: 'Study Math',
            icon: '📘',
            category: 'Study',
            colorTag: 'teal',
            estimatedHoursPerWeek: 5,
            lastAccessed: '1 hr ago',
            sessions: [],
          },
          {
            id: 'angular',
            name: 'Learn Angular',
            icon: '{}',
            category: 'Programming',
            colorTag: 'blue',
            estimatedHoursPerWeek: 8,
            lastAccessed: '2 days ago',
            sessions: [],
          },
          {
            id: 'design',
            name: 'Design Prototype',
            icon: '🎨',
            category: 'Design',
            colorTag: 'purple',
            estimatedHoursPerWeek: 6,
            lastAccessed: '3 days ago',
            sessions: [],
          },
          {
            id: 'kotlin',
            name: 'Learn Kotlin',
            icon: '</>',
            category: 'Programming',
            colorTag: 'orange',
            estimatedHoursPerWeek: 4,
            lastAccessed: '1 week ago',
            sessions: [],
          },
          {
            id: 'document',
            name: 'Learn Document',
            icon: '📄',
            category: 'Study',
            colorTag: 'green',
            estimatedHoursPerWeek: 3,
            lastAccessed: '5 days ago',
            sessions: [],
          },
          {
            id: 'javascript',
            name: 'Learn JavaScript',
            icon: '</>',
            category: 'Programming',
            colorTag: 'yellow',
            estimatedHoursPerWeek: 7,
            lastAccessed: '4 days ago',
            sessions: [],
          },
        ]);
      }
    } catch (error) {
      console.error('Error loading activities from storage:', error);
      // Fallback to default activities
      this.activities.set([]);
    }
  }

  private saveActivitiesToStorage(activities: Activity[]): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(activities));
    } catch (error) {
      console.error('Error saving activities to storage:', error);
    }
  }

  protected readonly searchQuery = signal('');
  protected readonly selectedCategory = signal<string | null>(null);

  // Get unique categories from activities
  protected readonly availableCategories = computed(() => {
    const categories = new Set<string>();
    this.activities().forEach((activity: Activity) => {
      if (activity.category) {
        categories.add(activity.category);
      }
    });
    return Array.from(categories).sort();
  });

  protected readonly filteredActivities = computed(() => {
    let filtered = this.activities();
    
    // Filter by category
    const category = this.selectedCategory();
    if (category) {
      filtered = filtered.filter((activity: Activity) => activity.category === category);
    }
    
    // Filter by search query
    const query = this.searchQuery().toLowerCase();
    if (query) {
      filtered = filtered.filter(
        (activity: Activity) =>
          activity.name.toLowerCase().includes(query) ||
          activity.category.toLowerCase().includes(query)
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

  protected selectCategory(category: string | null): void {
    this.selectedCategory.set(category);
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
          console.log('New activity created:', result);
          const newActivity: Activity = {
            id: this.generateId(),
            name: result.name,
            icon: '\ud83d\udcdd',
            category: result.category || 'General',
            colorTag: result.colorTag || 'teal',
            estimatedHoursPerWeek: result.estimatedHoursPerWeek || 1,
            lastAccessed: 'just now',
            sessions: [],
          };
          this.activities.update((activities: Activity[]) => [newActivity, ...activities]);
          // show the newly created activity on first page
          this.currentPage.set(1);
        }
      });
  }

  protected openEditActivityModal(activity: Activity): void {
    const data: ActivityData = {
      name: activity.name,
      category: activity.category,
      colorTag: activity.colorTag,
      estimatedHoursPerWeek: activity.estimatedHoursPerWeek,
    };

    this.dialog
      .open(EditActivityModal, { data })
      .afterClosed()
      .subscribe((updated: ActivityData) => {
        if (updated) {
          console.log('Updated activity:', updated);
          this.activities.update((activities: Activity[]) =>
            activities.map((existingActivity: Activity) =>
              existingActivity.id === activity.id ? { ...existingActivity, ...updated } : existingActivity
            )
          );
        }
      });
  }

  protected openDeleteActivityModal(activity: Activity): void {
    const data = { id: activity.id, name: activity.name };
    this.dialog
      .open(DeleteActivityModal, { data })
      .afterClosed()
      .subscribe((confirmed: boolean) => {
        if (confirmed) {
          console.log('Delete confirmed for', activity.name);
          this.activities.update((activities: Activity[]) =>
            activities.filter((existingActivity: Activity) => existingActivity.id !== activity.id)
          );
          // Clear selection if deleted activity was selected
          if (this.selectedActivity()?.id === activity.id) {
            this.selectedActivity.set(null);
          }
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
          const newSession: Session = {
            id: this.generateSessionId(),
            focusTimeMinutes: result.focusTimeMinutes,
            breakTimeMinutes: result.breakTimeMinutes,
            note: result.note,
            createdAt: new Date().toISOString(),
          };
          this.activities.update((activities: Activity[]) =>
            activities.map((existingActivity: Activity) =>
              existingActivity.id === activity.id
                ? { ...existingActivity, sessions: [newSession, ...existingActivity.sessions] }
                : existingActivity
            )
          );
          // Update selected activity if it's the one we just added to
          if (this.selectedActivity()?.id === activity.id) {
            const updated = this.activities().find((activityItem: Activity) => activityItem.id === activity.id);
            if (updated) {
              this.selectedActivity.set(updated);
            }
          }
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
          this.activities.update((activities: Activity[]) =>
            activities.map((existingActivity: Activity) =>
              existingActivity.id === activity.id
                ? {
                    ...existingActivity,
                    sessions: existingActivity.sessions.map((existingSession: Session) =>
                      existingSession.id === session.id
                        ? { ...existingSession, ...updated }
                        : existingSession
                    ),
                  }
                : existingActivity
            )
          );
          // Update selected activity if it's the one we just edited
          if (this.selectedActivity()?.id === activity.id) {
            const updatedActivity = this.activities().find((activityItem: Activity) => activityItem.id === activity.id);
            if (updatedActivity) {
              this.selectedActivity.set(updatedActivity);
            }
          }
        }
      });
  }

  protected deleteSession(activity: Activity, session: Session): void {
    if (confirm(`Are you sure you want to delete this session?`)) {
      this.activities.update((activities: Activity[]) =>
        activities.map((existingActivity: Activity) =>
          existingActivity.id === activity.id
            ? {
                ...existingActivity,
                sessions: existingActivity.sessions.filter(
                  (existingSession: Session) => existingSession.id !== session.id
                ),
              }
            : existingActivity
        )
      );
      // Update selected activity if it's the one we just deleted from
      if (this.selectedActivity()?.id === activity.id) {
        const updated = this.activities().find((activityItem: Activity) => activityItem.id === activity.id);
        if (updated) {
          this.selectedActivity.set(updated);
        }
      }
    }
  }

  protected startSession(activity: Activity, session: Session): void {
    // Navigate to dashboard with activity and session info
    this.router.navigate(['/dashboard'], {
      queryParams: {
        activityId: activity.id,
        sessionId: session.id,
        focusTime: session.focusTimeMinutes,
        breakTime: session.breakTimeMinutes
      }
    });
  }

  private generateSessionId(): string {
    return 'session-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
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

  protected getColorClass(colorTag: string): string {
    return `color-${colorTag}`;
  }

  private generateId(): string {
    return 'activity-' + Date.now();
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
