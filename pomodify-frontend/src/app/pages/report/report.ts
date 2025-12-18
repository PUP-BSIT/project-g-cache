import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { toggleTheme } from '../../shared/theme';
import { Profile, ProfileData } from '../profile/profile';
import { Auth } from '../../core/services/auth';
import { ReportRange, ReportService, SummaryItem, SummaryItem as SummaryItemType } from '../../core/services/report.service';

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

type FocusProject = {
  id: string;
  name: string;
  totalMinutes: number;
};

type TrendDisplay = {
  label: string;
  current: number;
  previous: number;
  changePercent: number;
  icon: string;
};

type InsightDisplay = {
  type: 'positive' | 'warning' | 'info';
  severity: 'low' | 'medium' | 'high';
  message: string;
  actionable: string;
  icon: string;
};

type PeriodInfo = {
  startDate: string;
  endDate: string;
  range: string;
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
  protected readonly totalBreakHours = signal(0);
  protected readonly dailyAverageFocusHours = signal(0);
  protected readonly streakDays = signal(0);
  protected readonly completionRate = signal(0);
  protected readonly sessionsCount = signal(0);

  // Period info
  protected readonly periodInfo = signal<PeriodInfo | null>(null);

  // Trends
  protected readonly trends = signal<TrendDisplay[]>([]);

  // Insights
  protected readonly insights = signal<InsightDisplay[]>([]);

  // Chart + range state
  protected readonly selectedRange = signal<ReportRange>(ReportRange.WEEK);
  protected readonly focusSeries = signal<FocusPoint[]>([]);
  protected readonly currentRangeTotalHours = signal(0);
  protected readonly chartTicks = signal<number[]>([0, 0.5, 1, 1.5, 2]);
  protected readonly expiredSessionFocusChecked = signal(false);
  protected readonly expiredSessionsCount = signal(0);
  protected readonly tooltipData = signal<FocusPoint | null>(null);
  protected readonly tooltipPosition = signal<{ x: number; y: number }>({ x: 0, y: 0 });

  protected readonly activityRanking = signal<ActivityRank[]>([]);
  protected readonly focusProjects = signal<FocusProject[]>([]);
  
  // Chart unit mode: 'hours' or 'minutes'
  protected readonly chartUnitMode = signal<'hours' | 'minutes'>('hours');

  ngOnInit(): void {
    // Initialize theme state
    this.isDarkMode.set(document.documentElement.classList.contains('theme-dark'));
    
    this.loadSummary(this.selectedRange());
  }

  // Toggle sidebar
  protected toggleSidebar(): void {
    this.sidebarExpanded.update((expanded: boolean) => !expanded);
  }

  // Theme management
  protected readonly isDarkMode = signal(false);
  
  protected readonly themeIcon = computed(() => {
    return this.isDarkMode() ? 'fa-sun' : 'fa-moon';
  });

  protected onToggleTheme(): void {
    toggleTheme();
    // Update the dark mode state
    this.isDarkMode.set(document.documentElement.classList.contains('theme-dark'));
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
        }
      });
  }

  // --- Derived labels ---
  protected readonly selectedRangeLabel = computed((): string => {
    const range = this.selectedRange();
    if (range === ReportRange.WEEK) return 'week';
    if (range === ReportRange.MONTH) return 'month';
    return 'year';
  });

  protected setRange(range: ReportRange): void {
    if (this.selectedRange() === range) return;
    this.selectedRange.set(range);
    this.loadSummary(range);
  }

  protected readonly ReportRange = ReportRange;

  protected onExpiredSessionFocusToggle(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    if (!input) return;
    this.expiredSessionFocusChecked.set(input.checked);
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

  private loadSummary(range: ReportRange): void {
    this.reportService.getSummary(range).subscribe({
      next: (summary) => this.updateFromSummary(summary),
      error: () => {
        this.totalFocusHours.set(0);
        this.dailyAverageFocusHours.set(0);
        this.streakDays.set(0);
        
        // Generate default labels even when there's an error
        const labels = this.generateDefaultLabels(range);
        const points: FocusPoint[] = labels.map((label) => ({
          label,
          hours: 0,
          percentage: 0,
          activities: [],
        }));
        this.rebuildSeries(points);
        
        this.currentRangeTotalHours.set(0);
        this.activityRanking.set([]);
        this.focusProjects.set([]);
      },
    });
  }

  private updateFromSummary(summary: SummaryItemType): void {
    // Guard against undefined summary
    if (!summary) {
      console.error('Summary is undefined');
      return;
    }

    const metrics = summary.metrics;
    const chartData = summary.chartData;
    const topActivities = summary.topActivities ?? [];
    const recentSessions = summary.recentSessions ?? [];
    const meta = summary.meta;
    const trendData = summary.trends;
    const insightData = summary.insights;

    // Update period info
    if (meta) {
      this.periodInfo.set({
        startDate: meta.startDate,
        endDate: meta.endDate,
        range: meta.range,
      });
    }

    // Generate labels if not provided or empty
    const labels = chartData?.labels && chartData.labels.length > 0
      ? chartData.labels
      : this.generateDefaultLabels(this.selectedRange());

    const focusHours = chartData?.datasets?.focus ?? [];
    // Ensure focusHours array matches labels length
    const paddedFocusHours = [...focusHours];
    while (paddedFocusHours.length < labels.length) {
      paddedFocusHours.push(0);
    }

    const totalHours = paddedFocusHours.reduce((sum, value) => sum + (value ?? 0), 0);

    // Guard against undefined metrics
    if (metrics) {
      this.totalFocusHours.set(metrics.totalFocusedHours ?? 0);
      this.totalBreakHours.set(metrics.totalBreakHours ?? 0);
      this.completionRate.set(metrics.completionRate ?? 0);
      this.sessionsCount.set(metrics.sessionsCount ?? 0);
      this.expiredSessionsCount.set(metrics.expiredSessionsCount ?? 0);
    } else {
      // Reset to defaults if metrics is undefined
      this.totalFocusHours.set(0);
      this.totalBreakHours.set(0);
      this.completionRate.set(0);
      this.sessionsCount.set(0);
      this.expiredSessionsCount.set(0);
    }

    const labelCount = labels.length || 1;
    this.dailyAverageFocusHours.set(labelCount ? totalHours / labelCount : 0);

    let streak = 0;
    for (let i = paddedFocusHours.length - 1; i >= 0; i--) {
      const v = paddedFocusHours[i] ?? 0;
      if (v > 0) {
        streak += 1;
      } else if (streak > 0) {
        break;
      }
    }
    this.streakDays.set(streak);

    // Build activity breakdown for each label based on recentSessions
    const points: FocusPoint[] = labels.map((label, index) => {
      let displayLabel = label;
      let dateKey: string | undefined = undefined;
      if (this.selectedRange() === ReportRange.WEEK) {
        const date = new Date(label);
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        displayLabel = dayNames[date.getDay()];
        dateKey = label;
      } else if (this.selectedRange() === ReportRange.MONTH) {
        displayLabel = label;
        dateKey = label;
      } else {
        displayLabel = label;
        dateKey = label;
      }
      const activities = this.getActivitiesForDateLabel(displayLabel, index, recentSessions, dateKey);
      return {
        label: displayLabel,
        dateKey,
        hours: paddedFocusHours[index] ?? 0,
        percentage: 0,
        activities,
      };
    });

    this.rebuildSeries(points);

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

    // Process trends if available
    if (trendData) {
      const trendDisplay: TrendDisplay[] = [];
      
      if (trendData.focusHours) {
        trendDisplay.push({
          label: 'Focus Hours',
          current: trendData.focusHours.current,
          previous: trendData.focusHours.previous,
          changePercent: trendData.focusHours.changePercent,
          icon: 'fa-solid fa-clock',
        });
      }
      
      if (trendData.completionRate) {
        trendDisplay.push({
          label: 'Completion Rate',
          current: trendData.completionRate.current,
          previous: trendData.completionRate.previous,
          changePercent: trendData.completionRate.changePercent,
          icon: 'fa-solid fa-check-circle',
        });
      }
      
      this.trends.set(trendDisplay);
    }

    // Process insights if available
    if (insightData && insightData.length > 0) {
      const insightDisplay: InsightDisplay[] = insightData.map((insight: any) => ({
        ...insight,
        icon: this.getInsightIcon(insight.type, insight.severity),
      }));
      this.insights.set(insightDisplay);
    }
  }

  private getActivitiesForDateLabel(label: string, index: number, sessions: any[], dateKey?: string): ActivityBreakdown[] {
    const activityMap: { [key: string]: ActivityBreakdown } = {};

    for (const session of sessions) {
      // Extract date from session and match with label/dateKey
      const sessionDate = new Date(session.date);
      const isMatch = this.isSessionMatchingLabel(sessionDate, label, index, dateKey);

      if (isMatch) {
        const activityName = session.activityName || 'Untitled Session';
        const hours = (session.focusDurationMinutes ?? 0) / 60;

        if (activityMap[activityName]) {
          activityMap[activityName].hours += hours;
          activityMap[activityName].sessions += 1;
        } else {
          activityMap[activityName] = {
            activityName,
            hours,
            sessions: 1,
          };
        }
      }
    }

    return Object.values(activityMap);
  }

  private isSessionMatchingLabel(date: Date, label: string, index: number, dateKey?: string): boolean {
    const range = this.selectedRange();

    if (range === ReportRange.WEEK) {
      if (!dateKey) return false;
      const sessionISO = date.toISOString().slice(0, 10);
      return sessionISO === dateKey;
    } else if (range === ReportRange.MONTH) {
      // Label format: month name (e.g., 'Jan', 'Feb')
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const sessionMonth = monthNames[date.getMonth()];
      return sessionMonth === label;
    } else {
      // YEAR range - Label format: year (e.g., '2025')
      const sessionYear = date.getFullYear().toString();
      return sessionYear === label;
    }
  }

  private rebuildSeries(points: FocusPoint[]): void {
    if (!points.length) {
      this.focusSeries.set([]);
      this.currentRangeTotalHours.set(0);
      this.chartTicks.set([0, 0.5, 1, 1.5, 2]);
      this.chartUnitMode.set('hours');
      return;
    }

    const maxHours = Math.max(...points.map((p) => p.hours), 0.5);
    
    // Determine if we should display in minutes or hours
    // If max is less than 1 hour (60 minutes), display in minutes
    const useMinutesMode = maxHours < 1;
    this.chartUnitMode.set(useMinutesMode ? 'minutes' : 'hours');
    
    // Keep the chart max in hours for consistency
    const chartMax = useMinutesMode
      ? Math.max(Math.ceil(maxHours * 1.2 * 2) / 2, 1)  // Keep as hours
      : Math.max(Math.ceil(maxHours * 1.2 * 2) / 2, 1);

    const normalized = points.map((p) => ({
      ...p,
      percentage: p.hours <= 0 ? 4 : Math.max((p.hours / chartMax) * 100, 6),
    }));

    this.focusSeries.set(normalized);

    const ticks: number[] = [];
    const step = chartMax / 4;
    for (let i = 0; i <= 4; i++) {
      const value = +(i * step).toFixed(2);
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
    const unitMode = this.chartUnitMode();
    
    if (unitMode === 'minutes') {
      // Convert hours to minutes for display
      const totalMinutes = value * 60;
      if (totalMinutes === 0) {
        return '0m';
      }
      const minutes = Math.round(totalMinutes);
      return `${minutes}m`;
    } else {
      // Display as hours (original logic)
      if (value <= 0) {
        return '0h';
      }
      const hours = Math.floor(value);
      const decimalPart = value - hours;
      
      if (Math.abs(decimalPart) < 0.01) {
        return `${hours}h`;
      }
      return `${value.toFixed(1)}h`;
    }
  }

  protected formatHours(hours: number): string {
    const formatted = hours % 1 === 0 ? hours.toString() : hours.toFixed(1);
    if (hours >= 1) {
      return `${formatted}hrs`;
    }
    return `${formatted}h`;
  }

  protected getTooltipTitle(point: FocusPoint): string {
    if (point.dateKey) {
      const date = new Date(point.dateKey + 'T00:00:00');
      return date.toLocaleDateString(undefined, { weekday: 'long' }).toUpperCase();
    }
    return point.label.toUpperCase();
  }

  private generateDefaultLabels(range: ReportRange): string[] {
    if (range === ReportRange.WEEK) {
      // Generate ISO date strings for the last 7 days ending today
      const today = new Date();
      const labels: string[] = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(today.getDate() - i);
        labels.push(date.toISOString().slice(0, 10));
      }
      return labels;
    } else if (range === ReportRange.MONTH) {
      return ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    } else {
      const startingYear = 2025;
      const currentYear = new Date().getFullYear();
      const labels: string[] = [];
      for (let year = startingYear; year <= currentYear; year++) {
        labels.push(year.toString());
      }
      return labels;
    }
  }

  private getInsightIcon(type: 'positive' | 'warning' | 'info', severity: 'low' | 'medium' | 'high'): string {
    if (type === 'positive') return 'fa-solid fa-thumbs-up';
    if (type === 'warning') return 'fa-solid fa-triangle-exclamation';
    return 'fa-solid fa-circle-info';
  }
}