// activities.ts - Activities List Page with Backend Integration
import { CommonModule } from '@angular/common';
import { Component, signal, computed, OnInit, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { MatDialog } from '@angular/material/dialog';

import { Auth } from '../../core/services/auth';
import { API } from '../../core/config/api.config';
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
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './activities.html',
  styleUrls: ['./activities.scss'],
})
export class ActivitiesPage implements OnInit {
  private router = inject(Router);
  private auth = inject(Auth);
  private dialog = inject(MatDialog);
  private http = inject(HttpClient);
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

  // Activity completion tracking
  protected readonly activityCompletions = signal<Map<number, number>>(new Map());

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
  protected allCategories = signal<Array<{categoryId: number, categoryName: string}>>([]);

  // Computed categories list (fallback to extracted from activities if API fails)
  protected categories = computed(() => {
    // Prefer categories from API
    const apiCategories = this.allCategories();
    if (apiCategories.length > 0) {
      return apiCategories.map(c => c.categoryName).sort();
    }
    
    // Fallback: extract from loaded activities (THIS IS NOW THE PRIMARY METHOD)
    console.log('[ActivitiesPage] Using categories from activities as fallback');
    const allActivities = this.activities();
    const categoryNames = new Set<string>();
    allActivities.forEach(activity => {
      if (activity.categoryName) {
        categoryNames.add(activity.categoryName);
      }
    });
    const extractedCategories = Array.from(categoryNames).sort();
    console.log('[ActivitiesPage] Extracted categories from activities:', extractedCategories);
    return extractedCategories;
  });

  // Filtered activities based on search and category
  protected filteredActivities = computed(() => {
    let filtered = this.activities();
    
    // Filter by category
    const selectedCat = this.selectedCategoryName();
    if (selectedCat) {
      filtered = filtered.filter(activity => activity.categoryName === selectedCat);
    }
    
    // Filter by search query
    const query = this.searchQuery().toLowerCase().trim();
    if (query) {
      filtered = filtered.filter(activity => 
        activity.activityTitle.toLowerCase().includes(query) ||
        (activity.activityDescription?.toLowerCase().includes(query) || false)
      );
    }
    
    return filtered;
  });

  ngOnInit(): void {
    console.log('[ActivitiesPage] Initializing...');
    this.loadCategories();
    this.loadActivities();
  }

  // Load all categories from backend
  private loadCategories(): void {
    console.log('[ActivitiesPage] Fetching categories from API...');
    this.http.get<any>(API.CATEGORIES.GET_ALL).subscribe({
      next: (response) => {
        console.log('[ActivitiesPage] Categories API response:', response);
        
        // Handle multiple possible response formats
        let categories: any[] = [];
        
        if (Array.isArray(response)) {
          // Response is directly an array
          categories = response;
        } else if (response && Array.isArray(response.categories)) {
          // Response has a categories property that is an array
          categories = response.categories;
        } else if (response && Array.isArray(response.content)) {
          // Response has a content property (paginated response)
          categories = response.content;
        } else if (response && typeof response === 'object') {
          // Try to find any array property in the response
          const arrayProp = Object.values(response).find(val => Array.isArray(val));
          if (arrayProp) {
            categories = arrayProp as any[];
          }
        }
        
        console.log('[ActivitiesPage] Processed categories:', categories);
        this.allCategories.set(categories);
        console.log('[ActivitiesPage] Categories signal updated, length:', this.allCategories().length);
      },
      error: (err) => {
        console.error('[ActivitiesPage] Error loading categories:', err);
        console.error('[ActivitiesPage] Error status:', err.status);
        console.error('[ActivitiesPage] Error message:', err.message);
        // Silently fail - will use categories from activities as fallback
      }
    });
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
        
        // Log available categories from loaded activities
        const availableCategories = this.categories();
        console.log('[ActivitiesPage] Available categories after loading:', availableCategories);
        
        // Load sessions for each activity to calculate completion
        activitiesWithColors.forEach(activity => {
          this.loadActivitySessions(activity.activityId);
        });
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
            sessionType: 'CLASSIC',
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
    console.log('[ActivitiesPage] Category selected:', category);
  }

  // Select activity and navigate to sessions
  protected selectActivity(activity: ActivityData): void {
    console.log('[ActivitiesPage] Activity selected:', activity.activityTitle);
    // Navigate to sessions list for this activity
    this.router.navigate(['/activities', activity.activityTitle, 'sessions']);
  }

  // Helper methods
  protected getIconClass(activity: ActivityData): string {
    try {
      return this.iconMapper.getIconClass(activity.activityTitle, activity.categoryName || 'General');
    } catch {
      return 'fa-solid fa-circle';
    }
  }

  // Get completion percentage for activity based on sessions
  protected getActivityCompletionPercentage(activity: ActivityData): number {
    const completions = this.activityCompletions();
    return completions.get(activity.activityId) || 0;
  }

  // Load sessions for an activity and calculate completion
  private loadActivitySessions(activityId: number): void {
    this.sessionService.getSessions(activityId, 'COMPLETED').subscribe({
      next: (sessions: any[]) => {
        // Calculate completion percentage
        // Assuming 5 hours per week as target (can be adjusted)
        const estimatedHoursPerWeek = 5;
        const totalFocusHours = sessions.reduce((sum: number, session: any) => {
          return sum + (session.focusTimeInMinutes || 0) / 60;
        }, 0);
        const percentage = Math.min((totalFocusHours / estimatedHoursPerWeek) * 100, 100);
        
        const currentCompletions = new Map(this.activityCompletions());
        currentCompletions.set(activityId, Math.round(percentage));
        this.activityCompletions.set(currentCompletions);
      },
      error: (err: any) => {
        console.error('[ActivitiesPage] Error loading sessions for activity:', activityId, err);
        // Set to 0% on error
        const currentCompletions = new Map(this.activityCompletions());
        currentCompletions.set(activityId, 0);
        this.activityCompletions.set(currentCompletions);
      }
    });
  }

  // Navigation
  protected toggleSidebar(): void {
    this.sidebarExpanded.update(expanded => !expanded);
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

  protected openProfileModal(): void {
    console.log('[ActivitiesPage] Profile modal clicked');
  }
}
