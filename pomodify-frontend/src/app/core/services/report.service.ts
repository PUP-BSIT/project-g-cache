import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { API } from '../config/api.config';

export enum ReportRange {
  WEEK = 'week',
  MONTH = 'month',
  YEAR = 'year',
}

type Period = {
  startDate: string;
  endDate: string;
  range: string;
};

type Overview = {
  totalFocusHours: number;
  totalBreakHours: number;
  completionRate: number;
  sessionsCount: number;
  averageSessionLengthMinutes: number;
  dailyAverageFocusHours?: number; 
  streakDays?: number; 
};

type SummaryItemChartData = {
  labels: string[];
  datasets: {
    focus: number[];
    breakHours: number[];
  };
};

type RecentSession = {
  id: number;
  activityName: string;
  date: string;
  focusDurationMinutes: number;
  breakDurationMinutes: number;
  status: string;
  mode: string;
};

type TopActivity = {
  rank: number;
  name: string;
  totalDurationMinutes: number;
  sessionCount: number;
};

type TrendMetric = {
  current: number;
  previous: number;
  changePercent: number;
};

type Trends = {
  focusHours: TrendMetric;
  completionRate: TrendMetric;
};

type Insight = {
  type: 'positive' | 'warning' | 'info';
  severity: 'low' | 'medium' | 'high';
  message: string;
  actionable: string;
};

export type SummaryItem = {
  period: Period;
  overview: Overview;
  chartData: SummaryItemChartData;
  trends: Trends;
  insights: Insight[];
  recentSessions: RecentSession[];
  topActivities: TopActivity[];
  lastMonthAbandonedSessions: number;
};

type SummaryResponse = {
  message: string;
  item: SummaryItem;
};

@Injectable({
  providedIn: 'root',
})
export class ReportService {
  constructor(private http: HttpClient) {}

  getSummary(range: ReportRange): Observable<SummaryItem> {
    const params = new HttpParams().set('range', range);
    return this.http
      .get<SummaryResponse>(API.REPORTS.SUMMARY, { params, withCredentials: true })
      .pipe(
        map((response: any) => {
          // Handle both response.item (legacy) and response.report (current API spec)
          return response.item || response.report || response;
        })
      );
  }
}