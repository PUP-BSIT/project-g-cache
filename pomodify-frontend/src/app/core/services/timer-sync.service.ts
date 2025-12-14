import { Injectable, inject, signal } from '@angular/core';
import { timer, Subscription, BehaviorSubject, interval } from 'rxjs';
import { switchMap, catchError, filter, tap } from 'rxjs/operators';
import { SessionService, PomodoroSession } from './session.service';
import { NotificationService } from './notification.service';

export interface TimerState {
  remainingSeconds: number;
  isRunning: boolean;
  isPaused: boolean;
  lastSyncTime: number;
  serverTime?: number;
  drift?: number;
}

@Injectable({
  providedIn: 'root'
})
export class TimerSyncService {
  private sessionService = inject(SessionService);
  private notificationService = inject(NotificationService);

  // Timer state signals
  private _remainingSeconds = signal(0);
  private _isRunning = signal(false);
  private _isPaused = signal(false);
  private _isConnected = signal(true);
  private _lastSyncTime = signal(0);
  private _drift = signal(0);

  // Public readonly signals
  remainingSeconds = this._remainingSeconds.asReadonly();
  isRunning = this._isRunning.asReadonly();
  isPaused = this._isPaused.asReadonly();
  isConnected = this._isConnected.asReadonly();
  lastSyncTime = this._lastSyncTime.asReadonly();
  drift = this._drift.asReadonly();

  // Private state
  private currentSession: PomodoroSession | null = null;
  private activityId: number | null = null;
  private timerSub?: Subscription;
  private syncSub?: Subscription;
  private localStartTime: number = 0;
  private serverRemainingAtSync: number = 0;
  private syncInterval = 15000; // 15 seconds
  private maxDrift = 3; // 3 seconds max drift before correction

  // Storage keys
  private getStorageKey(sessionId: number): string {
    return `pomodify_timer_${sessionId}`;
  }

  /**
   * Initialize timer for a session
   */
  initializeTimer(session: PomodoroSession, activityId: number): void {
    console.log('🔄 Initializing timer sync service for session:', session.id);
    
    this.currentSession = session;
    this.activityId = activityId;
    
    // Load persisted state if available
    this.loadPersistedState();
    
    // Set initial state from session
    this.updateFromSession(session);
    
    // Start sync if session is running
    if (session.status === 'IN_PROGRESS') {
      this.startTimer();
    }
  }

  /**
   * Start the timer with sync
   */
  startTimer(): void {
    if (!this.currentSession) return;
    
    console.log('🚀 Starting timer with sync...');
    
    this._isRunning.set(true);
    this._isPaused.set(false);
    this.localStartTime = Date.now();
    this.serverRemainingAtSync = this.remainingSeconds();
    
    // Start local timer
    this.startLocalTimer();
    
    // Start periodic sync
    this.startPeriodicSync();
    
    // Persist state
    this.persistState();
  }

  /**
   * Pause the timer
   */
  pauseTimer(): void {
    console.log('⏸️ Pausing timer...');
    
    this._isRunning.set(false);
    this._isPaused.set(true);
    
    this.stopTimers();
    this.persistState();
  }

  /**
   * Stop the timer completely
   */
  stopTimer(): void {
    console.log('⏹️ Stopping timer...');
    
    this._isRunning.set(false);
    this._isPaused.set(false);
    
    this.stopTimers();
    this.clearPersistedState();
  }

  /**
   * Update timer state from session data
   */
  updateFromSession(session: PomodoroSession): void {
    this.currentSession = session;
    
    // Use server's remaining time as authoritative
    const serverRemaining = session.remainingPhaseSeconds || 0;
    this._remainingSeconds.set(serverRemaining);
    
    // Update running state
    this._isRunning.set(session.status === 'IN_PROGRESS');
    this._isPaused.set(session.status === 'PAUSED');
    
    console.log('📊 Updated from session:', {
      status: session.status,
      remainingSeconds: serverRemaining,
      phase: session.currentPhase
    });
  }

  /**
   * Force sync with backend
   */
  async forceSync(): Promise<void> {
    if (!this.currentSession || !this.activityId) return;
    
    try {
      console.log('🔄 Force syncing with backend...');
      const updated = await this.sessionService.getSession(this.activityId, this.currentSession.id).toPromise();
      
      if (updated) {
        this.handleSyncResponse(updated);
        this._isConnected.set(true);
      }
    } catch (error) {
      console.warn('❌ Force sync failed:', error);
      this._isConnected.set(false);
    }
  }

  /**
   * Get timer display string
   */
  getTimerDisplay(): string {
    const total = this.remainingSeconds();
    const mins = Math.floor(total / 60);
    const secs = total % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  /**
   * Check if timer has completed
   */
  isTimerComplete(): boolean {
    return this.remainingSeconds() <= 0 && this.isRunning();
  }

  /**
   * Set remaining seconds (for manual timer adjustments)
   */
  setRemainingSeconds(seconds: number): void {
    this._remainingSeconds.set(seconds);
    this.serverRemainingAtSync = seconds;
    this.localStartTime = Date.now();
  }

  /**
   * Cleanup when component is destroyed
   */
  cleanup(): void {
    this.stopTimers();
    this.currentSession = null;
    this.activityId = null;
  }

  // Private methods

  private startLocalTimer(): void {
    this.timerSub?.unsubscribe();
    
    this.timerSub = timer(0, 1000).subscribe(() => {
      if (!this.isRunning()) return;
      
      // Calculate local elapsed time
      const now = Date.now();
      const localElapsed = Math.floor((now - this.localStartTime) / 1000);
      const localRemaining = Math.max(0, this.serverRemainingAtSync - localElapsed);
      
      this._remainingSeconds.set(localRemaining);
      
      // Check for completion
      if (localRemaining <= 0) {
        this.handleTimerComplete();
      }
      
      // Persist state periodically
      if (localElapsed % 5 === 0) {
        this.persistState();
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
        console.warn('🔄 Sync failed:', error);
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
    
    console.log('🔄 Sync response:', {
      serverRemaining,
      localRemaining,
      drift,
      status: session.status
    });
    
    // Correct drift if significant
    if (drift > this.maxDrift) {
      console.log('⚠️ Correcting timer drift:', drift, 'seconds');
      this._remainingSeconds.set(serverRemaining);
      this.localStartTime = Date.now();
      this.serverRemainingAtSync = serverRemaining;
    }
    
    // Handle status changes
    if (session.status !== this.currentSession?.status) {
      console.log('🔄 Status changed:', this.currentSession?.status, '->', session.status);
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
    console.log('⏰ Timer completed!');
    
    this.stopTimers();
    this._remainingSeconds.set(0);
    
    // Trigger notifications
    this.triggerPhaseCompleteNotification();
  }

  private async triggerPhaseCompleteNotification(): Promise<void> {
    if (!this.currentSession) return;
    
    const currentPhase = this.currentSession.currentPhase || 'FOCUS';
    const nextPhase = currentPhase === 'FOCUS' ? 'BREAK' : 'FOCUS';
    
    const context = {
      title: `${currentPhase === 'FOCUS' ? '🧠' : '☕'} ${currentPhase} Complete!`,
      body: `Time for a ${nextPhase.toLowerCase()}!`,
      sessionId: this.currentSession.id,
      activityId: this.currentSession.activityId,
      type: 'phase-complete' as const
    };
    
    await this.notificationService.handlePhaseCompletion(context);
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
      console.warn('Failed to persist timer state:', error);
    }
  }

  private loadPersistedState(): void {
    if (!this.currentSession) return;
    
    try {
      const key = this.getStorageKey(this.currentSession.id);
      const stored = localStorage.getItem(key);
      
      if (stored) {
        const state: TimerState = JSON.parse(stored);
        console.log('📱 Loaded persisted timer state:', state);
        
        // Only use persisted state if it's recent (within 5 minutes)
        const age = Date.now() - state.lastSyncTime;
        if (age < 5 * 60 * 1000) {
          this._remainingSeconds.set(state.remainingSeconds);
          this._drift.set(state.drift || 0);
        }
      }
    } catch (error) {
      console.warn('Failed to load persisted timer state:', error);
    }
  }

  private clearPersistedState(): void {
    if (!this.currentSession) return;
    
    try {
      const key = this.getStorageKey(this.currentSession.id);
      localStorage.removeItem(key);
    } catch (error) {
      console.warn('Failed to clear persisted timer state:', error);
    }
  }
}