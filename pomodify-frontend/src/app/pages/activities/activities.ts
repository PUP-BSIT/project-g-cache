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
import { Profile, ProfileData } from '../profile/profile';
import { IconMapper } from '../../core/services/icon-mapper';

@Component({
  selector: 'app-activities-page',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './activities.html',
  styleUrls: ['./activities.scss'],
})
export class ActivitiesPage implements OnInit {
    // Improved human-friendly relative time
    protected getRelativeTime(timestamp: string): string {
      if (!timestamp) return '';
      
      let date: Date;
      try {
        // If timestamp doesn't have timezone info, assume it's UTC and append 'Z'
        if (typeof timestamp === 'string' && !timestamp.endsWith('Z') && !timestamp.includes('+')) {
          date = new Date(timestamp.replace(' ', 'T') + 'Z');
        } else {
          date = new Date(timestamp);
        }
      } catch {
        date = new Date(timestamp);
      }
      
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);
      const diffWeeks = Math.floor(diffDays / 7);
      const diffMonths = Math.floor(diffDays / 30.44);
      const diffYears = Math.floor(diffDays / 365.25);

      if (diffMins < 0) return 'Just now';
      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays < 7) return diffDays === 1 ? '1 day ago' : `${diffDays} days ago`;
      if (diffWeeks < 4) return diffWeeks === 1 ? '1 week ago' : `${diffWeeks} weeks ago`;
      if (diffMonths < 12) return diffMonths === 1 ? '1 month ago' : `${diffMonths} months ago`;
      return diffYears === 1 ? '1 year ago' : `${diffYears} years ago`;
    }
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
  protected isLoggingOut = signal(false);

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

  // Computed categories list - only show categories that have activities
  protected categories = computed(() => {
    // Prefer categories from API - filter to only show categories with activities
    const apiCategories = this.allCategories();
    if (apiCategories.length > 0) {
      const categoriesWithActivities = apiCategories
        .filter(c => (c as any).activitiesCount > 0)
        .map(c => c.categoryName)
        .sort();
      console.log('[ActivitiesPage] Categories with activities:', categoriesWithActivities);
      return categoriesWithActivities;
    }
    
    // Fallback: extract from loaded activities
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
          
          // If category is provided, create it first then create activity
          if (result.category && result.category.trim()) {
            this.createCategoryThenActivity(result);
          } else {
            // No category, create activity directly
            this.createActivityWithCategory(result, undefined);
          }
        }
      });
  }

  private createCategoryThenActivity(result: CreateActivityModalData): void {
    const categoryName = result.category!.trim();
    
    // Check if category already exists
    const existingCategory = this.allCategories().find(
      c => c.categoryName.toLowerCase() === categoryName.toLowerCase()
    );
    
    if (existingCategory) {
      // Use existing category
      console.log('[ActivitiesPage] Using existing category:', existingCategory);
      this.createActivityWithCategory(result, existingCategory.categoryId);
    } else {
      // Create new category first
      console.log('[ActivitiesPage] Creating new category:', categoryName);
      this.http.post<any>(API.CATEGORIES.CREATE, { categoryName }).subscribe({
        next: (response) => {
          console.log('[ActivitiesPage] Category created:', response);
          const categoryId = response?.category?.categoryId || response?.categoryId;
          this.createActivityWithCategory(result, categoryId);
          // Reload categories
          this.loadCategories();
        },
        error: (err) => {
          console.error('[ActivitiesPage] Error creating category:', err);
          // Still create activity without category
          this.createActivityWithCategory(result, undefined);
        }
      });
    }
  }

  private createActivityWithCategory(result: CreateActivityModalData, categoryId?: number): void {
    const request: any = {
      title: result.name,
      description: '',
      categoryId: categoryId
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
          // Handle category update similar to create flow
          if (updated.category && updated.category.trim()) {
            this.updateActivityWithCategory(activity.activityId, updated);
          } else {
            // No category, update activity without category
            this.updateActivityRequest(activity.activityId, updated, undefined);
          }
        }
      });
  }

  private updateActivityWithCategory(activityId: number, updated: CreateActivityModalData): void {
    const categoryName = updated.category!.trim();
    
    // Check if category already exists
    const existingCategory = this.allCategories().find(
      c => c.categoryName.toLowerCase() === categoryName.toLowerCase()
    );
    
    if (existingCategory) {
      // Use existing category
      console.log('[ActivitiesPage] Using existing category for update:', existingCategory);
      this.updateActivityRequest(activityId, updated, existingCategory.categoryId);
    } else {
      // Create new category first
      console.log('[ActivitiesPage] Creating new category for update:', categoryName);
      this.http.post<any>(API.CATEGORIES.CREATE, { categoryName }).subscribe({
        next: (response) => {
          console.log('[ActivitiesPage] Category created:', response);
          const categoryId = response?.category?.categoryId || response?.categoryId;
          this.updateActivityRequest(activityId, updated, categoryId);
          // Reload categories
          this.loadCategories();
        },
        error: (err) => {
          console.error('[ActivitiesPage] Error creating category:', err);
          // Still update activity without category
          this.updateActivityRequest(activityId, updated, undefined);
        }
      });
    }
  }

  private updateActivityRequest(activityId: number, updated: CreateActivityModalData, categoryId?: number): void {
    const request: any = {
      newActivityTitle: updated.name,
      newActivityDescription: '',
      newCategoryId: categoryId,
    };
    console.log('[ActivitiesPage] Update request payload:', JSON.stringify(request, null, 2));

    this.activityService.updateActivity(activityId, request).subscribe({
      next: () => {
        console.log('[ActivitiesPage] Activity updated successfully');
        // Save color tag to localStorage
        this.activityColorService.setColorTag(activityId, updated.colorTag);
        this.loadActivities();
      },
      error: (err) => {
        console.error('[ActivitiesPage] Error updating activity:', err);
        alert('Failed to update activity. Please try again.');
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
    this.isLoggingOut.set(true);
    this.auth.logout()
      .then(() => {
        console.log('[ActivitiesPage] Logout completed');
      })
      .catch((error) => {
        console.error('[ActivitiesPage] Logout error:', error);
      })
      .finally(() => {
        this.isLoggingOut.set(false);
      });
  }

  protected openProfileModal(): void {
    console.log('[ActivitiesPage] Opening profile modal');
    this.dialog
      .open(Profile, {
        width: '550px',
        maxWidth: '90vw',
        panelClass: 'profile-dialog',
      })
      .afterClosed()
      .subscribe((result: ProfileData) => {
        if (result) {
          console.log('[ActivitiesPage] Profile updated:', result);
        }
      });
  }
}
