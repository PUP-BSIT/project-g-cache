import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { API } from '../config/api.config';
import { Observable } from 'rxjs';

export interface Badge {
  id: number;
  name: string;
  milestoneDays: number;
  dateAwarded: string;
  imageUrl: string;
}

@Injectable({ providedIn: 'root' })
export class BadgeService {
  constructor(private http: HttpClient) {}

  /**
   * Fetch all badges earned by the authenticated user
   * GET /api/v2/badges
   */
  getUserBadges(): Observable<Badge[]> {
    return this.http.get<Badge[]>(API.BADGES.GET_ALL);
  }
}
