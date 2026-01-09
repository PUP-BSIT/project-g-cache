import { Injectable, inject, signal, computed, OnDestroy, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser, DOCUMENT } from '@angular/common';
import { interval, Subscription } from 'rxjs';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { Logger } from './logger.service';

export interface GlobalTimerState {
  sessionId: number;
  activityId: number;
  activityTitle: string;
  remainingSeconds: number;
  isRunning: boolean;
  isPaused: boolean;
  currentPhase: 'FOCUS' | 'BREAK' | 'LONG_BREAK';
  lastUpdate: number;
}

@Injectable({
  providedIn: 'root'
})
export class GlobalTimerService implements OnDestroy {
  private router = inject(Router);
  private platformId = inject(PLATFORM_ID);
  private document = inject(DOCUMENT);
  
  private _timerState = signal<GlobalTimerState | null>(null);
  private _isOnSessionPage = signal(false);
  
  private tickSub?: Subscription;
  private routerSub?: Subscription;
  
  private readonly originalTitle = 'Pomodify';
  
  // Public readonly signals
  timerState = this._timerState.asReadonly();
  isOnSessionPage = this._isOnSessionPage.asReadonly();
  
  // Computed: formatted time display
  timerDisplay = computed(() => {
    const state = this._timerState();
    if (!state) return '00:00';
    const m = Math.floor(state.remainingSeconds / 60);
    const s = state.remainingSeconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  });
  
  // Computed: phase label
  phaseLabel = computed(() => {
    const state = this._timerState();
    if (!state) return '';
    switch (state.currentPhase) {
      case 'FOCUS': return 'Focus';
      case 'BREAK': return 'Break';
      case 'LONG_BREAK': return 'Long Break';
      default: return '';
    }
  });

  constructor() {
    // Track route changes to know if we're on session page
    this.routerSub = this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: NavigationEnd) => {
      const onSessionPage = event.url.includes('/sessions/') && !event.url.endsWith('/sessions');
      this._isOnSessionPage.set(onSessionPage);
      
      // When navigating AWAY from session page, restore original title
      // Timer in title tab should ONLY be visible on the session timer page
      // Use setTimeout to ensure this runs AFTER any component effects
      if (!onSessionPage) {
        setTimeout(() => this.restoreOriginalTitle(), 0);
      }
    });
    
    // Check initial route and set title accordingly
    const initialOnSessionPage = this.router.url.includes('/sessions/') && !this.router.url.endsWith('/sessions');
    this._isOnSessionPage.set(initialOnSessionPage);
    
    // If not on session page initially, ensure title is correct
    if (!initialOnSessionPage) {
      this.restoreOriginalTitle();
    }
    
    // Load any persisted timer state on init
    this.loadPersistedState();
    
    // Start tick interval to update remaining time (title is handled by session-timer component)
    this.startTicking();
  }

  ngOnDestroy(): void {
    this.tickSub?.unsubscribe();
    this.routerSub?.unsubscribe();
    
    // Restore original title
    if (isPlatformBrowser(this.platformId)) {
      this.document.title = this.originalTitle;
    }
  }

  /**
   * Update the global timer state (called from TimerSyncService)
   */
  updateTimerState(state: GlobalTimerState): void {
    this._timerState.set(state);
    this.persistState(state);
    
    // Do NOT update browser title here
    // Timer in title tab should ONLY be visible on the session timer page
    // session-timer component handles its own title
  }

  /**
   * Clear the timer state (when session ends or is abandoned)
   */
  clearTimerState(): void {
    this._timerState.set(null);
    this.clearPersistedState();
    
    // Restore original title
    if (isPlatformBrowser(this.platformId)) {
      this.document.title = this.originalTitle;
    }
  }

  /**
   * Navigate to the active session
   */
  navigateToSession(): void {
    const state = this._timerState();
    if (state) {
      this.router.navigate(['/activities', state.activityTitle, 'sessions', state.sessionId]);
    }
  }

  /**
   * Restore the original browser tab title
   * Used when navigating away from session timer page
   */
  private restoreOriginalTitle(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.document.title = this.originalTitle;
    }
  }

  private startTicking(): void {
    this.tickSub = interval(1000).subscribe(() => {
      const state = this._timerState();
      if (state && state.isRunning && state.remainingSeconds > 0) {
        // Decrement locally
        this._timerState.update(s => s ? { ...s, remainingSeconds: Math.max(0, s.remainingSeconds - 1) } : null);
      }
      
      // ALWAYS ensure title is correct when NOT on session page
      // This overrides any stale effects from session-timer component
      if (!this._isOnSessionPage() && isPlatformBrowser(this.platformId)) {
        this.document.title = this.originalTitle;
      }
    });
  }

  private persistState(state: GlobalTimerState): void {
    try {
      localStorage.setItem('pomodify_global_timer', JSON.stringify(state));
    } catch (e) {
      Logger.warn('Failed to persist global timer state:', e);
    }
  }

  private loadPersistedState(): void {
    try {
      const stored = localStorage.getItem('pomodify_global_timer');
      if (stored) {
        const state: GlobalTimerState = JSON.parse(stored);
        const age = Date.now() - state.lastUpdate;
        
        // Only restore if less than 5 minutes old
        if (age < 5 * 60 * 1000) {
          // Adjust remaining time based on elapsed time if running
          if (state.isRunning) {
            const elapsedSeconds = Math.floor(age / 1000);
            state.remainingSeconds = Math.max(0, state.remainingSeconds - elapsedSeconds);
          }
          this._timerState.set(state);
          
          // Do NOT update browser title on load
          // Timer in title should ONLY show on session timer page
        } else {
          this.clearPersistedState();
        }
      }
    } catch (e) {
      Logger.warn('Failed to load global timer state:', e);
    }
  }

  private clearPersistedState(): void {
    try {
      localStorage.removeItem('pomodify_global_timer');
    } catch (e) {
      Logger.warn('Failed to clear global timer state:', e);
    }
  }
}
