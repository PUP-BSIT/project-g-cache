import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { API } from '../config/api.config';

// Session types based on backend API (STRICT ADHERENCE)
export type SessionType = 'CLASSIC' | 'FREESTYLE';
export type SessionStatus = 'PENDING' | 'IN_PROGRESS' | 'PAUSED' | 'COMPLETED';
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
  totalElapsedSeconds?: number; // Total elapsed time across all cycles
  remainingPhaseSeconds?: number; // Remaining time in current phase (from backend)
  phaseNotified?: boolean; // Whether backend sent notification for current phase
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

    saveTodos(activityId: number, sessionId: number, todos: any[]): Observable<void> {
      return this.http.post<void>(API.ACTIVITIES.SESSIONS.TODOS.SAVE(activityId, sessionId), todos);
    }

    getTodos(activityId: number, sessionId: number): Observable<any[]> {
      return this.http.get<any[]>(API.ACTIVITIES.SESSIONS.TODOS.GET(activityId, sessionId));
    }
  private http = inject(HttpClient);

  /**
   * Create a new session for an activity
   */
  createSession(activityId: number, request: CreateSessionRequest): Observable<PomodoroSession> {
    return this.http.post<SessionResponse>(API.ACTIVITIES.SESSIONS.CREATE(activityId), request).pipe(
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
    return this.http.get<SessionResponse>(API.ACTIVITIES.SESSIONS.GET_ALL(activityId), { params }).pipe(
      map(response => response.sessions)
    );
  }

  /**
   * Get a specific session
   */
  getSession(activityId: number, sessionId: number): Observable<PomodoroSession> {
    return this.http.get<SessionResponse>(API.ACTIVITIES.SESSIONS.DETAILS(activityId, sessionId)).pipe(
      map(response => extractSession(response))
    );
  }

  /**
   * Delete a session
   */
  deleteSession(activityId: number, sessionId: number): Observable<void> {
    return this.http.delete<void>(API.ACTIVITIES.SESSIONS.DELETE(activityId, sessionId));
  }

  /**
   * Start a session
   */
  startSession(activityId: number, sessionId: number): Observable<PomodoroSession> {
    return this.http.post<SessionResponse>(API.ACTIVITIES.SESSIONS.START(activityId, sessionId), null).pipe(
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
    return this.http.post<SessionResponse>(API.ACTIVITIES.SESSIONS.PAUSE(activityId, sessionId), null, { params }).pipe(
      map(response => extractSession(response))
    );
  }

  /**
   * Resume a paused session
   */
  resumeSession(activityId: number, sessionId: number): Observable<PomodoroSession> {
    return this.http.post<SessionResponse>(API.ACTIVITIES.SESSIONS.RESUME(activityId, sessionId), null).pipe(
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
    return this.http.post<SessionResponse>(API.ACTIVITIES.SESSIONS.STOP(activityId, sessionId), null, { params }).pipe(
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
    return this.http.post<SessionResponse>(API.ACTIVITIES.SESSIONS.COMPLETE_PHASE(activityId, sessionId), null, { params }).pipe(
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
    return this.http.post<SessionResponse>(API.ACTIVITIES.SESSIONS.FINISH(activityId, sessionId), null, { params }).pipe(
      map(response => extractSession(response))
    );
  }

  /**
   * Update session note
   */
  updateNote(activityId: number, sessionId: number, note: string): Observable<PomodoroSession> {
    // Always send a string for note (never undefined or null)
    const safeNote = typeof note === 'string' ? note : (note == null ? '' : String(note));
    const params = new HttpParams().set('note', safeNote);
    return this.http.put<SessionResponse>(API.ACTIVITIES.SESSIONS.UPDATE_NOTE(activityId, sessionId), null, { params }).pipe(
      map(response => extractSession(response))
    );
  }

  /**
   * Update session settings (focus time, break time, cycles, etc.)
   */
  updateSession(activityId: number, sessionId: number, updates: {
    sessionType?: SessionType;
    focusTimeInMinutes?: number;
    breakTimeInMinutes?: number;
    cycles?: number;
  }): Observable<PomodoroSession> {
    return this.http.patch<SessionResponse>(API.ACTIVITIES.SESSIONS.UPDATE(activityId, sessionId), updates).pipe(
      map(response => extractSession(response))
    );
  }

  /**
   * Connect to Server-Sent Events for real-time session updates
   */
  connectToSessionEvents(activityId: number, sessionId: number): EventSource {
    return new EventSource(API.ACTIVITIES.SESSIONS.EVENTS(activityId, sessionId));
  }
}

function extractSession(response: SessionResponse): PomodoroSession {
  if (response && Array.isArray(response.sessions) && response.sessions.length > 0) {
    const s = response.sessions[0];
    const rawStatus = (s as any).status as string;
    const normalizedStatus = (rawStatus === 'NOT_STARTED' ? 'PENDING' : rawStatus) as SessionStatus;
    const normalized = { ...s, status: normalizedStatus };
    return normalized;
  }
  // Some endpoints may return a single session object instead of array
  const anyResp = response as unknown as { session?: PomodoroSession };
  if (anyResp && anyResp.session) {
    const s = anyResp.session;
    const rawStatus = (s as any).status as string;
    const normalizedStatus = (rawStatus === 'NOT_STARTED' ? 'PENDING' : rawStatus) as SessionStatus;
    const normalized = { ...s, status: normalizedStatus };
    return normalized;
  }
  throw new Error('Session not found in response');
}
