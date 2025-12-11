import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { API } from '../config/api.config';
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
  currentStreak: number;
  bestStreak: number;
  totalActivities: number;
  totalSessions: number;
  focusHoursToday: number;
  focusHoursThisWeek: number;
  focusHoursAllTime: number;
  recentSessions: RecentSession[];
}

export interface RecentSession {
  id: number;
  activityId: number;
  activityName: string;
  completedAt: string;
  cyclesCompleted: number;
  focusHours: number;
}

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly API_URL = API.DASHBOARD.GET_DATA;

  constructor(private http: HttpClient) {
    console.log('[DashboardService] Initialized with API URL:', this.API_URL);
  }

  /**
   * Fetch dashboard metrics from API
   * GET /api/v2/dashboard
   * Required headers:
   * - Authorization: Bearer <accessToken> (added by auth-token interceptor)
   * - X-Timezone: User's timezone for proper date calculations
   * 
   * @param timezone - User's timezone (e.g., "Asia/Manila", "UTC")
   * @returns Observable of DashboardMetrics
   */
  getDashboard(timezone: string = 'Asia/Manila'): Observable<DashboardMetrics> {
    // Note: Removing X-Timezone header to avoid CORS policy errors
    // Backend should use user's stored timezone preference
    console.log('[DashboardService] Fetching dashboard (timezone handling on backend)');
    return this.http.get<DashboardMetrics>(this.API_URL);
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
