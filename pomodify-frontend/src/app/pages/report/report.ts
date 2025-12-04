import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { toggleTheme } from '../../shared/theme';
import { Profile, ProfileData } from '../profile/profile';
import { Auth } from '../../core/services/auth';
import { ReportService, SummaryItem } from '../../core/services/report.service';

type ActivityBreakdown = {
  activityName: string;
  hours: number;
  sessions: number;
};

type FocusPoint = {
  label: string;
  hours: number;
  percentage: number;
  dateKey?: string;
  activities: ActivityBreakdown[];
};

type ActivityRank = {
  id: string;
  name: string;
  icon: string;
  totalHours: number;
  sessions: number;
};

type RangeKey = 'week' | 'month' | 'year';

type FocusProject = {
  id: string;
  name: string;
  totalMinutes: number;
};

@Component({
  selector: 'app-report',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './report.html',
  styleUrls: ['./report.scss'],
})
export class Report implements OnInit {
  private dialog = inject(MatDialog);
  private router = inject(Router);
  private auth = inject(Auth);
  private reportService = inject(ReportService);

  // Sidebar state
  protected sidebarExpanded = signal(true);

  // Summary metrics
  protected readonly totalFocusHours = signal(0);
  protected readonly dailyAverageFocusHours = signal(0);
  protected readonly streakDays = signal(0);

  // Chart + range state
  protected readonly selectedRange = signal<RangeKey>('week');
  protected readonly focusSeries = signal<FocusPoint[]>([]);
  protected readonly currentRangeTotalHours = signal(0);
  protected readonly chartTicks = signal<number[]>([0, 0.5, 1, 1.5, 2]);
  protected readonly completedFocusChecked = signal(false);
  protected readonly progressingFocusChecked = signal(false);
  protected readonly tooltipData = signal<FocusPoint | null>(null);
  protected readonly tooltipPosition = signal<{ x: number; y: number }>({ x: 0, y: 0 });

  protected readonly activityRanking = signal<ActivityRank[]>([]);
  protected readonly focusProjects = signal<FocusProject[]>([]);

  ngOnInit(): void {
    this.loadSummary(this.selectedRange());
  }

  // Toggle sidebar
  protected toggleSidebar(): void {
    this.sidebarExpanded.update((expanded) => !expanded);
  }

  protected onToggleTheme(): void {
    toggleTheme();
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

  // Collapse sidebar when clicking main content
  protected onMainContentClick(): void {
    if (this.sidebarExpanded()) {
      this.sidebarExpanded.set(false);
    }
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
          // TODO(Delumen, Ivan): persist profile changes to backend
        }
      });
  }

  // --- Derived labels ---
  protected readonly selectedRangeLabel = computed(() => {
    const range = this.selectedRange();
    if (range === 'week') return 'week';
    if (range === 'month') return 'month';
    return 'year';
  });

  protected setRange(range: RangeKey): void {
    if (this.selectedRange() === range) return;
    this.selectedRange.set(range);
    this.loadSummary(range);
  }

  protected onCompletedFocusToggle(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    if (!input) return;
    this.completedFocusChecked.set(input.checked);
  }

  protected onProgressingFocusToggle(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    if (!input) return;
    this.progressingFocusChecked.set(input.checked);
  }

  protected onBarHover(point: FocusPoint, event: MouseEvent): void {
    this.tooltipData.set(point);
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    this.tooltipPosition.set({
      x: rect.left + rect.width / 2,
      y: rect.top - 10,
    });
  }

  protected onBarLeave(): void {
    this.tooltipData.set(null);
  }

  private loadSummary(range: RangeKey): void {
    this.reportService.getSummary(range).subscribe({
      next: (summary) => this.updateFromSummary(summary),
      error: () => {
        this.totalFocusHours.set(0);
        this.dailyAverageFocusHours.set(0);
        this.streakDays.set(0);
        this.focusSeries.set([]);
        this.currentRangeTotalHours.set(0);
        this.chartTicks.set([0, 0.5, 1, 1.5, 2]);
        this.activityRanking.set([]);
        this.focusProjects.set([]);
      },
    });
  }

  private updateFromSummary(summary: SummaryItem): void {
    const metrics = summary.metrics;
    const chartData = summary.chartData;
    const topActivities = summary.topActivities ?? [];

    const focusHours = chartData?.datasets?.focus ?? [];
    const totalHours = focusHours.reduce((sum, value) => sum + (value ?? 0), 0);

    this.totalFocusHours.set(metrics?.totalFocusedHours ?? 0);

    const labelCount = chartData?.labels?.length || 1;
    this.dailyAverageFocusHours.set(labelCount ? totalHours / labelCount : 0);

    // Compute a simple "streak" based on consecutive non-zero points from the end
    let streak = 0;
    for (let i = focusHours.length - 1; i >= 0; i--) {
      const v = focusHours[i] ?? 0;
      if (v > 0) {
        streak += 1;
      } else if (streak > 0) {
        break;
      }
    }
    this.streakDays.set(streak);

    const points: FocusPoint[] =
      (chartData?.labels ?? []).map((label, index) => ({
        label,
        hours: focusHours[index] ?? 0,
        percentage: 0,
        activities: [],
      })) ?? [];

    this.rebuildSeries(points);

    // Current range total hours (already computed from focusHours)
    this.currentRangeTotalHours.set(totalHours);

    // Map top activities to ranking and focus projects
    const ranking: ActivityRank[] = topActivities.map((activity) => ({
      id: activity.name,
      name: activity.name,
      icon: '',
      totalHours: (activity.totalDurationMinutes ?? 0) / 60,
      sessions: activity.sessionCount ?? 0,
    }));

    const projects: FocusProject[] = topActivities.map((activity) => ({
      id: activity.name,
      name: activity.name,
      totalMinutes: activity.totalDurationMinutes ?? 0,
    }));

    this.activityRanking.set(ranking);
    this.focusProjects.set(projects);
  }

  private rebuildSeries(points: FocusPoint[]): void {
    if (!points.length) {
      this.focusSeries.set([]);
      this.currentRangeTotalHours.set(0);
      this.chartTicks.set([0, 0.5, 1, 1.5, 2]);
      return;
    }

    const maxHours = Math.max(...points.map((p) => p.hours), 0.5);
    const chartMax = Math.max(Math.ceil(maxHours * 1.2 * 2) / 2, 1);

    const normalized = points.map((p) => ({
      ...p,
      percentage: p.hours <= 0 ? 4 : Math.max((p.hours / chartMax) * 100, 6),
    }));

    this.focusSeries.set(normalized);

    const ticks: number[] = [];
    const step = chartMax / 4;
    for (let i = 0; i <= 4; i++) {
      const value = +(i * step).toFixed(1);
      ticks.push(value);
    }
    this.chartTicks.set(ticks);
  }

  protected formatMinutes(totalMinutes: number): string {
    if (!totalMinutes || totalMinutes < 1) {
      return '0m';
    }
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    if (hours === 0) {
      return `${minutes}m`;
    }
    if (minutes === 0) {
      return `${hours}h`;
    }
    return `${hours}h ${minutes}m`;
  }

  protected formatTickLabel(value: number): string {
    if (value <= 0) {
      return '0h';
    }
    // Always format as hours, using decimal notation when needed
    const hours = Math.floor(value);
    const decimalPart = value - hours;
    
    if (Math.abs(decimalPart) < 0.01) {
      // Whole number - show as "1h", "2h", etc.
      return `${hours}h`;
    }
    // Show as decimal hours (e.g., 1.5h, 2.5h)
    return `${value.toFixed(1)}h`;
  }

  protected getTooltipTitle(point: FocusPoint): string {
    if (point.dateKey) {
      const date = new Date(point.dateKey + 'T00:00:00');
      return date.toLocaleDateString(undefined, { weekday: 'long' }).toUpperCase();
    }
    return point.label.toUpperCase();
  }
}