import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface RecentActivity {
  activityId: number;
  activityTitle: string;
  lastSession: {
    sessionId: number;
    startTime: string;
    endTime: string;
    status: string;
  };
}

export interface DashboardMetrics {
  totalCompletedSessions: number;
  totalFocusTime: number;
  weeklyFocusDistribution: Record<string, number>;
  recentActivities: RecentActivity[];
}

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly API_URL = '/api/v1/dashboard';

  constructor(private http: HttpClient) {}

  /**
   * Fetch dashboard metrics from API
   * @param timezone - User's timezone (e.g., "Asia/Manila")
   * @returns Observable of DashboardMetrics
   */
  getDashboard(timezone: string = 'Asia/Manila'): Observable<DashboardMetrics> {
    const headers = new HttpHeaders({
      'X-Timezone': timezone,
      'Content-Type': 'application/json'
    });

    return this.http.get<DashboardMetrics>(this.API_URL, { headers });
  }

  /**
   * Get user's system timezone
   * @returns Timezone string (e.g., "Asia/Manila")
   */
  getUserTimezone(): string {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  }
}
