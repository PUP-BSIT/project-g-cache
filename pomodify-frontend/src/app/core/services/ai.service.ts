import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API } from '../config/api.config';

// Existing interfaces
export interface AiSuggestionRequest {
  activityId: number;
  currentTodos?: string[];
}

export interface AiSuggestionResponse {
  suggestedNote: string;
  motivationLevel: 'LOW' | 'MED' | 'HIGH' | string;
  isFallback: boolean;
}

// Smart-Action System interfaces
export interface GenerateBlueprintRequest {
  topic: string;
}

export interface BlueprintResponse {
  activityTitle: string;
  activityDescription: string;
  focusMinutes: number;
  breakMinutes: number;
  firstSessionNote: string;
  isFallback: boolean;
}

export interface ConfirmBlueprintRequest {
  activityTitle: string;
  activityDescription?: string;
  focusMinutes: number;
  breakMinutes: number;
  firstSessionNote?: string;
  categoryId?: number;
}

export interface ConfirmBlueprintResponse {
  message: string;
  activityId: number;
  sessionId: number;
}

@Injectable({ providedIn: 'root' })
export class AiService {
  constructor(private http: HttpClient) {}

  /**
   * Existing: Suggest next step for an activity
   */
  suggestNextStep(request: AiSuggestionRequest): Observable<AiSuggestionResponse> {
    return this.http.post<AiSuggestionResponse>(API.AI.SUGGEST, request);
  }

  /**
   * Smart-Action: Generate AI blueprint preview (stateless)
   * Returns a preview for user verification before saving
   */
  generateBlueprint(request: GenerateBlueprintRequest): Observable<BlueprintResponse> {
    return this.http.post<BlueprintResponse>(API.AI.GENERATE_PREVIEW, request);
  }

  /**
   * Smart-Action: Confirm and save the blueprint (stateful)
   * Creates Activity + first PomodoroSession in database
   */
  confirmBlueprint(request: ConfirmBlueprintRequest): Observable<ConfirmBlueprintResponse> {
    return this.http.post<ConfirmBlueprintResponse>(API.AI.CONFIRM_PLAN, request);
  }
}
