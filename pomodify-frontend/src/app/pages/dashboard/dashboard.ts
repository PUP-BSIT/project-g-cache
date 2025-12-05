import { CommonModule } from '@angular/common';
import { Component, computed, signal, HostListener, inject, effect, OnInit } from '@angular/core';
import { RouterLink, RouterLinkActive, Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { toggleTheme } from '../../shared/theme';
import {
  CreateActivityModal,
  ActivityData as CreateActivityModalData,
} from '../../shared/components/create-activity-modal/create-activity-modal';
import { EditActivityModal } from '../../shared/components/edit-activity-modal/edit-activity-modal';
import { DeleteActivityModal } from '../../shared/components/delete-activity-modal/delete-activity-modal';
import { AddSessionModal, SessionData } from '../../shared/components/add-session-modal/add-session-modal';
import { EditSessionModal } from '../../shared/components/edit-session-modal/edit-session-modal';
import { Profile, ProfileData } from '../profile/profile';
import { Auth } from '../../core/services/auth';
import { IconMapper } from '../../core/services/icon-mapper';
import { DashboardService } from '../../core/services/dashboard.service';
import { ActivityService, ActivityResponse, ActivityData as ActivityApiData, CreateActivityRequest, UpdateActivityRequest } from '../../core/services/activity.service';
import { SessionService } from '../../core/services/session.service';

// API Response Types
export type DashboardMetrics = {
  totalCompletedSessions: number;
  totalFocusTime: number;
  weeklyFocusDistribution: Record<string, number>;
  recentActivities: RecentActivity[];
};

export type RecentActivity = {
  activityId: number;
  activityTitle: string;
  lastSession: {
    sessionId: number;
    startTime: string;
    endTime: string;
    status: string;
  };
};

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
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    RouterLinkActive,
  ],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.scss'],
})
export class Dashboard implements OnInit {
  private dialog = inject(MatDialog);
  private router = inject(Router);
  private auth = inject(Auth);
  private iconMapper = inject(IconMapper);
  private dashboardService = inject(DashboardService);
  private activityService = inject(ActivityService);
  private sessionService = inject(SessionService);

  protected sidebarExpanded = signal(true);

  protected dashboardMetrics = signal<DashboardMetrics | null>(null);
  protected isLoadingDashboard = signal(false);
  protected dashboardError = signal<string | null>(null);

  protected toggleSidebar(): void {
    this.sidebarExpanded.update((expanded: boolean) => !expanded);
  }

  protected onToggleTheme(): void {
    toggleTheme();
  }

  @HostListener('document:click', ['$event'])
  onClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.sidebar') && !target.closest('.sidebar-toggle')) {
      if (window.innerWidth < 768) {
        this.sidebarExpanded.set(false);
      }
    }
  }

  ngOnInit(): void {
    this.loadDashboardMetrics();
    this.loadActivities();
  }

  private loadDashboardMetrics(): void {
    this.isLoadingDashboard.set(true);
    this.dashboardError.set(null);

    const timezone = this.dashboardService.getUserTimezone();

    this.dashboardService.getDashboard(timezone).subscribe({
      next: (data) => {
        this.dashboardMetrics.set(data);
        this.isLoadingDashboard.set(false);
      },
      error: (err) => {
        console.error('Dashboard metrics error:', err);
        this.dashboardError.set('Failed to load dashboard metrics. Please refresh the page.');
        this.isLoadingDashboard.set(false);
      }
    });
  }

  private loadActivities(): void {
    this.isLoadingActivities.set(true);
    this.activitiesError.set(null);

    this.activityService.getAllActivities().subscribe({
      next: (resp: ActivityResponse) => {
        const list = Array.isArray((resp as any).activities) ? (resp as any).activities : [];
        const mapped = list.map((a: ActivityApiData) => this.mapActivityDataToView(a));
        this.activities.set(mapped);
        this.isLoadingActivities.set(false);
      },
      error: (err) => {
        console.error('Activities loading error:', err);
        this.activitiesError.set('Failed to load activities.');
        this.isLoadingActivities.set(false);
        this.activities.set([]);
      }
    });
  }

  protected readonly selectedActivity = signal<Activity | null>(null);
  protected readonly activities = signal<Activity[]>([]);
  protected readonly isLoadingActivities = signal(false);
  protected readonly activitiesError = signal<string | null>(null);
  protected readonly searchQuery = signal('');
  protected readonly selectedCategory = signal<string | null>(null);
  protected readonly currentPage = signal(1);
  protected readonly itemsPerPage = signal(6);
  protected readonly categoryDropdownOpen = signal(false);

  constructor() {
    effect(() => {
      const tp = this.totalPages();
      if (tp === 0) {
        this.currentPage.set(1);
      } else if (this.currentPage() > tp) {
        this.currentPage.set(tp);
      }
    });
  }

  protected readonly filteredActivities = computed(() => {
    const query = this.searchQuery().toLowerCase();
    const category = this.selectedCategory();
    const allActivities = this.activities();

    return allActivities.filter((activity) => {
      const matchesQuery = activity.name.toLowerCase().includes(query);
      let matchesCategory = !category;
      if (category === 'Uncategorized') {
        matchesCategory = !activity.category || activity.category === '';
      } else if (category) {
        matchesCategory = activity.category === category;
      }
      
      return matchesQuery && matchesCategory;
    });
  });

  protected readonly totalPages = computed(() => {
    return Math.ceil(this.filteredActivities().length / this.itemsPerPage());
  });

  protected readonly paginatedActivities = computed(() => {
    const items = this.filteredActivities();
    const perPage = this.itemsPerPage();
    const page = this.currentPage();
    const start = (page - 1) * perPage;
    return items.slice(start, start + perPage);
  });

  protected readonly categories = computed(() => {
    const cats = new Set(this.activities().map((a) => a.category));
    return Array.from(cats).sort();
  });

  protected readonly totalActivities = computed(() => this.activities().length);

  protected readonly thisWeekHours = computed(() => {
    return this.activities()
      .reduce((sum, activity) => sum + (activity.estimatedHoursPerWeek || 0), 0)
      .toFixed(1);
  });

  protected readonly totalCompletedSessions = computed(() => {
    return this.dashboardMetrics()?.totalCompletedSessions || 0;
  });

  protected readonly totalFocusTimeHours = computed(() => {
    const seconds = this.dashboardMetrics()?.totalFocusTime || 0;
    const hours = seconds / 3600;
    return hours.toFixed(1);
  });

  protected readonly weeklyDistributionDays = computed(() => {
    const distribution = this.dashboardMetrics()?.weeklyFocusDistribution;
    if (!distribution) return [];
    
    const days = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];
    return days.map(day => ({
      day: day.substring(0, 3),
      seconds: distribution[day] || 0,
      hours: ((distribution[day] || 0) / 3600).toFixed(1),
      percentage: this.calculateDayPercentage(distribution, day)
    }));
  });

  private calculateDayPercentage(distribution: Record<string, number>, day: string): number {
    const total = Object.values(distribution).reduce((sum, val) => sum + val, 0);
    if (total === 0) return 0;
    return Math.round(((distribution[day] || 0) / total) * 100);
  }

  protected readonly recentActivities = computed(() => {
    return this.dashboardMetrics()?.recentActivities || [];
  });

  protected selectActivity(activity: Activity): void {
    this.selectedActivity.set(activity);
  }

  protected openCreateActivityModal(): void {
    this.dialog
      .open(CreateActivityModal)
      .afterClosed()
      .subscribe((result: CreateActivityModalData) => {
        if (result) {
          const req: CreateActivityRequest = {
            activityTitle: result.name,
            activityDescription: '',
            categoryId: undefined,
          };
          this.activityService.createActivity(req).subscribe({
            next: (created) => {
              const mapped = this.mapActivityDataToView(created);
              const isValid = mapped && mapped.id && mapped.name;
              if (isValid) {
                this.activities.update((acts) => [...acts, mapped]);
                this.selectActivity(mapped);
              } else {
                // Fallback: backend didn't return the created item; refresh list
                this.loadActivities();
              }
            },
            error: (err) => {
              console.error('Error creating activity:', err);
              alert('Failed to create activity. Please try again.');
            }
          });
        }
      });
  }

  protected openEditActivityModal(activity: Activity): void {
    const sample: CreateActivityModalData = {
      name: activity.name,
      category: activity.category,
      colorTag: activity.colorTag,
      estimatedHoursPerWeek: activity.estimatedHoursPerWeek,
    };

    this.dialog
      .open(EditActivityModal, { data: sample })
      .afterClosed()
      .subscribe((updated: CreateActivityModalData) => {
        if (updated) {
          const req: UpdateActivityRequest = {
            newActivityTitle: updated.name,
            newActivityDescription: '',
            newCategoryId: undefined,
          };
          this.activityService.updateActivity(Number(activity.id), req).subscribe({
            next: (updatedActivity) => {
              const mapped = this.mapActivityDataToView(updatedActivity);
              this.activities.update((acts) =>
                acts.map((a) => a.id === activity.id ? mapped : a)
              );
              if (this.selectedActivity()?.id === activity.id) {
                this.selectedActivity.set(mapped);
              }
            },
            error: (err) => {
              console.error('Error updating activity:', err);
              alert('Failed to update activity. Please try again.');
            }
          });
        }
      });
  }

  protected openDeleteActivityModal(activity: Activity): void {
    this.dialog
      .open(DeleteActivityModal, { data: { id: activity.id, name: activity.name } })
      .afterClosed()
      .subscribe((confirmed: boolean) => {
        if (confirmed) {
          this.activityService.deleteActivity(Number(activity.id)).subscribe({
            next: () => {
              this.activities.update((acts) => acts.filter((a) => a.id !== activity.id));
              if (this.selectedActivity()?.id === activity.id) {
                this.selectedActivity.set(null);
              }
            },
            error: (err) => {
              console.error('Error deleting activity:', err);
              alert('Failed to delete activity. Please try again.');
            }
          });
        }
      });
  }

  protected addSession(activity: Activity): void {
    this.dialog
      .open(AddSessionModal)
      .afterClosed()
      .subscribe((result: SessionData) => {
        if (result) {
          this.sessionService.createSession(Number(activity.id), {
            sessionType: 'POMODORO',
            focusTimeInMinutes: result.focusTimeMinutes,
            breakTimeInMinutes: result.breakTimeMinutes,
            cycles: 1,
            note: result.note,
          }).subscribe({
            next: (newSession) => {
              this.activities.update((acts) =>
                acts.map((a) =>
                  a.id === activity.id
                    ? { ...a, sessions: [...a.sessions, newSession as any] }
                    : a
                )
              );
              if (this.selectedActivity()?.id === activity.id) {
                this.selectedActivity.set(
                  this.activities().find((a) => a.id === activity.id) || null
                );
              }
            },
            error: (err) => {
              console.error('Error adding session:', err);
              alert('Failed to add session. Please try again.');
            }
          });
        }
      });
  }

  protected editSession(activity: Activity, session: Session): void {
    const sessionData: SessionData = {
      focusTimeMinutes: session.focusTimeMinutes,
      breakTimeMinutes: session.breakTimeMinutes,
      note: session.note || '',
    };

    this.dialog
      .open(EditSessionModal, { data: sessionData })
      .afterClosed()
      .subscribe((result: SessionData) => {
        if (result) {
          this.sessionService.updateNote(Number(activity.id), Number(session.id), result.note || '').subscribe({
            next: () => {
              this.activities.update((acts) =>
                acts.map((a) =>
                  a.id === activity.id
                    ? {
                        ...a,
                        sessions: a.sessions.map((s) =>
                          s.id === session.id ? { ...s, note: result.note } : s
                        ),
                      }
                    : a
                )
              );
              if (this.selectedActivity()?.id === activity.id) {
                this.selectedActivity.set(
                  this.activities().find((a) => a.id === activity.id) || null
                );
              }
            },
            error: (err) => {
              console.error('Error updating session:', err);
              alert('Failed to update session. Please try again.');
            }
          });
        }
      });
  }

  protected deleteSession(activity: Activity, sessionId: string): void {
    this.sessionService.deleteSession(Number(activity.id), Number(sessionId)).subscribe({
      next: () => {
        this.activities.update((acts) =>
          acts.map((a) =>
            a.id === activity.id
              ? { ...a, sessions: a.sessions.filter((s) => s.id !== sessionId) }
              : a
          )
        );
        if (this.selectedActivity()?.id === activity.id) {
          this.selectedActivity.set(
            this.activities().find((a) => a.id === activity.id) || null
          );
        }
      },
      error: (err) => {
        console.error('Error deleting session:', err);
        alert('Failed to delete session. Please try again.');
      }
    });
  }

  private mapActivityDataToView(a: ActivityApiData): Activity {
    const title = (a && (a as any).activityTitle) ? (a as any).activityTitle : 'Activity';
    let iconClass = 'fa-solid fa-circle';
    try {
      iconClass = this.iconMapper.getIconClass((title || ''), 'General');
    } catch {
      iconClass = 'fa-solid fa-circle';
    }
    return {
      id: String((a as any).activityId || cryptoRandomId()),
      name: title,
      icon: iconClass,
      category: (a as any).categoryName || '',
      colorTag: (a as any).colorTag || '#888888',
      estimatedHoursPerWeek: 0,
      lastAccessed: new Date().toISOString(),
      sessions: [],
    };
  }

  protected toggleCategory(category: string): void {
    const current = this.selectedCategory();
    this.selectedCategory.set(current === category ? null : category);
    this.currentPage.set(1);
  }

  protected updateSearchQuery(query: string): void {
    this.searchQuery.set(query);
    this.currentPage.set(1);
  }

  protected goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
    }
  }

  protected getFullIconClasses(activity: Activity): string {
    return activity.icon || 'fa-solid fa-circle';
  }

  protected getActivityCompletionPercentage(activity: Activity): number {
    if (!activity.estimatedHoursPerWeek || activity.estimatedHoursPerWeek <= 0) {
      return 0;
    }
    const totalMinutes = activity.sessions.reduce((sum, session) => sum + session.focusTimeMinutes, 0);
    const totalHours = totalMinutes / 60;
    const percentage = Math.min((totalHours / activity.estimatedHoursPerWeek) * 100, 100);
    return Math.round(percentage);
  }

  protected getLastAccessedText(activity: Activity): string {
    const now = new Date();
    const lastAccessed = new Date(activity.lastAccessed);
    const diffMs = now.getTime() - lastAccessed.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return '1 day ago';
    return `${diffDays} days ago`;
  }

  protected toggleCategoryDropdown(): void {
    this.categoryDropdownOpen.update((open) => !open);
  }

  protected getActivitiesByCategory(category: string): Activity[] {
    return this.activities().filter((activity) => activity.category === category);
  }

  protected getUncategorizedActivities(): Activity[] {
    return this.activities().filter((activity) => !activity.category || activity.category === '');
  }

  protected hasUncategorizedActivities(): boolean {
    return this.getUncategorizedActivities().length > 0;
  }

  protected onNavIconClick(event: MouseEvent, route: string): void {
    if (!this.sidebarExpanded()) {
      this.sidebarExpanded.set(true);
    }
    if (this.router.url === route) {
      event.preventDefault();
    }
  }

  protected onMainContentClick(): void {
    if (this.sidebarExpanded()) {
      this.sidebarExpanded.set(false);
    }
  }

  protected onLogout(): void {
    console.log('[Dashboard] Logout initiated');
    this.auth.logout()
      .then(() => {
        console.log('[Dashboard] Logout completed');
      })
      .catch((error) => {
        console.error('[Dashboard] Logout error:', error);
        // Error is already handled in auth service
      });
  }

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
        }
      });
  }

  protected formatSessionTime(startTime: string, endTime: string): string {
    try {
      const start = new Date(startTime);
      const end = new Date(endTime);
      const durationMs = end.getTime() - start.getTime();
      const durationMins = Math.round(durationMs / 60000);
      return `${durationMins} min`;
    } catch {
      return 'N/A';
    }
  }

  protected getRelativeTime(timestamp: string): string {
    const now = new Date();
    const date = new Date(timestamp);
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return '1 day ago';
    return `${diffDays} days ago`;
  }
}

function cryptoRandomId(): string {
  try {
    // Use Web Crypto if available
    const arr = new Uint32Array(1);
    (window.crypto || (window as any).msCrypto).getRandomValues(arr);
    return String(arr[0]);
  } catch {
    return String(Date.now());
  }
}

