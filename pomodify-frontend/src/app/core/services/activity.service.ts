import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { API } from '../config/api.config';

// Activity interfaces matching backend API
export interface ActivityData {
  activityId: number;
  categoryId?: number;
  activityTitle: string;
  activityDescription: string;
  categoryName?: string;
  color?: string;
  createdAt?: string;
  updatedAt?: string;
  completionRate?: number; // Added: completion rate from backend
}

export interface ActivityResponse {
  message: string;
  activities: ActivityData[];
  currentPage: number;
  totalPages: number;
  totalItems: number;
}

export interface CreateActivityRequest {
  title: string;
  description: string;
  categoryId?: number;
  color?: string;
}

export interface UpdateActivityRequest {
  newActivityTitle?: string;
  newActivityDescription?: string;
  newCategoryId?: number;
  newColor?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ActivityService {
  private http = inject(HttpClient);
  private readonly baseUrl = API.ACTIVITIES.BASE;

  /**
   * Fetch all activities for the current user with pagination
   */
  getAllActivities(page: number = 0, size: number = 100, sortOrder: 'asc' | 'desc' = 'desc', sortBy: string = 'title', categoryId?: number): Observable<ActivityResponse> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString())
      .set('sortOrder', sortOrder)
      .set('sortBy', sortBy);
    
    if (categoryId !== undefined) {
      params = params.set('categoryId', categoryId.toString());
    }

    return this.http.get<ActivityResponse>(this.baseUrl, { params });
  }

  /**
   * Fetch a specific activity by ID
   */
  getActivity(activityId: number): Observable<ActivityData> {
    return this.http.get<ActivityResponse>(`${this.baseUrl}/${activityId}`).pipe(
      map(response => (response?.activities && response.activities.length > 0) ? response.activities[0] : ({} as ActivityData))
    );
  }

  /**
   * Create a new activity
   */
  createActivity(request: CreateActivityRequest): Observable<ActivityData> {
    return this.http.post<ActivityResponse>(this.baseUrl, request).pipe(
      map(response => (response?.activities && response.activities.length > 0) ? response.activities[0] : ({} as ActivityData))
    );
  }

  /**
   * Update an existing activity
   */
  updateActivity(activityId: number, request: UpdateActivityRequest): Observable<ActivityData> {
    return this.http.put<ActivityResponse>(`${this.baseUrl}/${activityId}`, request).pipe(
      map(response => (response?.activities && response.activities.length > 0) ? response.activities[0] : ({} as ActivityData))
    );
  }

  /**
   * Delete an activity (soft delete)
   */
  deleteActivity(activityId: number): Observable<ActivityData> {
    return this.http.delete<ActivityResponse>(`${this.baseUrl}/${activityId}`).pipe(
      map(response => (response?.activities && response.activities.length > 0) ? response.activities[0] : ({} as ActivityData))
    );
  }

  /**
   * Get deleted activities
   */
  getDeletedActivities(page: number = 0, size: number = 10): Observable<ActivityResponse> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());
    
    return this.http.get<ActivityResponse>(`${this.baseUrl}/deleted`, { params });
  }
}
