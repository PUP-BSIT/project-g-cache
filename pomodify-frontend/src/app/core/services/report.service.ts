import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export enum ReportRange {
  WEEK = 'week',
  MONTH = 'month',
  YEAR = 'year',
}

type SummaryItemMeta = {
  range: string;
  startDate: string;
  endDate: string;
};

type SummaryItemMetrics = {
  totalFocusedHours: number;
  completionRate: number;
  avgSessionMinutes: number;
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

export type SummaryItem = {
  meta: SummaryItemMeta;
  metrics: SummaryItemMetrics;
  chartData: SummaryItemChartData;
  recentSessions: RecentSession[];
  topActivities: TopActivity[];
};

type SummaryResponse = {
  message: string;
  item: SummaryItem;
};

@Injectable({
  providedIn: 'root',
})
export class ReportService {
  private readonly baseUrl: string;

  constructor(private http: HttpClient) {
    this.baseUrl = environment.apiUrl.replace('/api/v1/report/summary', '/api/reports');
  }

  getSummary(range: ReportRange): Observable<SummaryItem> {
    const token = localStorage.getItem('accessToken');

    const headers = token
      ? new HttpHeaders({
          Authorization: `Bearer ${token}`,
        })
      : undefined;

    const params = new HttpParams().set('range', range);
    return this.http
      .get<SummaryResponse>(`${this.baseUrl}/summary`, { params, headers })
      .pipe(map((response: SummaryResponse) => response.item));
  }
}