import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { toggleTheme } from '../../shared/theme';
import { Profile, ProfileData } from '../profile/profile';
import { Auth } from '../../core/services/auth';

type Session = {
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
  sessions?: Session[];
};

type FocusPoint = {
  label: string;
  hours: number;
  percentage: number;
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

  // Sidebar state
  protected sidebarExpanded = signal(true);

  // Mock activities and sessions (no persistence)
  private readonly activities = signal<Activity[]>([]);

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

  ngOnInit(): void {
    this.seedMockData();
    this.recalculateAll();
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
          console.log('Profile updated:', result);
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

  protected readonly activityRanking = computed<ActivityRank[]>(() => {
    const all = this.activities();
    const ranks: ActivityRank[] = [];

    all.forEach((activity) => {
      const sessions = activity.sessions ?? [];
      if (!sessions.length) return;

      const totalMinutes = sessions.reduce(
        (sum, session) => sum + (session.focusTimeMinutes ?? 0),
        0,
      );

      if (totalMinutes <= 0) return;

      ranks.push({
        id: activity.id,
        name: activity.name,
        icon: activity.icon,
        totalHours: totalMinutes / 60,
        sessions: sessions.length,
      });
    });

    return ranks
      .sort((a, b) => b.totalHours - a.totalHours);
  });

  // Projects list under the chart for the current range
  protected readonly focusProjects = computed<FocusProject[]>(() => {
    const activities = this.activities();
    const range = this.selectedRange();
    const now = new Date();

    const result: FocusProject[] = [];

    activities.forEach((activity) => {
      const sessions = activity.sessions ?? [];
      let totalMinutes = 0;

      sessions.forEach((session) => {
        const createdAt = new Date(session.createdAt);
        if (this.isInCurrentRange(createdAt, range, now)) {
          totalMinutes += session.focusTimeMinutes ?? 0;
        }
      });

      if (totalMinutes > 0) {
        result.push({
          id: activity.id,
          name: activity.name,
          totalMinutes,
        });
      }
    });

    // Sort by total minutes descending
    return result.sort((a, b) => b.totalMinutes - a.totalMinutes);
  });

  protected setRange(range: RangeKey): void {
    if (this.selectedRange() === range) return;
    this.selectedRange.set(range);
    this.rebuildSeries();
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

  // --- Mock data & calculations ---
  private seedMockData(): void {
    const today = new Date();

    const daysAgo = (n: number) => {
      const d = new Date(today);
      d.setDate(today.getDate() - n);
      return d.toISOString();
    };

    const activities: Activity[] = [
      {
        id: 'app-dev',
        name: 'App Development',
        icon: '💻',
        sessions: [
          { id: 's1', focusTimeMinutes: 60, breakTimeMinutes: 10, createdAt: daysAgo(0) },
          { id: 's2', focusTimeMinutes: 45, breakTimeMinutes: 5, createdAt: daysAgo(1) },
          { id: 's3', focusTimeMinutes: 30, breakTimeMinutes: 5, createdAt: daysAgo(2) },
        ],
      },
      {
        id: 'study',
        name: 'Study',
        icon: '📘',
        sessions: [
          { id: 's4', focusTimeMinutes: 40, breakTimeMinutes: 10, createdAt: daysAgo(0) },
          { id: 's5', focusTimeMinutes: 25, breakTimeMinutes: 5, createdAt: daysAgo(4) },
        ],
      },
      {
        id: 'uncategories',
        name: 'Uncategory',
        icon: '☕',
        sessions: [
          { id: 's6', focusTimeMinutes: 20, breakTimeMinutes: 5, createdAt: daysAgo(0) },
        ],
      },
      {
        id: 'writing',
        name: 'Writing Notes',
        icon: '📝',
        sessions: [
          { id: 's7', focusTimeMinutes: 35, breakTimeMinutes: 5, createdAt: daysAgo(1) },
          { id: 's8', focusTimeMinutes: 25, breakTimeMinutes: 5, createdAt: daysAgo(2) },
        ],
      },
      {
        id: 'design',
        name: 'UI Design',
        icon: '🎨',
        sessions: [
          { id: 's9', focusTimeMinutes: 50, breakTimeMinutes: 10, createdAt: daysAgo(0) },
        ],
      },
      {
        id: 'exercise',
        name: 'Exercise',
        icon: '🏃',
        sessions: [
          { id: 's10', focusTimeMinutes: 30, breakTimeMinutes: 5, createdAt: daysAgo(3) },
        ],
      },
      {
        id: 'reading',
        name: 'Reading',
        icon: '📚',
        sessions: [
          { id: 's11', focusTimeMinutes: 45, breakTimeMinutes: 10, createdAt: daysAgo(2) },
        ],
      },
      {
        id: 'planning',
        name: 'Planning',
        icon: '🧠',
        sessions: [
          { id: 's12', focusTimeMinutes: 30, breakTimeMinutes: 10, createdAt: daysAgo(1) },
        ],
      },
      {
        id: 'research',
        name: 'Research',
        icon: '🔍',
        sessions: [
          { id: 's13', focusTimeMinutes: 40, breakTimeMinutes: 5, createdAt: daysAgo(0) },
        ],
      },
    ];

    this.activities.set(activities);
  }

  private recalculateAll(): void {
    const allSessions = this.collectAllSessions();
    this.computeSummaryMetrics(allSessions);
    this.rebuildSeries(allSessions);
  }

  private collectAllSessions(): Session[] {
    const list: Session[] = [];
    this.activities().forEach((activity) => {
      (activity.sessions ?? []).forEach((session) => list.push(session));
    });
    return list;
  }

  private computeSummaryMetrics(sessions: Session[]): void {
    if (!sessions.length) {
      this.totalFocusHours.set(0);
      this.dailyAverageFocusHours.set(0);
      this.streakDays.set(0);
      return;
    }

    const totalMinutes = sessions.reduce(
      (sum, session) => sum + (session.focusTimeMinutes ?? 0),
      0,
    );
    const totalHours = totalMinutes / 60;
    this.totalFocusHours.set(totalHours);

    const dayKeys = new Set<string>();
    sessions.forEach((session) => {
      const key = this.toDayKey(new Date(session.createdAt));
      dayKeys.add(key);
    });

    const dayCount = dayKeys.size;
    const averageHours = dayCount ? totalHours / dayCount : 0;
    this.dailyAverageFocusHours.set(averageHours);
    this.streakDays.set(this.computeDayStreak(dayKeys));
  }

  private rebuildSeries(allSessions?: Session[]): void {
    const sessions = allSessions ?? this.collectAllSessions();
    const range = this.selectedRange();

    if (!sessions.length) {
      this.focusSeries.set([]);
      this.currentRangeTotalHours.set(0);
      this.chartTicks.set([0, 0.5, 1, 1.5, 2]);
      return;
    }

    const now = new Date();

    if (range === 'week') {
      const points: FocusPoint[] = [];
      let rangeTotalMinutes = 0;

      // Current week: Monday -> Sunday
      const startOfWeek = new Date(now);
      const dayOfWeek = startOfWeek.getDay(); // 0 (Sun) - 6 (Sat)
      const diffToMonday = (dayOfWeek + 6) % 7; // converts so Monday is 0
      startOfWeek.setDate(startOfWeek.getDate() - diffToMonday);

      for (let offset = 0; offset < 7; offset++) {
        const day = new Date(startOfWeek);
        day.setDate(startOfWeek.getDate() + offset);
        const key = this.toDayKey(day);
        const label = day.toLocaleDateString(undefined, { weekday: 'short' }); // Mon, Tue ... Sun

        const minutes = sessions
          .filter((s) => this.toDayKey(new Date(s.createdAt)) === key)
          .reduce((sum, s) => sum + (s.focusTimeMinutes ?? 0), 0);

        rangeTotalMinutes += minutes;

        points.push({
          label,
          hours: minutes / 60,
          percentage: 0, // temporary, updated below
        });
      }

      const maxHours = Math.max(...points.map((p) => p.hours), 0.5);
      const chartMax = Math.max(Math.ceil(maxHours * 1.2 * 2) / 2, 1);

      const normalized = points.map((p) => ({
        ...p,
        percentage: p.hours <= 0 ? 4 : Math.max((p.hours / chartMax) * 100, 6),
      }));

      this.focusSeries.set(normalized);
      this.currentRangeTotalHours.set(rangeTotalMinutes / 60);

      const ticks: number[] = [];
      const step = chartMax / 4;
      for (let i = 0; i <= 4; i++) {
        const value = +(i * step).toFixed(1);
        ticks.push(value);
      }
      this.chartTicks.set(ticks);
      return;
    }

    if (range === 'month') {
      // Months of the current year: Jan -> Dec
      const currentYear = now.getFullYear();
      const points: FocusPoint[] = [];
      let rangeTotalMinutes = 0;

      for (let month = 0; month < 12; month++) {
        const start = new Date(currentYear, month, 1);
        const end = new Date(currentYear, month + 1, 0);

        const minutes = sessions
          .filter((s) => {
            const d = new Date(s.createdAt);
            return d >= start && d <= end;
          })
          .reduce((sum, s) => sum + (s.focusTimeMinutes ?? 0), 0);

        rangeTotalMinutes += minutes;

        points.push({
          label: start.toLocaleDateString(undefined, { month: 'short' }),
          hours: minutes / 60,
          percentage: 0,
        });
      }

      const maxHours = Math.max(...points.map((p) => p.hours), 1);
      const chartMax = Math.max(Math.ceil(maxHours * 1.2), 2);

      const normalized = points.map((p) => ({
        ...p,
        percentage: p.hours <= 0 ? 4 : Math.max((p.hours / chartMax) * 100, 8),
      }));

      this.focusSeries.set(normalized);
      this.currentRangeTotalHours.set(rangeTotalMinutes / 60);

      const ticks: number[] = [];
      const step = chartMax / 4;
      for (let i = 0; i <= 4; i++) {
        const value = +(i * step).toFixed(0);
        ticks.push(value);
      }
      this.chartTicks.set(ticks);
      return;
    }

    // year range - group by year (e.g. 2023, 2024)
    const yearsSet = new Set<number>();
    sessions.forEach((s) => {
      const d = new Date(s.createdAt);
      yearsSet.add(d.getFullYear());
    });

    const years = Array.from(yearsSet.values()).sort((a, b) => a - b);
    const yearPoints: FocusPoint[] = [];
    let totalMinutesAllYears = 0;

    years.forEach((year) => {
      const start = new Date(year, 0, 1);
      const end = new Date(year, 11, 31, 23, 59, 59, 999);

      const minutes = sessions
        .filter((s) => {
          const d = new Date(s.createdAt);
          return d >= start && d <= end;
        })
        .reduce((sum, s) => sum + (s.focusTimeMinutes ?? 0), 0);

      totalMinutesAllYears += minutes;

      yearPoints.push({
        label: year.toString(),
        hours: minutes / 60,
        percentage: 0,
      });
    });

    const maxYearHours = Math.max(...yearPoints.map((p) => p.hours), 1);
    const yearChartMax = Math.max(Math.ceil(maxYearHours * 1.2), 2);

    const normalizedYears = yearPoints.map((p) => ({
      ...p,
      percentage: p.hours <= 0 ? 4 : Math.max((p.hours / yearChartMax) * 100, 8),
    }));

    this.focusSeries.set(normalizedYears);
    this.currentRangeTotalHours.set(totalMinutesAllYears / 60);

    const yearTicks: number[] = [];
    const yearStep = yearChartMax / 4;
    for (let i = 0; i <= 4; i++) {
      const value = +(i * yearStep).toFixed(0);
      yearTicks.push(value);
    }
    this.chartTicks.set(yearTicks);
  }

  private toDayKey(date: Date): string {
    return `${date.getFullYear()}-${(date.getMonth() + 1)
      .toString()
      .padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
  }

  private computeDayStreak(dayKeys: Set<string>): number {
    if (!dayKeys.size) return 0;

    // start from the most recent day that has a session
    const sorted = Array.from(dayKeys.values()).sort();
    let current = sorted[sorted.length - 1];

    let streak = 0;
    // Walk backwards while consecutive days exist in the set
    while (dayKeys.has(current)) {
      streak += 1;
      const [year, month, day] = current.split('-').map((v) => parseInt(v, 10));
      const d = new Date(year, month - 1, day);
      d.setDate(d.getDate() - 1);
      current = this.toDayKey(d);
    }

    return streak;
  }

  private isInCurrentRange(date: Date, range: RangeKey, now: Date): boolean {
    if (range === 'week') {
      const startOfWeek = new Date(now);
      const dayOfWeek = startOfWeek.getDay();
      const diffToMonday = (dayOfWeek + 6) % 7;
      startOfWeek.setDate(startOfWeek.getDate() - diffToMonday);
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      return date >= startOfWeek && date <= endOfWeek;
    }

    if (range === 'month') {
      const year = now.getFullYear();
      return date.getFullYear() === year;
    }

    // year range: include all sessions across all years
    return true;
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
    const totalMinutes = Math.round(value * 60);
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
}