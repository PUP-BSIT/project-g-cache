// activities.ts - Activities List Page with Backend Integration
import { CommonModule } from '@angular/common';
import { Component, signal, computed, OnInit, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { toggleTheme } from '../../shared/theme';
import { Auth } from '../../core/services/auth';
import { ActivityService, ActivityData, ActivityResponse, CreateActivityRequest, UpdateActivityRequest } from '../../core/services/activity.service';
import { SessionService } from '../../core/services/session.service';
import { ActivityColorService } from '../../core/services/activity-color.service';
import { CreateActivityModal, ActivityData as CreateActivityModalData } from '../../shared/components/create-activity-modal/create-activity-modal';
import { EditActivityModal } from '../../shared/components/edit-activity-modal/edit-activity-modal';
import { DeleteActivityModal } from '../../shared/components/delete-activity-modal/delete-activity-modal';
import { AddSessionModal, SessionData } from '../../shared/components/add-session-modal/add-session-modal';
import { IconMapper } from '../../core/services/icon-mapper';

@Component({
  selector: 'app-activities-page',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, FormsModule],
  templateUrl: './activities.html',
  styleUrls: ['./activities.scss'],
})
export class ActivitiesPage implements OnInit {
  private router = inject(Router);
  private auth = inject(Auth);
  private dialog = inject(MatDialog);
  private activityService = inject(ActivityService);
  private sessionService = inject(SessionService);
  private activityColorService = inject(ActivityColorService);
  private iconMapper = inject(IconMapper);

  // Sidebar state
  protected sidebarExpanded = signal(true);

  // Activities data
  protected activities = signal<ActivityData[]>([]);
  protected isLoading = signal(false);
  protected error = signal<string | null>(null);

  // Pagination
  protected currentPage = signal(1);
  protected readonly itemsPerPage = 8; // 2 rows x 4 columns
  protected totalPages = signal(1);
  protected totalItems = signal(0);

  // Search and filter
  protected searchQuery = signal('');
  protected selectedCategory = signal<number | null>(null);
  protected selectedCategoryName = signal<string | null>(null);
  protected categoryDropdownOpen = signal(false);

  // Computed categories list
  protected categories = computed(() => {
    const allActivities = this.activities();
    const categoryNames = new Set<string>();
    allActivities.forEach(activity => {
      if (activity.categoryName) {
        categoryNames.add(activity.categoryName);
      }
    });
    return Array.from(categoryNames).sort();
  });

  ngOnInit(): void {
    console.log('[ActivitiesPage] Initializing...');
    this.loadActivities();
  }

  // Load activities from backend
  protected loadActivities(): void {
    this.isLoading.set(true);
    this.error.set(null);

    const page = this.currentPage() - 1; // Backend uses 0-indexed pages
    const categoryId = this.selectedCategory() ?? undefined;

    console.log('[ActivitiesPage] Loading activities:', { page, categoryId });

    this.activityService.getAllActivities(page, this.itemsPerPage, 'desc', 'title', categoryId).subscribe({
      next: (response: ActivityResponse) => {
        console.log('[ActivitiesPage] Activities loaded:', response);
        // Apply stored color tags to activities
        const activitiesWithColors = (response.activities || []).map(activity => ({
          ...activity,
          colorTag: this.activityColorService.getColorTag(activity.activityId) || activity.colorTag || 'teal'
        }));
        this.activities.set(activitiesWithColors);
        this.totalPages.set(response.totalPages || 1);
        this.totalItems.set(response.totalItems || 0);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('[ActivitiesPage] Error loading activities:', err);
        let errorMsg = err?.error?.message || err?.message || 'Failed to load activities';
        
        // Check if it's a backend cache configuration error
        if (errorMsg.includes('Cannot find cache')) {
          errorMsg = 'Backend cache not configured. Please contact administrator.';
          console.error('[ActivitiesPage] Backend cache error detected.');
        }
        
        this.error.set(errorMsg);
        this.isLoading.set(false);
        this.activities.set([]);
      }
    });
  }

  // Computed filtered activities (client-side search)
  protected filteredActivities = computed(() => {
    const query = this.searchQuery().toLowerCase();
    const allActivities = this.activities();

    if (!query) return allActivities;

    return allActivities.filter((activity) =>
      activity.activityTitle.toLowerCase().includes(query) ||
      activity.activityDescription?.toLowerCase().includes(query)
    );
  });

  // Open create activity modal
  protected openCreateActivityModal(): void {
    console.log('[ActivitiesPage] Opening create activity modal');
    this.dialog
      .open(CreateActivityModal)
      .afterClosed()
      .subscribe((result: CreateActivityModalData) => {
        if (result) {
          console.log('[ActivitiesPage] Creating activity:', result.name);
          const request: any = {
            title: result.name,
            description: result.category || '',
          };
          console.log('[ActivitiesPage] Request payload:', JSON.stringify(request, null, 2));

          this.activityService.createActivity(request).subscribe({
            next: (created) => {
              console.log('[ActivitiesPage] Activity created successfully');
              // Save color tag to localStorage
              this.activityColorService.setColorTag(created.activityId, result.colorTag);
              // Reload activities to get fresh data from backend
              this.loadActivities();
            },
            error: (err) => {
              console.error('[ActivitiesPage] Error creating activity:', err);
              console.error('[ActivitiesPage] Error status:', err.status);
              console.error('[ActivitiesPage] Error body:', err.error);
              
              let errorMsg = err?.error?.message || err?.message || 'Failed to create activity';
              
              // Check if it's a backend cache configuration error
              if (errorMsg.includes('Cannot find cache')) {
                errorMsg = 'Backend cache not configured. Activities cannot be created until the backend cache is properly set up. Please contact your administrator.';
                console.error('[ActivitiesPage] Backend cache error detected.');
              }
              
              alert(`Error: ${errorMsg}`);
            }
          });
        }
      });
  }

  // Open edit activity modal
  protected openEditActivityModal(activity: ActivityData): void {
    const modalData: CreateActivityModalData = {
      name: activity.activityTitle,
      category: activity.categoryName || '',
      colorTag: activity.colorTag || 'teal',
      estimatedHoursPerWeek: 0,
    };

    this.dialog
      .open(EditActivityModal, { data: modalData })
      .afterClosed()
      .subscribe((updated: CreateActivityModalData) => {
        if (updated) {
          const request: any = {
            newActivityTitle: updated.name,
            newActivityDescription: updated.category || '',
            newCategoryId: undefined,
          };

          this.activityService.updateActivity(activity.activityId, request).subscribe({
            next: () => {
              console.log('[ActivitiesPage] Activity updated successfully');
              // Save color tag to localStorage
              this.activityColorService.setColorTag(activity.activityId, updated.colorTag);
              this.loadActivities();
            },
            error: (err) => {
              console.error('[ActivitiesPage] Error updating activity:', err);
              alert('Failed to update activity. Please try again.');
            }
          });
        }
      });
  }

  // Open delete activity modal
  protected openDeleteActivityModal(activity: ActivityData): void {
    this.dialog
      .open(DeleteActivityModal, {
        data: { id: activity.activityId, name: activity.activityTitle }
      })
      .afterClosed()
      .subscribe((confirmed: boolean) => {
        if (confirmed) {
          this.activityService.deleteActivity(activity.activityId).subscribe({
            next: () => {
              console.log('[ActivitiesPage] Activity deleted successfully');
              // Remove color tag from localStorage
              this.activityColorService.removeColorTag(activity.activityId);
              this.loadActivities();
            },
            error: (err) => {
              console.error('[ActivitiesPage] Error deleting activity:', err);
              alert('Failed to delete activity. Please try again.');
            }
          });
        }
      });
  }

  // Open add session modal for activity
  protected openAddSessionModal(activity: ActivityData): void {
    this.dialog
      .open(AddSessionModal)
      .afterClosed()
      .subscribe((result: SessionData) => {
        if (result) {
          this.sessionService.createSession(activity.activityId, {
            sessionType: 'POMODORO',
            focusTimeInMinutes: result.focusTimeMinutes,
            breakTimeInMinutes: result.breakTimeMinutes,
            cycles: 1,
            note: result.note,
          }).subscribe({
            next: () => {
              console.log('[ActivitiesPage] Session added successfully');
              // Optionally reload activities or show success message
            },
            error: (err) => {
              console.error('[ActivitiesPage] Error adding session:', err);
              alert('Failed to add session. Please try again.');
            }
          });
        }
      });
  }

  // Pagination controls
  protected goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
      this.loadActivities();
    }
  }

  protected nextPage(): void {
    this.goToPage(this.currentPage() + 1);
  }

  protected previousPage(): void {
    this.goToPage(this.currentPage() - 1);
  }

  // Search
  protected updateSearchQuery(query: string): void {
    this.searchQuery.set(query);
  }

  // Category dropdown
  protected toggleCategoryDropdown(): void {
    this.categoryDropdownOpen.update(open => !open);
  }

  protected selectCategory(category: string | null): void {
    this.selectedCategoryName.set(category);
    this.categoryDropdownOpen.set(false);
    // TODO: Implement filtering by category name
  }

  // Helper methods
  protected getIconClass(activity: ActivityData): string {
    try {
      return this.iconMapper.getIconClass(activity.activityTitle, activity.categoryName || 'General');
    } catch {
      return 'fa-solid fa-circle';
    }
  }

  // Navigation
  protected toggleSidebar(): void {
    this.sidebarExpanded.update(expanded => !expanded);
  }

  protected onToggleTheme(): void {
    toggleTheme();
  }

  protected onLogout(): void {
    console.log('[ActivitiesPage] Logout initiated');
    this.auth.logout()
      .then(() => {
        console.log('[ActivitiesPage] Logout completed');
      })
      .catch((error) => {
        console.error('[ActivitiesPage] Logout error:', error);
      });
  }

  protected onNavIconClick(event: MouseEvent, route: string): void {
    if (!this.sidebarExpanded()) {
      this.sidebarExpanded.set(true);
    }
    if (this.router.url === route) {
      event.preventDefault();
    }
  }

  protected openProfileModal(): void {
    console.log('[ActivitiesPage] Profile modal clicked');
  }
}
