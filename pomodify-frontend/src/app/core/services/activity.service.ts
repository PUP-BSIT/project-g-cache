import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface SessionData {
  id: string;
  focusTimeMinutes: number;
  breakTimeMinutes: number;
  note?: string;
  createdAt: string;
}

export interface ActivityData {
  id: string;
  name: string;
  icon: string;
  category: string;
  colorTag: string;
  estimatedHoursPerWeek: number;
  lastAccessed: string;
  sessions: SessionData[];
}

export interface CreateActivityRequest {
  name: string;
  icon: string;
  category?: string;
  colorTag: string;
  estimatedHoursPerWeek: number;
}

export interface UpdateActivityRequest {
  name?: string;
  icon?: string;
  category?: string;
  colorTag?: string;
  estimatedHoursPerWeek?: number;
}

export interface AddSessionRequest {
  focusTimeMinutes: number;
  breakTimeMinutes: number;
  note?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ActivityService {
  private http = inject(HttpClient);
  private readonly baseUrl = '/api/v1/activities';

  /**
   * Fetch all activities for the current user
   */
  getAllActivities(): Observable<ActivityData[]> {
    return this.http.get<ActivityData[]>(this.baseUrl).pipe(
      map(activities => activities || [])
    );
  }

  /**
   * Fetch a specific activity by ID
   */
  getActivity(activityId: string): Observable<ActivityData> {
    return this.http.get<ActivityData>(`${this.baseUrl}/${activityId}`);
  }

  /**
   * Create a new activity
   */
  createActivity(request: CreateActivityRequest): Observable<ActivityData> {
    return this.http.post<ActivityData>(this.baseUrl, request);
  }

  /**
   * Update an existing activity
   */
  updateActivity(activityId: string, request: UpdateActivityRequest): Observable<ActivityData> {
    return this.http.put<ActivityData>(`${this.baseUrl}/${activityId}`, request);
  }

  /**
   * Delete an activity
   */
  deleteActivity(activityId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${activityId}`);
  }

  /**
   * Add a session to an activity
   */
  addSession(activityId: string, request: AddSessionRequest): Observable<SessionData> {
    return this.http.post<SessionData>(`${this.baseUrl}/${activityId}/sessions`, request);
  }

  /**
   * Update a session
   */
  updateSession(activityId: string, sessionId: string, request: Partial<AddSessionRequest>): Observable<SessionData> {
    return this.http.put<SessionData>(`${this.baseUrl}/${activityId}/sessions/${sessionId}`, request);
  }

  /**
   * Delete a session
   */
  deleteSession(activityId: string, sessionId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${activityId}/sessions/${sessionId}`);
  }
}
