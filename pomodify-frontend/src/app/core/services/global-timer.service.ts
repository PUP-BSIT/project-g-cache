import { Injectable, inject, signal, computed, OnDestroy, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser, DOCUMENT } from '@angular/common';
import { interval, Subscription, Subject } from 'rxjs';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';

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
      
      // Update browser tab title when navigating away from session page
      // (session-timer handles its own title when on that page)
      if (!onSessionPage) {
        this.updateBrowserTitle();
      }
    });
    
    // Check initial route
    this._isOnSessionPage.set(this.router.url.includes('/sessions/') && !this.router.url.endsWith('/sessions'));
    
    // Load any persisted timer state on init
    this.loadPersistedState();
    
    // Start tick interval to update remaining time and browser title
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
    
    // Update browser title if not on session page
    if (!this._isOnSessionPage()) {
      this.updateBrowserTitle();
    }
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
   * Update the browser tab title with timer info
   */
  private updateBrowserTitle(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    
    const state = this._timerState();
    
    if (state && (state.isRunning || state.isPaused)) {
      const m = Math.floor(state.remainingSeconds / 60);
      const s = state.remainingSeconds % 60;
      const timeDisplay = `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
      
      // Phase emoji
      const phaseEmoji = state.currentPhase === 'FOCUS' ? '🎯' : '☕';
      
      // Pause indicator
      const pauseIcon = state.isPaused ? '⏸ ' : '';
      
      // Format: "⏸ 16:11 🎯 Pomodify" or "16:11 ☕ Pomodify"
      this.document.title = `${pauseIcon}${timeDisplay} ${phaseEmoji} Pomodify`;
    } else {
      this.document.title = this.originalTitle;
    }
  }

  private startTicking(): void {
    this.tickSub = interval(1000).subscribe(() => {
      const state = this._timerState();
      if (state && state.isRunning && state.remainingSeconds > 0) {
        // Decrement locally
        this._timerState.update(s => s ? { ...s, remainingSeconds: Math.max(0, s.remainingSeconds - 1) } : null);
        
        // Update browser title if not on session page
        if (!this._isOnSessionPage()) {
          this.updateBrowserTitle();
        }
      }
    });
  }

  private persistState(state: GlobalTimerState): void {
    try {
      localStorage.setItem('pomodify_global_timer', JSON.stringify(state));
    } catch (e) {
      console.warn('Failed to persist global timer state:', e);
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
          
          // Update browser title on load
          if (!this._isOnSessionPage()) {
            this.updateBrowserTitle();
          }
        } else {
          this.clearPersistedState();
        }
      }
    } catch (e) {
      console.warn('Failed to load global timer state:', e);
    }
  }

  private clearPersistedState(): void {
    try {
      localStorage.removeItem('pomodify_global_timer');
    } catch (e) {
      console.warn('Failed to clear global timer state:', e);
    }
  }
}
