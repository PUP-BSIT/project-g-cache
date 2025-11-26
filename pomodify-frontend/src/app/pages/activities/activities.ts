import { CommonModule } from '@angular/common';
import { Component, computed, signal, HostListener, inject, effect } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { toggleTheme } from '../../shared/theme';
import { CreateActivityModal, ActivityData } from '../../shared/components/create-activity-modal/create-activity-modal';
import { EditActivityModal } from '../../shared/components/edit-activity-modal/edit-activity-modal';
import { DeleteActivityModal } from '../../shared/components/delete-activity-modal/delete-activity-modal';

interface Activity {
  id: string;
  name: string;
  icon: string;
  category: string;
  colorTag: string;
  estimatedHoursPerWeek: number;
  lastAccessed: string;
}

@Component({
  selector: 'app-activities',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, FormsModule],
  templateUrl: './activities.html',
  styleUrl: './activities.scss',
})
export class ActivitiesPage {
  private dialog = inject(MatDialog);

  // Sidebar state
  protected sidebarExpanded = signal(true);

  // Toggle sidebar
  protected toggleSidebar(): void {
    this.sidebarExpanded.update(expanded => !expanded);
  }

  onToggleTheme() { toggleTheme(); }

  // Close sidebar on mobile when clicking outside
  @HostListener('document:click', ['$event'])
  onClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.closest('.sidebar') && !target.closest('.sidebar-toggle')) {
      if (window.innerWidth < 768) {
        this.sidebarExpanded.set(false);
      }
    }
  }

  // --- State ---
  protected readonly activities = signal<Activity[]>([
    { 
      id: 'math', 
      name: 'Study Math', 
      icon: '📘', 
      category: 'Study',
      colorTag: 'teal',
      estimatedHoursPerWeek: 5,
      lastAccessed: '1 hr ago' 
    },
    { 
      id: 'angular', 
      name: 'Learn Angular', 
      icon: '{}', 
      category: 'Programming',
      colorTag: 'blue',
      estimatedHoursPerWeek: 8,
      lastAccessed: '2 days ago' 
    },
    { 
      id: 'design', 
      name: 'Design Prototype', 
      icon: '🎨', 
      category: 'Design',
      colorTag: 'purple',
      estimatedHoursPerWeek: 6,
      lastAccessed: '3 days ago' 
    },
    { 
      id: 'kotlin', 
      name: 'Learn Kotlin', 
      icon: '</>', 
      category: 'Programming',
      colorTag: 'orange',
      estimatedHoursPerWeek: 4,
      lastAccessed: '1 week ago' 
    },
    { 
      id: 'document', 
      name: 'Learn Document', 
      icon: '📄', 
      category: 'Study',
      colorTag: 'green',
      estimatedHoursPerWeek: 3,
      lastAccessed: '5 days ago' 
    },
    { 
      id: 'javascript', 
      name: 'Learn JavaScript', 
      icon: '</>', 
      category: 'Programming',
      colorTag: 'yellow',
      estimatedHoursPerWeek: 7,
      lastAccessed: '4 days ago' 
    },
  ]);

  protected readonly searchQuery = signal('');

  protected readonly filteredActivities = computed(() => {
    const query = this.searchQuery().toLowerCase();
    if (!query) {
      return this.activities();
    }
    return this.activities().filter(activity =>
      activity.name.toLowerCase().includes(query) ||
      activity.category.toLowerCase().includes(query)
    );
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

  // Keep current page valid when filtered list changes
  constructor() {
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

  // --- Actions ---
  protected onSearchChange(query: string): void {
    this.searchQuery.set(query);
    // when searching, go back to page 1
    this.currentPage.set(1);
  }

  protected setPage(n: number) {
    const tp = this.totalPages();
    if (n < 1) n = 1;
    if (n > tp) n = tp;
    this.currentPage.set(n);
  }

  protected prevPage() {
    this.setPage(this.currentPage() - 1);
  }

  protected nextPage() {
    this.setPage(this.currentPage() + 1);
  }

  protected openCreateActivityModal(): void {
    this.dialog.open(CreateActivityModal).afterClosed().subscribe((result: ActivityData) => {
      if (result) {
        console.log('New activity created:', result);
        const newActivity: Activity = {
          id: this.generateId(),
          name: result.name,
          icon: '📝',
          category: result.category || 'General',
          colorTag: result.colorTag || 'teal',
          estimatedHoursPerWeek: result.estimatedHoursPerWeek || 1,
          lastAccessed: 'just now'
        };
        this.activities.update(activities => [newActivity, ...activities]);
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
      estimatedHoursPerWeek: activity.estimatedHoursPerWeek
    };

    this.dialog.open(EditActivityModal, { data }).afterClosed().subscribe((updated: ActivityData) => {
      if (updated) {
        console.log('Updated activity:', updated);
        this.activities.update(activities =>
          activities.map(a => 
            a.id === activity.id 
              ? { ...a, ...updated }
              : a
          )
        );
      }
    });
  }

  protected openDeleteActivityModal(activity: Activity): void {
    const data = { id: activity.id, name: activity.name };
    this.dialog.open(DeleteActivityModal, { data }).afterClosed().subscribe((confirmed: boolean) => {
      if (confirmed) {
        console.log('Delete confirmed for', activity.name);
        this.activities.update(activities =>
          activities.filter(a => a.id !== activity.id)
        );
      }
    });
  }

  protected getColorClass(colorTag: string): string {
    return `color-${colorTag}`;
  }

  private generateId(): string {
    return 'activity-' + Date.now();
  }
}
