import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

// Session types based on backend API
export type SessionType = 'POMODORO' | 'CLASSIC' | 'FREESTYLE';
export type SessionStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'PAUSED' | 'COMPLETED' | 'CANCELED';
export type SessionPhase = 'FOCUS' | 'BREAK';

export interface PomodoroSession {
  id: number;
  activityId: number;
  sessionType: SessionType;
  status: SessionStatus;
  focusTimeInMinutes: number;
  breakTimeInMinutes: number;
  cycles: number;
  currentPhase: SessionPhase | null;
  cyclesCompleted: number;
  note: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateSessionRequest {
  sessionType: SessionType;
  focusTimeInMinutes: number;
  breakTimeInMinutes: number;
  cycles: number;
  note?: string;
}

export interface SessionResponse {
  message: string;
  sessions: PomodoroSession[];
  currentPage: number;
  totalPages: number;
  totalItems: number;
}

export interface PhaseChangeEvent {
  sessionId: number;
  currentPhase: SessionPhase;
  cyclesCompleted: number;
  totalCycles: number;
  status: SessionStatus;
  timestamp: string;
}

@Injectable({
  providedIn: 'root'
})
export class SessionService {
  private http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/activities`;

  /**
   * Create a new session for an activity
   */
  createSession(activityId: number, request: CreateSessionRequest): Observable<PomodoroSession> {
    return this.http.post<SessionResponse>(`${this.baseUrl}/${activityId}/sessions`, request).pipe(
      map(response => extractSession(response))
    );
  }

  /**
   * Get all sessions for an activity
   */
  getSessions(activityId: number, status?: SessionStatus): Observable<PomodoroSession[]> {
    let params = new HttpParams();
    if (status) {
      params = params.set('status', status);
    }
    return this.http.get<SessionResponse>(`${this.baseUrl}/${activityId}/sessions`, { params }).pipe(
      map(response => response.sessions)
    );
  }

  /**
   * Get a specific session
   */
  getSession(activityId: number, sessionId: number): Observable<PomodoroSession> {
    return this.http.get<SessionResponse>(`${this.baseUrl}/${activityId}/sessions/${sessionId}`).pipe(
      map(response => extractSession(response))
    );
  }

  /**
   * Delete a session
   */
  deleteSession(activityId: number, sessionId: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${activityId}/sessions/${sessionId}`);
  }

  /**
   * Start a session
   */
  startSession(activityId: number, sessionId: number): Observable<PomodoroSession> {
    return this.http.post<SessionResponse>(`${this.baseUrl}/${activityId}/sessions/${sessionId}/start`, null).pipe(
      map(response => extractSession(response))
    );
  }

  /**
   * Pause a session
   */
  pauseSession(activityId: number, sessionId: number, note?: string): Observable<PomodoroSession> {
    let params = new HttpParams();
    if (note) {
      params = params.set('note', note);
    }
    return this.http.post<SessionResponse>(`${this.baseUrl}/${activityId}/sessions/${sessionId}/pause`, null, { params }).pipe(
      map(response => extractSession(response))
    );
  }

  /**
   * Resume a paused session
   */
  resumeSession(activityId: number, sessionId: number): Observable<PomodoroSession> {
    return this.http.post<SessionResponse>(`${this.baseUrl}/${activityId}/sessions/${sessionId}/resume`, null).pipe(
      map(response => extractSession(response))
    );
  }

  /**
   * Stop the current cycle (invalidates current cycle)
   */
  stopSession(activityId: number, sessionId: number, note?: string): Observable<PomodoroSession> {
    let params = new HttpParams();
    if (note) {
      params = params.set('note', note);
    }
    return this.http.post<SessionResponse>(`${this.baseUrl}/${activityId}/sessions/${sessionId}/stop`, null, { params }).pipe(
      map(response => extractSession(response))
    );
  }

  /**
   * Cancel the entire session (invalidates all cycles)
   */
  cancelSession(activityId: number, sessionId: number): Observable<PomodoroSession> {
    return this.http.post<SessionResponse>(`${this.baseUrl}/${activityId}/sessions/${sessionId}/cancel`, null).pipe(
      map(response => extractSession(response))
    );
  }

  /**
   * Complete the current phase (FOCUS or BREAK)
   */
  completePhase(activityId: number, sessionId: number, note?: string): Observable<PomodoroSession> {
    let params = new HttpParams();
    if (note) {
      params = params.set('note', note);
    }
    return this.http.post<SessionResponse>(`${this.baseUrl}/${activityId}/sessions/${sessionId}/complete-phase`, null, { params }).pipe(
      map(response => extractSession(response))
    );
  }

  /**
   * Finish the session (mark as completed)
   */
  finishSession(activityId: number, sessionId: number, note?: string): Observable<PomodoroSession> {
    let params = new HttpParams();
    if (note) {
      params = params.set('note', note);
    }
    return this.http.post<SessionResponse>(`${this.baseUrl}/${activityId}/sessions/${sessionId}/finish`, null, { params }).pipe(
      map(response => extractSession(response))
    );
  }

  /**
   * Update session note
   */
  updateNote(activityId: number, sessionId: number, note: string): Observable<PomodoroSession> {
    const params = new HttpParams().set('note', note);
    return this.http.put<SessionResponse>(`${this.baseUrl}/${activityId}/sessions/${sessionId}/note`, null, { params }).pipe(
      map(response => extractSession(response))
    );
  }

  /**
   * Connect to Server-Sent Events for real-time session updates
   */
  connectToSessionEvents(activityId: number, sessionId: number): EventSource {
    return new EventSource(`${this.baseUrl}/${activityId}/sessions/${sessionId}/events`);
  }
}

function extractSession(response: SessionResponse): PomodoroSession {
  if (response && Array.isArray(response.sessions) && response.sessions.length > 0) {
    return response.sessions[0];
  }
  // Some endpoints may return a single session object instead of array
  const anyResp = response as unknown as { session?: PomodoroSession };
  if (anyResp && anyResp.session) {
    return anyResp.session;
  }
  throw new Error('Session not found in response');
}
