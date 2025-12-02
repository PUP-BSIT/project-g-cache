/**
 * Dashboard Component
 * Displays activity list, search, filtering, and management
 */
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
import { IconMapper } from '../../core/services/icon-mapper';

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
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.scss'],
})
export class Dashboard {
  private dialog = inject(MatDialog);
  private router = inject(Router);
  private auth = inject(Auth);
  private iconMapper = inject(IconMapper);
  private readonly STORAGE_KEY = 'pomodify-activities';

  // Sidebar state
  protected sidebarExpanded = signal(true);

  // Toggle sidebar
  protected toggleSidebar(): void {
    this.sidebarExpanded.update((expanded: boolean) => !expanded);
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
  protected readonly selectedActivity = signal<Activity | null>(null);
  protected readonly activities = signal<Activity[]>([]);
  protected readonly searchQuery = signal('');
  protected readonly selectedCategory = signal<string | null>(null);
  protected readonly currentPage = signal(1);
  protected readonly itemsPerPage = signal(6);
  protected readonly currentStreak = signal(0);
  protected readonly categoryDropdownOpen = signal(false);

  constructor() {
    this.loadActivitiesFromStorage();

    effect(() => {
      const activities = this.activities();
      this.saveActivitiesToStorage(activities);
    });

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
        const parsed = JSON.parse(stored) as Activity[];
        this.activities.set(parsed);
      }
    } catch (error) {
      console.error('Error loading activities from storage:', error);
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

  protected readonly filteredActivities = computed(() => {
    const query = this.searchQuery().toLowerCase();
    const category = this.selectedCategory();
    const allActivities = this.activities();

    return allActivities.filter((activity) => {
      const matchesQuery = activity.name.toLowerCase().includes(query);
      
      // Handle category filtering including Uncategorized
      let matchesCategory = !category; // If no category selected, show all
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

  // --- Actions ---
  protected selectActivity(activity: Activity): void {
    this.selectedActivity.set(activity);
  }

  protected openCreateActivityModal(): void {
    this.dialog
      .open(CreateActivityModal)
      .afterClosed()
      .subscribe((result: ActivityData) => {
        if (result) {
          const newActivity: Activity = {
            id: Date.now().toString(),
            name: result.name,
            category: result.category || 'General',
            colorTag: result.colorTag,
            estimatedHoursPerWeek: result.estimatedHoursPerWeek || 0,
            icon: this.iconMapper.getIconClass(result.name, result.category || 'General'),
            lastAccessed: new Date().toISOString(),
            sessions: [],
          };
          this.activities.update((acts) => [...acts, newActivity]);
          this.selectActivity(newActivity);
        }
      });
  }

  protected openEditActivityModal(activity: Activity): void {
    const sample: ActivityData = {
      name: activity.name,
      category: activity.category,
      colorTag: activity.colorTag,
      estimatedHoursPerWeek: activity.estimatedHoursPerWeek,
    };

    this.dialog
      .open(EditActivityModal, { data: sample })
      .afterClosed()
      .subscribe((updated: ActivityData) => {
        if (updated) {
          this.activities.update((acts) =>
            acts.map((a) =>
              a.id === activity.id
                ? {
                    ...a,
                    name: updated.name,
                    category: updated.category || 'General',
                    colorTag: updated.colorTag,
                    estimatedHoursPerWeek: updated.estimatedHoursPerWeek || 0,
                    icon: this.iconMapper.getIconClass(
                      updated.name,
                      updated.category || 'General'
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
        }
      });
  }

  protected openDeleteActivityModal(activity: Activity): void {
    this.dialog
      .open(DeleteActivityModal, { data: { id: activity.id, name: activity.name } })
      .afterClosed()
      .subscribe((confirmed: boolean) => {
        if (confirmed) {
          this.activities.update((acts) => acts.filter((a) => a.id !== activity.id));
          if (this.selectedActivity()?.id === activity.id) {
            this.selectedActivity.set(null);
          }
        }
      });
  }

  protected addSession(activity: Activity): void {
    this.dialog
      .open(AddSessionModal)
      .afterClosed()
      .subscribe((result: SessionData) => {
        if (result) {
          const newSession: Session = {
            id: Date.now().toString(),
            focusTimeMinutes: result.focusTimeMinutes,
            breakTimeMinutes: result.breakTimeMinutes,
            note: result.note,
            createdAt: new Date().toISOString(),
          };
          this.activities.update((acts) =>
            acts.map((a) =>
              a.id === activity.id
                ? { ...a, sessions: [...a.sessions, newSession] }
                : a
            )
          );
          if (this.selectedActivity()?.id === activity.id) {
            this.selectedActivity.set(
              this.activities().find((a) => a.id === activity.id) || null
            );
          }
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
          this.activities.update((acts) =>
            acts.map((a) =>
              a.id === activity.id
                ? {
                    ...a,
                    sessions: a.sessions.map((s) =>
                      s.id === session.id
                        ? {
                            ...s,
                            focusTimeMinutes: result.focusTimeMinutes,
                            breakTimeMinutes: result.breakTimeMinutes,
                            note: result.note,
                          }
                        : s
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
        }
      });
  }

  protected deleteSession(activity: Activity, sessionId: string): void {
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
    this.auth.logout();
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
}
