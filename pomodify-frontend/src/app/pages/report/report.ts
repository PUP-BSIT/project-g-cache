import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
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
  private auth = inject(Auth);
  private reportService = inject(ReportService);

  // Constants
  private readonly HOURS_TO_MINUTES = 60;
  private readonly DEFAULT_MAX_HOURS = 0.5;
  private readonly CHART_SCALE_MULTIPLIER = 1.2;
  private readonly ROUNDING_FACTOR = 2;
  private readonly MINUTES_THRESHOLD = 1; // 1 hour threshold to switch from minutes to hours
  private readonly MIN_TICKS = 5; // Minimum number of ticks to display

  // Sidebar state
  protected sidebarExpanded = signal(true);
  protected isLoggingOut = signal(false);

  // Summary metrics
  protected readonly totalFocusHours = signal(0);
  protected readonly totalBreakHours = signal(0);
  protected readonly averageSessionLengthMinutes = signal(0);
  protected readonly dailyAverageFocusHours = signal(0);
  protected readonly streakDays = signal(0);
  protected readonly completionRate = signal(0);
  protected readonly sessionsCount = signal(0);
  protected readonly lastMonthAbandonedSessions = signal(0);

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
  protected readonly chartTicks = signal<number[]>([]);
  protected readonly tooltipData = signal<FocusPoint | null>(null);
  protected readonly tooltipPosition = signal<{ x: number; y: number }>({ x: 0, y: 0 });

  protected readonly activityRanking = signal<ActivityRank[]>([]);
  protected readonly focusProjects = signal<FocusProject[]>([]);
  
  // Chart unit mode: 'hours' or 'minutes'
  protected readonly chartUnitMode = signal<'hours' | 'minutes'>('hours');

  // Track if user has any data in current period
  protected readonly hasData = computed(() => {
    return this.sessionsCount() > 0 || this.totalFocusHours() > 0;
  });

  ngOnInit(): void {
    // Auto-collapse sidebar on mobile
    if (typeof window !== 'undefined' && window.innerWidth <= 768) {
      this.sidebarExpanded.set(false);
    }
    
    // Initialize theme state
    this.isDarkMode.set(document.documentElement.classList.contains('theme-dark'));
    
    // Load data from backend based on selected range
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
    this.isLoggingOut.set(true);
    this.auth.logout()
      .finally(() => {
        this.isLoggingOut.set(false);
      });
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
      error: (error) => {
        console.error('Error loading report summary:', error);
        
        // If it's an authentication error, the interceptor will handle redirect
        // For other errors, clear the data
        if (error.status !== 401) {
          // Clear all data when there's an error
          this.totalFocusHours.set(0);
          this.totalBreakHours.set(0);
          this.averageSessionLengthMinutes.set(0);
          this.dailyAverageFocusHours.set(0);
          this.streakDays.set(0);
          this.completionRate.set(0);
          this.sessionsCount.set(0);
          this.lastMonthAbandonedSessions.set(0);
          this.periodInfo.set(null);
          
          // Clear chart data
          this.focusSeries.set([]);
          this.chartTicks.set([]);
          this.currentRangeTotalHours.set(0);
          this.activityRanking.set([]);
          this.focusProjects.set([]);
          this.trends.set([]);
          this.insights.set([]);
        }
      },
    });
  }

  private updateFromSummary(summary: SummaryItemType): void {
    // Guard against undefined summary
    if (!summary) {
      console.error('Summary is undefined');
      return;
    }

    const overview = summary.overview;
    const chartData = summary.chartData;
    const topActivities = summary.topActivities ?? [];
    const recentSessions = summary.recentSessions ?? [];
    const period = summary.period;
    const trendData = summary.trends;
    const insightData = summary.insights ?? [];

    // Update period info
    if (period) {
      this.periodInfo.set({
        startDate: period.startDate,
        endDate: period.endDate,
        range: period.range,
      });
    }

    // Generate labels if not provided or empty
    const labels = chartData?.labels && chartData.labels.length > 0
      ? chartData.labels
      : [];

    const focusHours = chartData?.datasets?.focus ?? [];
    // Ensure focusHours array matches labels length
    const paddedFocusHours = [...focusHours];
    while (paddedFocusHours.length < labels.length) {
      paddedFocusHours.push(0);
    }

    const totalHours = paddedFocusHours.reduce((sum, value) => sum + (value ?? 0), 0);

    // Guard against undefined overview
    if (overview) {
      this.totalFocusHours.set(overview.totalFocusHours ?? 0);
      this.totalBreakHours.set(overview.totalBreakHours ?? 0);
      this.completionRate.set(overview.completionRate ?? 0);
      this.sessionsCount.set(overview.sessionsCount ?? 0);
      this.averageSessionLengthMinutes.set(overview.averageSessionLengthMinutes ?? 0);
    } else {
      // Reset to defaults if overview is undefined
      this.totalFocusHours.set(0);
      this.totalBreakHours.set(0);
      this.completionRate.set(0);
      this.sessionsCount.set(0);
      this.averageSessionLengthMinutes.set(0);
    }

    // Set last month abandoned sessions
    this.lastMonthAbandonedSessions.set(summary.lastMonthAbandonedSessions ?? 0);

    const labelCount = labels.length || 1;
    this.dailyAverageFocusHours.set(labelCount ? totalHours / labelCount : 0);

    // Calculate streak: consecutive days with focus at the end of the period
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
    const points: FocusPoint[] = labels.map((label: string, index: number) => {
      const activities = this.getActivitiesForDateLabel(label, index, recentSessions, period);
      return {
        label: label,
        dateKey: label,
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

  private getActivitiesForDateLabel(label: string, index: number, sessions: any[], period: any): ActivityBreakdown[] {
    const activityMap: { [key: string]: ActivityBreakdown } = {};
    const range = this.selectedRange();

    if (!period) return [];

    for (const session of sessions) {
      const sessionDate = new Date(session.date);
      const isMatch = this.isSessionMatchingLabel(sessionDate, label, period, range);

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

  private isSessionMatchingLabel(sessionDate: Date, label: string, period: any, range: ReportRange): boolean {
    if (range === ReportRange.WEEK) {
      // For weekly: match day name (Mon, Tue, Wed, etc.)
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const sessionDayName = dayNames[sessionDate.getDay()];
      
      // Also check if session is within the period range
      const periodStart = new Date(period.startDate);
      const periodEnd = new Date(period.endDate);
      const sessionDateOnly = new Date(sessionDate.getFullYear(), sessionDate.getMonth(), sessionDate.getDate());
      
      return sessionDayName === label && 
             sessionDateOnly >= periodStart && 
             sessionDateOnly <= periodEnd;
             
    } else if (range === ReportRange.MONTH) {
      // For monthly: match day number (1, 2, 3, etc.)
      const sessionDay = sessionDate.getDate();
      const labelDay = parseInt(label);
      
      // Also check if it's the same month/year as the period
      const periodStart = new Date(period.startDate);
      const sameMonth = sessionDate.getMonth() === periodStart.getMonth();
      const sameYear = sessionDate.getFullYear() === periodStart.getFullYear();
      
      return sessionDay === labelDay && sameMonth && sameYear;
      
    } else if (range === ReportRange.YEAR) {
      // For yearly: match month name (Jan, Feb, Mar, etc.)
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const sessionMonth = monthNames[sessionDate.getMonth()];
      
      // Also check if it's the same year as the period
      const periodStart = new Date(period.startDate);
      const sameYear = sessionDate.getFullYear() === periodStart.getFullYear();
      
      return sessionMonth === label && sameYear;
    }
    
    return false;
  }

  private rebuildSeries(points: FocusPoint[]): void {
    if (!points.length) {
      this.focusSeries.set([]);
      this.currentRangeTotalHours.set(0);
      this.chartTicks.set([]);
      this.chartUnitMode.set('hours');
      return;
    }

    const maxHours = Math.max(...points.map((p) => p.hours), this.DEFAULT_MAX_HOURS);
    
    // Determine if we should display in minutes or hours based on max value
    const useMinutesMode = maxHours < this.MINUTES_THRESHOLD;
    this.chartUnitMode.set(useMinutesMode ? 'minutes' : 'hours');
    
    // Calculate appropriate chart max and ticks
    const { chartMax, ticks } = this.calculateChartTicks(maxHours, useMinutesMode);

    const normalized = points.map((p) => ({
      ...p,
      percentage: p.hours <= 0 ? 4 : Math.max((p.hours / chartMax) * 100, 6),
    }));

    this.focusSeries.set(normalized);
    this.chartTicks.set(ticks);
  }

  /**
   * Calculates appropriate chart max value and tick intervals based on data
   * @param maxHours - Maximum hours value from the data
   * @param useMinutesMode - Whether to display in minutes or hours
   * @returns Object containing chartMax and array of ticks
   */
  private calculateChartTicks(maxHours: number, useMinutesMode: boolean): { chartMax: number; ticks: number[] } {
    if (useMinutesMode) {
      // For minutes mode: show ticks at 0, 15, 30, 45, 60 minutes (and potentially more if needed)
      const maxMinutes = maxHours * this.HOURS_TO_MINUTES;
      const ticks: number[] = [];
      
      // Generate minute-based ticks
      for (let minutes = 0; minutes <= maxMinutes; minutes += 15) {
        ticks.push(minutes / this.HOURS_TO_MINUTES); // Convert back to hours for internal representation
      }
      
      // Ensure we have at least MIN_TICKS
      if (ticks.length < this.MIN_TICKS) {
        const lastTick = ticks[ticks.length - 1];
        ticks.push(lastTick + 0.25); // Add another 15-minute interval
      }
      
      return {
        chartMax: ticks[ticks.length - 1] || 1,
        ticks,
      };
    } else {
      // For hours mode: intelligently distribute ticks based on max hours
      const chartMax = Math.ceil(maxHours * this.CHART_SCALE_MULTIPLIER * this.ROUNDING_FACTOR) / this.ROUNDING_FACTOR;
      const ticks: number[] = [];
      const step = chartMax / (this.MIN_TICKS - 1); // Divide into MIN_TICKS intervals
      
      for (let i = 0; i < this.MIN_TICKS; i++) {
        const value = +(i * step).toFixed(2);
        ticks.push(value);
      }
      
      return {
        chartMax,
        ticks,
      };
    }
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
      const totalMinutes = value * this.HOURS_TO_MINUTES;
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
    const range = this.selectedRange();
    const period = this.periodInfo();
    
    if (range === ReportRange.MONTH && period) {
      // For monthly view, combine the day number with the month/year from period
      const dayNumber = parseInt(point.label);
      if (!isNaN(dayNumber)) {
        const startDate = new Date(period.startDate);
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                           'July', 'August', 'September', 'October', 'November', 'December'];
        const monthName = monthNames[startDate.getMonth()];
        const year = startDate.getFullYear();
        return `${monthName} ${dayNumber}, ${year}`.toUpperCase();
      }
    }
    
    // For weekly and yearly views, just use the label directly
    return point.label.toUpperCase();
  }

  /**
   * Builds CSS class string for insight card based on type and severity
   * @param type - The insight type (positive, warning, info)
   * @param severity - The severity level (low, medium, high)
   * @returns Combined class string
   */
  protected buildInsightCardClass(type: string, severity: string): string {
    return `insight-${type} severity-${severity}`;
  }

  private getInsightIcon(type: 'positive' | 'warning' | 'info', severity: 'low' | 'medium' | 'high'): string {
    if (type === 'positive') return 'fa-solid fa-thumbs-up';
    if (type === 'warning') return 'fa-solid fa-triangle-exclamation';
    return 'fa-solid fa-circle-info';
  }
}