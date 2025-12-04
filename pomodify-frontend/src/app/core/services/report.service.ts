import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export type ReportRange = 'week' | 'month' | 'year';

export interface SummaryItem {
  meta: {
    range: string;
    startDate: string;
    endDate: string;
  };
  metrics: {
    totalFocusedHours: number;
    completionRate: number;
    avgSessionMinutes: number;
  };
  chartData: {
    labels: string[];
    datasets: {
      focus: number[];
      breakHours: number[];
    };
  };
  recentSessions: {
    id: number;
    activityName: string;
    date: string;
    focusDurationMinutes: number;
    breakDurationMinutes: number;
    status: string;
    mode: string;
  }[];
  topActivities: {
    rank: number;
    name: string;
    totalDurationMinutes: number;
    sessionCount: number;
  }[];
}

interface SummaryResponse {
  message: string;
  item: SummaryItem;
}

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
      .pipe(map((response) => response.item));
  }
}


