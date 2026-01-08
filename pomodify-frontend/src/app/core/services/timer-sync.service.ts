import { Injectable, inject, signal, Injector, runInInjectionContext } from '@angular/core';
import { timer, Subscription, interval, Subject } from 'rxjs';
import { switchMap, catchError, filter } from 'rxjs/operators';
import { SessionService, PomodoroSession } from './session.service';
import { GlobalTimerService, GlobalTimerState } from './global-timer.service';
import { Logger } from './logger.service';

export interface TimerState {
  remainingSeconds: number;
  isRunning: boolean;
  isPaused: boolean;
  lastSyncTime: number;
  serverTime?: number;
  drift?: number;
}

export interface TimerCompletionEvent {
  sessionId: number;
  activityId: number;
  phase: 'FOCUS' | 'BREAK' | 'LONG_BREAK';
  activityTitle?: string;
}

@Injectable({
  providedIn: 'root'
})
export class TimerSyncService {
  private sessionService = inject(SessionService);
  private globalTimerService = inject(GlobalTimerService);

  private _remainingSeconds = signal(0);
  private _isRunning = signal(false);
  private _isPaused = signal(false);
  private _isConnected = signal(true);
  private _lastSyncTime = signal(0);
  private _drift = signal(0);
  private _currentSessionId = signal<number | null>(null);
  private _currentActivityId = signal<number | null>(null);

  remainingSeconds = this._remainingSeconds.asReadonly();
  isRunning = this._isRunning.asReadonly();
  isPaused = this._isPaused.asReadonly();
  isConnected = this._isConnected.asReadonly();
  lastSyncTime = this._lastSyncTime.asReadonly();
  drift = this._drift.asReadonly();
  currentSessionId = this._currentSessionId.asReadonly();
  currentActivityId = this._currentActivityId.asReadonly();

  private currentSession: PomodoroSession | null = null;
  private activityId: number | null = null;
  private activityTitle: string | null = null;
  private timerSub?: Subscription;
  private syncSub?: Subscription;
  private localStartTime: number = 0;
  private serverRemainingAtSync: number = 0;
  private syncInterval = 15000; 
  private maxDrift = 3; 
  private hasCustomTime = false;
  
  // Event emitter for timer completion (used for background notifications)
  private _timerComplete$ = new Subject<TimerCompletionEvent>();
  timerComplete$ = this._timerComplete$.asObservable(); 

  private getStorageKey(sessionId: number): string {
    return `pomodify_timer_${sessionId}`;
  }

  initializeTimer(session: PomodoroSession, activityId: number, activityTitle?: string): void {
    Logger.log('🔧 Initializing timer sync service:', {
      sessionId: session.id,
      status: session.status,
      currentPhase: session.currentPhase,
      remainingPhaseSeconds: session.remainingPhaseSeconds,
      focusTimeInMinutes: session.focusTimeInMinutes,
      breakTimeInMinutes: session.breakTimeInMinutes,
      longBreakTimeInMinutes: session.longBreakTimeInMinutes
    });
    
    this.currentSession = session;
    this.activityId = activityId;
    this.activityTitle = activityTitle || null;
    this._currentSessionId.set(session.id);
    this._currentActivityId.set(activityId);

    const persistedState = this.loadPersistedState();

    // CRITICAL: If session is PAUSED or COMPLETED, always use server state
    // This handles the case where backend scheduler processed phase completion
    if (session.status === 'PAUSED' || session.status === 'COMPLETED') {
      Logger.log('🔧 Session is PAUSED/COMPLETED - using server state exclusively');
      let serverRemaining = session.remainingPhaseSeconds || 0;
      
      // If server returned 0 or undefined for a PAUSED session, calculate the phase duration
      // This can happen when the backend transitions to a new phase
      if (serverRemaining <= 0 && session.status === 'PAUSED') {
        Logger.log('⚠️ Server returned 0 remainingPhaseSeconds for PAUSED session, calculating fallback');
        const phase = session.currentPhase;
        if (phase === 'FOCUS') {
          serverRemaining = (session.focusTimeInMinutes || 25) * 60;
        } else if (phase === 'LONG_BREAK') {
          serverRemaining = (session.longBreakTimeInMinutes || 15) * 60;
        } else {
          serverRemaining = (session.breakTimeInMinutes || 5) * 60;
        }
        Logger.log('⏱️ Calculated fallback duration:', serverRemaining, 'for phase:', phase);
      }
      
      Logger.log('🔧 Setting remaining seconds to:', serverRemaining);
      this._remainingSeconds.set(serverRemaining);
      this._isRunning.set(false);
      this._isPaused.set(session.status === 'PAUSED');
      // Clear any stale persisted state
      this.clearPersistedState();
      
      // Update global timer for paused state, clear for completed
      if (session.status === 'PAUSED') {
        this.updateGlobalTimer();
      } else {
        this.clearGlobalTimer();
      }
      
      Logger.log('🔧 Timer initialized. Display:', this.getTimerDisplay());
      return;
    }

    if (persistedState && persistedState.isRunning) {
      // Session is IN_PROGRESS or NOT_STARTED with persisted running state
      const age = Date.now() - persistedState.lastSyncTime;
      const elapsedSinceLastPersist = Math.floor(age / 1000);
      const adjustedRemaining = Math.max(0, persistedState.remainingSeconds - elapsedSinceLastPersist);
      
      Logger.log('Resuming running timer (persisted state):', {
        persistedRemaining: persistedState.remainingSeconds,
        elapsedSinceLastPersist,
        adjustedRemaining,
        serverStatus: session.status
      });
      
      this._remainingSeconds.set(adjustedRemaining);
      this.serverRemainingAtSync = adjustedRemaining;
      this.localStartTime = Date.now();

      this.startTimer();
    } else if (session.status === 'IN_PROGRESS') {
      this.updateFromSession(session);
      this.startTimer();
    } else if (session.status === 'NOT_STARTED' && persistedState && persistedState.remainingSeconds > 0) {
      Logger.log('Using persisted state for NOT_STARTED session:', {
        persistedRemaining: persistedState.remainingSeconds,
        serverRemaining: session.remainingPhaseSeconds
      });
      this._remainingSeconds.set(persistedState.remainingSeconds);
      this._isRunning.set(false);
      this._isPaused.set(false);
      this.clearGlobalTimer(); // Not started yet, no global timer
    } else {
      this.updateFromSession(session);
      // Clear global timer for NOT_STARTED sessions
      if (session.status === 'NOT_STARTED') {
        this.clearGlobalTimer();
      }
    }
  }

  startTimer(): void {
    if (!this.currentSession) return;
    
    Logger.log('Starting timer with sync...');
    
    this._isRunning.set(true);
    this._isPaused.set(false);
    this.localStartTime = Date.now();
    this.serverRemainingAtSync = this.remainingSeconds();

    this.startLocalTimer();
    
    this.startPeriodicSync();

    this.persistState();
    this.updateGlobalTimer();
  }

  pauseTimer(): void {
    Logger.log('⏸Pausing timer...');
    
    this._isRunning.set(false);
    this._isPaused.set(true);
    
    this.stopTimers();
    this.persistState();
    this.updateGlobalTimer();
  }

  stopTimer(): void {
    Logger.log('⏹Stopping timer...');
    
    this._isRunning.set(false);
    this._isPaused.set(false);
    
    this.stopTimers();
    this.clearPersistedState();
    this.clearGlobalTimer();
  }

  updateFromSession(session: PomodoroSession): void {
    this.currentSession = session;

    let serverRemaining = session.remainingPhaseSeconds || 0;
    
    // If server returned 0 or undefined, calculate the phase duration as fallback
    if (serverRemaining <= 0 && session.status !== 'COMPLETED') {
      Logger.log('⚠️ Server returned 0 remainingPhaseSeconds, calculating fallback');
      const phase = session.currentPhase;
      if (phase === 'FOCUS') {
        serverRemaining = (session.focusTimeInMinutes || 25) * 60;
      } else if (phase === 'LONG_BREAK') {
        serverRemaining = (session.longBreakTimeInMinutes || 15) * 60;
      } else {
        serverRemaining = (session.breakTimeInMinutes || 5) * 60;
      }
      Logger.log('⏱️ Calculated fallback duration:', serverRemaining, 'for phase:', phase);
    }
    
    this._remainingSeconds.set(serverRemaining);

    this._isRunning.set(session.status === 'IN_PROGRESS');
    this._isPaused.set(session.status === 'PAUSED');
    
    Logger.log('Updated from session:', {
      status: session.status,
      remainingSeconds: serverRemaining,
      phase: session.currentPhase
    });
  }

  async forceSync(): Promise<void> {
    if (!this.currentSession || !this.activityId) return;
    
    try {
      Logger.log('Force syncing with backend...');
      const updated = await this.sessionService.getSession(this.activityId, this.currentSession.id).toPromise();
      
      if (updated) {
        this.handleSyncResponse(updated);
        this._isConnected.set(true);
      }
    } catch (error) {
      Logger.warn('Force sync failed:', error);
      this._isConnected.set(false);
    }
  }

  getTimerDisplay(): string {
    const total = this.remainingSeconds();
    const mins = Math.floor(total / 60);
    const secs = total % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  isTimerComplete(): boolean {
    return this.remainingSeconds() <= 0 && this.isRunning();
  }

  setRemainingSeconds(seconds: number): void {
    Logger.log('⏱️ setRemainingSeconds called:', {
      newValue: seconds,
      oldValue: this._remainingSeconds(),
      isRunning: this._isRunning(),
      isPaused: this._isPaused()
    });
    this._remainingSeconds.set(seconds);
    this.serverRemainingAtSync = seconds;
    this.localStartTime = Date.now();
    this.hasCustomTime = true; 

    this.persistState();
    
    Logger.log('⏱️ After setRemainingSeconds:', {
      remainingSeconds: this._remainingSeconds(),
      display: this.getTimerDisplay()
    });
  }

  cleanup(): void {
    this.stopTimers();
    this.currentSession = null;
    this.activityId = null;
  }

  private startLocalTimer(): void {
    this.timerSub?.unsubscribe();
    
    this.timerSub = timer(0, 1000).subscribe(() => {
      if (!this.isRunning()) return;

      const now = Date.now();
      const localElapsed = Math.floor((now - this.localStartTime) / 1000);
      const localRemaining = Math.max(0, this.serverRemainingAtSync - localElapsed);
      
      this._remainingSeconds.set(localRemaining);

      if (localRemaining <= 0) {
        this.handleTimerComplete();
      }

      // Persist state and update global timer every 5 seconds
      if (localElapsed % 5 === 0) {
        this.persistState();
        this.updateGlobalTimer();
      }
    });
  }

  private startPeriodicSync(): void {
    this.syncSub?.unsubscribe();
    
    this.syncSub = interval(this.syncInterval).pipe(
      filter(() => this.isRunning()),
      switchMap(() => {
        if (!this.currentSession || !this.activityId) {
          return [];
        }
        return this.sessionService.getSession(this.activityId, this.currentSession.id);
      }),
      catchError(error => {
        Logger.warn('Sync failed:', error);
        this._isConnected.set(false);
        return [];
      })
    ).subscribe(session => {
      if (session) {
        this.handleSyncResponse(session);
        this._isConnected.set(true);
      }
    });
  }

  private handleSyncResponse(session: PomodoroSession): void {
    const serverRemaining = session.remainingPhaseSeconds || 0;
    const localRemaining = this.remainingSeconds();
    const drift = Math.abs(serverRemaining - localRemaining);
    
    this._drift.set(drift);
    this._lastSyncTime.set(Date.now());
    
    Logger.log('Sync response:', {
      serverRemaining,
      localRemaining,
      drift,
      status: session.status,
      hasCustomTime: this.hasCustomTime
    });

    // Only correct drift if it's significant AND we are not in the first few seconds of a session
    // This prevents the "jump" when the server is slightly behind the client start
    const isJustStarted = (this.currentSession?.status === 'IN_PROGRESS' && session.status === 'IN_PROGRESS' && serverRemaining > 55);
    
    if (drift > this.maxDrift && !this.hasCustomTime && !isJustStarted) {
      Logger.log('Correcting timer drift:', drift, 'seconds');
      this._remainingSeconds.set(serverRemaining);
      this.localStartTime = Date.now();
      this.serverRemainingAtSync = serverRemaining;
    } else if (drift > this.maxDrift && this.hasCustomTime) {
      Logger.log('Skipping drift correction - user has custom time set');
    } else if (isJustStarted) {
      Logger.log('Skipping drift correction - session just started');
    }

    if (session.status !== this.currentSession?.status) {
      Logger.log('Status changed:', this.currentSession?.status, '->', session.status);
      this.updateFromSession(session);
      
      if (session.status === 'PAUSED') {
        this.pauseTimer();
      } else if (session.status === 'IN_PROGRESS' && !this.isRunning()) {
        this.startTimer();
      }
    }
    
    this.currentSession = session;
  }

  private handleTimerComplete(): void {
    Logger.log('🔔 Timer completed! Current state:', {
      remainingSeconds: this._remainingSeconds(),
      isRunning: this._isRunning(),
      isPaused: this._isPaused(),
      sessionId: this.currentSession?.id,
      activityId: this.activityId,
      hasCurrentSession: !!this.currentSession
    });
    
    this.stopTimers();
    this._remainingSeconds.set(0);
    
    // CRITICAL: Only emit timer completion event if tab is visible
    // When tab is hidden, backend scheduler will handle phase completion and send FCM
    // This prevents race conditions where frontend completes phase before backend can notify
    if (document.hidden) {
      Logger.log('🔔 Tab hidden - NOT emitting timer completion event (backend scheduler will handle)');
      // Also pause the timer to prevent it from going negative
      this._isRunning.set(false);
      this._isPaused.set(true);
      return;
    }
    
    // Emit timer completion event for background notification handling
    if (this.currentSession && this.activityId) {
      const event: TimerCompletionEvent = {
        sessionId: this.currentSession.id,
        activityId: this.activityId,
        phase: (this.currentSession.currentPhase || 'FOCUS') as 'FOCUS' | 'BREAK' | 'LONG_BREAK',
        activityTitle: this.activityTitle || undefined
      };
      Logger.log('🔔 Emitting timer completion event:', event);
      this._timerComplete$.next(event);
    } else {
      Logger.warn('🔔 Cannot emit timer completion event - missing session or activityId:', {
        hasSession: !!this.currentSession,
        activityId: this.activityId
      });
    }
    
    // Note: Notification is handled by subscribers to timerComplete$
    // session-timer.ts subscribes when on the page, app.component or notification service handles background
  }

  private stopTimers(): void {
    this.timerSub?.unsubscribe();
    this.syncSub?.unsubscribe();
  }

  private persistState(): void {
    if (!this.currentSession) return;
    
    const state: TimerState = {
      remainingSeconds: this.remainingSeconds(),
      isRunning: this.isRunning(),
      isPaused: this.isPaused(),
      lastSyncTime: Date.now(),
      serverTime: this.serverRemainingAtSync,
      drift: this.drift()
    };
    
    try {
      const key = this.getStorageKey(this.currentSession.id);
      localStorage.setItem(key, JSON.stringify(state));
    } catch (error) {
      Logger.warn('Failed to persist timer state:', error);
    }
  }

  private loadPersistedState(): TimerState | null {
    if (!this.currentSession) return null;
    
    try {
      const key = this.getStorageKey(this.currentSession.id);
      const stored = localStorage.getItem(key);
      
      if (stored) {
        const state: TimerState = JSON.parse(stored);
        Logger.log('Loaded persisted timer state:', state);

        const age = Date.now() - state.lastSyncTime;
        if (age < 5 * 60 * 1000) {
          this._remainingSeconds.set(state.remainingSeconds);
          this._drift.set(state.drift || 0);
          this._isPaused.set(state.isPaused);
          this._isRunning.set(state.isRunning);
          return state;
        }
      }
    } catch (error) {
      Logger.warn('Failed to load persisted timer state:', error);
    }
    return null;
  }

  private clearPersistedState(): void {
    if (!this.currentSession) return;
    
    try {
      const key = this.getStorageKey(this.currentSession.id);
      localStorage.removeItem(key);
    } catch (error) {
      Logger.warn('Failed to clear persisted timer state:', error);
    }
  }

  /**
   * Update the global timer service with current state
   * This enables the header timer indicator to show on all pages
   */
  private updateGlobalTimer(): void {
    if (!this.currentSession || !this.activityId) {
      return;
    }

    const state: GlobalTimerState = {
      sessionId: this.currentSession.id,
      activityId: this.activityId,
      activityTitle: this.activityTitle || '',
      remainingSeconds: this.remainingSeconds(),
      isRunning: this.isRunning(),
      isPaused: this.isPaused(),
      currentPhase: (this.currentSession.currentPhase || 'FOCUS') as 'FOCUS' | 'BREAK' | 'LONG_BREAK',
      lastUpdate: Date.now()
    };

    this.globalTimerService.updateTimerState(state);
  }

  /**
   * Clear the global timer state
   */
  private clearGlobalTimer(): void {
    this.globalTimerService.clearTimerState();
  }
}