import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../../environments/environment';
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
  private readonly API_URL = `${environment.apiUrl}/dashboard`;

  constructor(private http: HttpClient) {
    console.log('[DashboardService] Initialized with API URL:', this.API_URL);
  }

  /**
   * Fetch dashboard metrics from API
   * GET /api/v1/dashboard
   * Required headers:
   * - Authorization: Bearer <accessToken> (added by auth-token interceptor)
   * - X-Timezone: User's timezone for proper date calculations
   * 
   * @param timezone - User's timezone (e.g., "Asia/Manila", "UTC")
   * @returns Observable of DashboardMetrics
   */
  getDashboard(timezone: string = 'Asia/Manila'): Observable<DashboardMetrics> {
    const headers = new HttpHeaders({ 'X-Timezone': timezone });
    console.log('[DashboardService] Fetching dashboard with timezone:', timezone);
    return this.http.get<DashboardMetrics>(this.API_URL, { headers });
  }

  /**
   * Get user's system timezone using Intl API
   * @returns Timezone string (e.g., "Asia/Manila", "America/New_York")
   */
  getUserTimezone(): string {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch (error) {
      console.warn('[DashboardService] Failed to get system timezone, using default:', error);
      return 'Asia/Manila';
    }
  }
}
