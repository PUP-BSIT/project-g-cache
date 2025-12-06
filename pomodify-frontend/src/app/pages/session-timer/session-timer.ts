import { 
  Component, 
  input, 
  signal, 
  computed, 
  effect,
  inject,
  afterNextRender,
  OnDestroy,
  numberAttribute,
  PLATFORM_ID
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { timer, Subscription, of } from 'rxjs';
import { switchMap, catchError, filter } from 'rxjs/operators';
import { SessionService, PomodoroSession } from '../../core/services/session.service';
import { ActivityService } from '../../core/services/activity.service';
import { MatDialog } from '@angular/material/dialog';
import { TimePickerModalComponent, TimePickerData } from '../../shared/components/time-picker-modal/time-picker-modal';
import { ConfirmDialogComponent, ConfirmDialogData } from '../../shared/components/confirm-dialog/confirm-dialog';
import { Auth } from '../../core/services/auth';
import { HttpErrorResponse } from '@angular/common/http';

/**
 * Session Timer Page - Main timer interface for Pomodoro sessions
 * Features: Drift-proof timer, editable time (PENDING only), SSR-safe, real-time phase tracking
 */
@Component({
  selector: 'app-session-timer',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './session-timer.html',
  styleUrls: ['./session-timer.scss']
})
export class SessionTimerComponent implements OnDestroy {
  // Route params via Component Input Binding
  sessionId = input.required({ transform: numberAttribute });
  activityTitle = input.required<string>();

  // Injected services
  private sessionService = inject(SessionService);
  private activityService = inject(ActivityService);
  protected router = inject(Router);
  private dialog = inject(MatDialog);
  private auth = inject(Auth);
  private platformId = inject(PLATFORM_ID);

  // State signals
  session = signal<PomodoroSession | null>(null);
  activityId = signal<number | null>(null);
  loading = signal(true);
  error = signal<string | null>(null);

  // Timer state
  currentPhase = computed(() => this.session()?.currentPhase || 'FOCUS');
  remainingSeconds = signal(0);
  isPaused = computed(() => this.session()?.status === 'PAUSED');
  isRunning = computed(() => this.session()?.status === 'IN_PROGRESS');
  isPending = computed(() => this.session()?.status === 'PENDING');
  isCompleted = computed(() => this.session()?.status === 'COMPLETED');
  
  // Track when current phase started (for calculating elapsed time)
  private phaseStartTimestamp: number | null = null;
  private pausedElapsedSeconds: number = 0;

  // Timer display (MM:SS format)
  timerDisplay = computed(() => {
    const total = this.remainingSeconds();
    const mins = Math.floor(total / 60);
    const secs = total % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  });

  // Focus and Break time displays (for reference)
  focusTimeDisplay = computed(() => {
    const sess = this.session();
    if (!sess) return '00:00';
    const minutes = sess.focusTimeInMinutes || 25;
    return `${minutes.toString().padStart(2, '0')}:00`;
  });

  breakTimeDisplay = computed(() => {
    const sess = this.session();
    if (!sess) return '00:00';
    const minutes = sess.breakTimeInMinutes || 5;
    return `${minutes.toString().padStart(2, '0')}:00`;
  });

  // Cycle display
  cycleDisplay = computed(() => {
    const sess = this.session();
    if (!sess) return '0/0';
    return `${sess.cyclesCompleted || 0}/${sess.cycles || 0}`;
  });

  // Phase indicator color
  phaseColor = computed(() => {
    return this.currentPhase() === 'FOCUS' ? '#1abc9c' : '#3498db';
  });

  // Session type display
  sessionTypeDisplay = computed(() => {
    const sess = this.session();
    if (!sess) return 'CLASSIC';
    return sess.sessionType === 'CLASSIC' ? 'Classic' : 'Freestyle';
  });

  // Check if session is FREESTYLE
  isFreestyle = computed(() => {
    const sess = this.session();
    return sess?.sessionType === 'FREESTYLE';
  });

  // Notes and Todos
  notes: string = '';
  todos = signal<Array<{ id: number; text: string; checked: boolean }>>([]);
  private nextTodoId = 1;

  // Key used for persisting todos in localStorage (per activity + session)
  private getTodosStorageKey(sess: PomodoroSession | null): string | null {
    if (!sess) return null;
    return `pomodify_session_todos_${sess.activityId}_${sess.id}`;
  }

  private loadTodosFromStorage(sess: PomodoroSession): void {
    if (typeof window === 'undefined') return;

    const key = this.getTodosStorageKey(sess);
    if (!key) return;

    try {
      const raw = window.localStorage.getItem(key);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Array<{ id: number; text: string; checked: boolean }>;
      if (!Array.isArray(parsed)) return;

      this.todos.set(parsed);
      // Ensure nextTodoId is ahead of the max existing id
      const maxId = parsed.reduce((max, t) => Math.max(max, t.id), 0);
      this.nextTodoId = maxId + 1;
    } catch (e) {
      console.warn('[Session Timer] Failed to load todos from storage', e);
    }
  }

  private persistTodos(): void {
    if (typeof window === 'undefined') return;
    const sess = this.session();
    const key = this.getTodosStorageKey(sess ?? null);
    if (!key || !sess) return;

    try {
      const value = JSON.stringify(this.todos());
      window.localStorage.setItem(key, value);
    } catch (e) {
      console.warn('[Session Timer] Failed to persist todos to storage', e);
    }
  }

  // Timer subscription
  private timerSub?: Subscription;

  constructor() {
    // Load session data when component initializes
    effect(() => {
      const id = this.sessionId();
      this.loadSession(id);
    });

    // SSR-safe timer initialization
    afterNextRender(() => {
      this.startTimerIfRunning();
    });
  }

  ngOnDestroy() {
    this.timerSub?.unsubscribe();
  }

  /* -------------------- DATA LOADING -------------------- */

  private loadSession(id: number) {
    this.loading.set(true);
    this.error.set(null);

    // First, resolve activityTitle to activityId
    this.activityService.getAllActivities(0, 100).pipe(
      switchMap(response => {
        const activity = response.activities.find(
          act => act.activityTitle === this.activityTitle()
        );
        
        if (!activity) {
          throw new Error(`Activity "${this.activityTitle()}" not found`);
        }
        
        this.activityId.set(activity.activityId);
        
        // Now fetch the session
        return this.sessionService.getSession(activity.activityId, id);
      }),
      catchError(error => {
        this.handleError(error, 'load session');
        this.loading.set(false);
        return of(null);
      })
    ).subscribe(sess => {
      if (sess) {
        this.session.set(sess);
        // Initialize notes from session so they persist across navigations
        this.notes = sess.note ?? '';
        // Load todos from local storage (per activity + session)
        this.loadTodosFromStorage(sess);
        this.loading.set(false);
        
        // Initialize timer based on session state
        if (sess.status === 'PENDING' || (sess.status as any) === 'NOT_STARTED') {
          // Set timer based on current phase (user may have switched to BREAK before starting)
          // Ensure we have valid values
          const focusMinutes = sess.focusTimeInMinutes;
          const breakMinutes = sess.breakTimeInMinutes;
          
          // Determine which phase duration to use based on current phase
          const currentPhase = sess.currentPhase || 'FOCUS';
          const phaseDuration = currentPhase === 'FOCUS' 
            ? (focusMinutes && focusMinutes > 0 ? focusMinutes : 25)
            : (breakMinutes && breakMinutes > 0 ? breakMinutes : 5);
          
          const seconds = phaseDuration * 60;
          this.remainingSeconds.set(seconds);
          this.pausedElapsedSeconds = 0;
          this.phaseStartTimestamp = null;
        } else if (sess.status === 'IN_PROGRESS') {
          // Calculate remaining time in current phase
          this.initializeTimerForPhase();
          // Auto-start timer when status is IN_PROGRESS
          if (isPlatformBrowser(this.platformId)) {
            this.startTimer();
          }
        } else if (sess.status === 'PAUSED') {
          // Calculate remaining time (will be preserved from when paused)
          this.initializeTimerForPhase();
        } else if (sess.status === 'COMPLETED') {
          // Session is completed, set timer to 0
          this.remainingSeconds.set(0);
        }
        
        // Ensure timer is never zero for non-completed sessions
        if (sess.status !== 'COMPLETED' && this.remainingSeconds() === 0) {
          this.initializeTimerForPhase();
        }
      }
    });
  }

  /* -------------------- TIMER LOGIC -------------------- */

  private startTimerIfRunning() {
    const sess = this.session();
    if (sess?.status === 'IN_PROGRESS') {
      // Initialize timer for current phase first
      this.initializeTimerForPhase();
      this.startTimer();
    }
  }

  private initializeTimerForPhase() {
    const sess = this.session();
    if (!sess) {
      return;
    }

    // Determine current phase (default to FOCUS if null)
    const currentPhase = sess.currentPhase || 'FOCUS';

    // Read the time values directly from session and normalize invalid values (0 or negative)
    const rawFocusTime = sess.focusTimeInMinutes;
    const rawBreakTime = sess.breakTimeInMinutes;
    const focusTime = rawFocusTime && rawFocusTime > 0 ? rawFocusTime : 25;
    const breakTime = rawBreakTime && rawBreakTime > 0 ? rawBreakTime : 5;

    // Get phase duration based on current phase - EXPLICIT CHECK
    let phaseDuration: number;
    if (currentPhase === 'FOCUS') {
      phaseDuration = focusTime;
    } else if (currentPhase === 'BREAK') {
      phaseDuration = breakTime;
    } else {
      // Fallback to focus if phase is unknown
      phaseDuration = focusTime;
    }

    const totalPhaseSeconds = phaseDuration * 60;

    // ALWAYS set the timer to the correct phase duration
    // Don't preserve anything - force reset
    this.remainingSeconds.set(totalPhaseSeconds);
    this.pausedElapsedSeconds = 0;
  }

  private startTimer() {
    this.timerSub?.unsubscribe();
    
    // Record when this phase started (accounting for already elapsed time)
    const currentRemaining = this.remainingSeconds();
    const totalPhaseSeconds = this.getPhaseDurationSeconds();
    const alreadyElapsed = totalPhaseSeconds - currentRemaining;
    
    this.phaseStartTimestamp = Date.now() - (alreadyElapsed * 1000);
    
    this.timerSub = timer(0, 1000).subscribe(() => {
      const sess = this.session();
      if (!sess) {
        this.timerSub?.unsubscribe();
        return;
      }

      const totalPhaseSeconds = this.getPhaseDurationSeconds();
      const now = Date.now();
      
      if (this.phaseStartTimestamp) {
        const elapsedMs = now - this.phaseStartTimestamp;
        const elapsedSeconds = Math.floor(elapsedMs / 1000);
        const remaining = Math.max(0, totalPhaseSeconds - elapsedSeconds);
        
        this.remainingSeconds.set(remaining);
        
        if (remaining <= 0) {
          // Timer reached zero - auto-complete phase
          this.timerSub?.unsubscribe();
          this.handlePhaseComplete();
        }
      }
    });
  }

  private getPhaseDurationSeconds(): number {
    const sess = this.session();
    if (!sess) {
      return 0;
    }

    // Determine current phase (default to FOCUS if null)
    const currentPhase = sess.currentPhase || 'FOCUS';

    // Read the time values directly from session and normalize invalid values (0 or negative)
    const rawFocusTime = sess.focusTimeInMinutes;
    const rawBreakTime = sess.breakTimeInMinutes;
    const focusTime = rawFocusTime && rawFocusTime > 0 ? rawFocusTime : 25;
    const breakTime = rawBreakTime && rawBreakTime > 0 ? rawBreakTime : 5;

    let phaseDuration: number;
    if (currentPhase === 'FOCUS') {
      phaseDuration = focusTime;
    } else if (currentPhase === 'BREAK') {
      phaseDuration = breakTime;
    } else {
      phaseDuration = focusTime; // Fallback
    }

    const totalSeconds = phaseDuration * 60;

    return totalSeconds;
  }

  /* -------------------- USER ACTIONS -------------------- */

  protected openTimePicker(): void {
    // Allow editing the timer at any time (PENDING, IN_PROGRESS, or PAUSED)
    const sess = this.session();
    if (!sess || sess.status === 'COMPLETED') {
      return;
    }

    const currentMinutes = Math.floor(this.remainingSeconds() / 60);
    const currentSeconds = this.remainingSeconds() % 60;

    const dialogRef = this.dialog.open(TimePickerModalComponent, {
      width: '400px',
      disableClose: false,
      panelClass: 'time-picker-dialog-panel'
    });

    // Set initial time
    dialogRef.componentInstance.time.set({
      minutes: currentMinutes,
      seconds: currentSeconds
    });

    dialogRef.afterClosed().pipe(
      filter((result): result is TimePickerData => !!result)
    ).subscribe(timeData => {
      const totalSeconds = (timeData.minutes * 60) + timeData.seconds;
      this.remainingSeconds.set(totalSeconds);
      
      // If timer is running, restart it with the new time
      if (sess.status === 'IN_PROGRESS') {
        this.timerSub?.unsubscribe();
        this.pausedElapsedSeconds = 0;
        this.startTimer();
      }
    });
  }

  protected startSession(): void {
    const sess = this.session();
    const actId = this.activityId();
    if (!sess || !actId) return;

    // If paused after phase completion, just start timer locally without API call
    // This prevents the logout bug when starting break phase after focus completes
    if (sess.status === 'PAUSED' && this.remainingSeconds() > 0) {
      // Just start the timer locally - phase was already initialized
      const updatedSession: PomodoroSession = {
        ...sess,
        status: 'IN_PROGRESS'
      };
      this.session.set(updatedSession);
      this.startTimer();
      return;
    }

    // If paused normally (user pressed pause), resume via API
    if (sess.status === 'PAUSED') {
      this.resumeSession();
      return;
    }

    // Preserve local phase state (user may have switched to BREAK before starting)
    const localPhase = sess.currentPhase || 'FOCUS';
    const phaseDuration = localPhase === 'FOCUS' 
      ? (sess.focusTimeInMinutes || 25)
      : (sess.breakTimeInMinutes || 5);
    const totalPhaseSeconds = phaseDuration * 60;

    // Otherwise start the session
    this.sessionService.startSession(actId, sess.id).subscribe({
      next: (updated) => {
        // Preserve the local phase if user switched it before starting
        const sessionWithLocalPhase: PomodoroSession = {
          ...updated,
          currentPhase: localPhase
        };
        this.session.set(sessionWithLocalPhase);
        // Set timer to the correct phase duration before initializing
        this.remainingSeconds.set(totalPhaseSeconds);
        this.pausedElapsedSeconds = 0;
        // Initialize timer for current phase (using local phase)
        this.initializeTimerForPhase();
        this.startTimer();
      },
      error: (err) => {
        // If start fails, still start the timer locally to prevent disruption
        console.log('[Session Timer] Start failed, handling gracefully:', err);
        if (err instanceof HttpErrorResponse && err.status === 401) {
          const startedSession: PomodoroSession = {
            ...sess,
            status: 'IN_PROGRESS',
            currentPhase: localPhase
          };
          this.session.set(startedSession);
          this.remainingSeconds.set(totalPhaseSeconds);
          this.pausedElapsedSeconds = 0;
          this.initializeTimerForPhase();
          this.startTimer();
          // No error message shown to user - silent graceful degradation
        } else {
          this.handleError(err, 'start session');
        }
      }
    });
  }

  protected pauseSession(): void {
    const sess = this.session();
    const actId = this.activityId();
    if (!sess || !actId) return;

    // Stop local timer but DO NOT change phase here
    this.timerSub?.unsubscribe();
    this.phaseStartTimestamp = null;

    // Remember which phase we are in (FOCUS or BREAK)
    const localPhase = sess.currentPhase || 'FOCUS';

    // Update local state immediately to provide instant feedback
    const pausedSession: PomodoroSession = {
      ...sess,
      status: 'PAUSED',
      currentPhase: localPhase
    };
    this.session.set(pausedSession);

    // Try to sync with backend, but don't show errors if it fails
    this.sessionService.pauseSession(actId, sess.id).pipe(
      catchError(err => {
        console.log('[Session Timer] Pause sync failed, continuing with local state:', err);
        return of(null);
      })
    ).subscribe({
      next: (updated) => {
        if (updated) {
          // Keep using the local phase so pausing never flips BREAK -> FOCUS
          const sessionWithLocalPhase: PomodoroSession = {
            ...updated,
            currentPhase: localPhase
          };
          this.session.set(sessionWithLocalPhase);
        }
        // remainingSeconds is left as‑is so we can resume from the same point
      }
    });
  }

  private resumeSession(): void {
    const sess = this.session();
    const actId = this.activityId();
    if (!sess || !actId) return;

    // Preserve the local phase (FOCUS or BREAK) when resuming
    const localPhase = sess.currentPhase || 'FOCUS';

    this.sessionService.resumeSession(actId, sess.id).subscribe({
      next: (updated) => {
        // Keep using the local phase even if backend normalizes to FOCUS
        const sessionWithLocalPhase: PomodoroSession = {
          ...updated,
          currentPhase: localPhase
        };
        this.session.set(sessionWithLocalPhase);

        // Do NOT reset remainingSeconds here.
        // We want to continue from the value that was left when user pressed pause.
        this.startTimer();
      },
      error: (err) => {
        // If resume fails, update local state to IN_PROGRESS anyway and start timer
        // This prevents logout and keeps user in the session
        console.log('[Session Timer] Resume failed, handling gracefully:', err);
        const resumedSession: PomodoroSession = {
          ...sess,
          status: 'IN_PROGRESS',
          currentPhase: localPhase
        };
        this.session.set(resumedSession);
        this.startTimer();
        // No error message shown to user - silent graceful degradation
      }
    });
  }

  protected stopSession(): void {
    const sess = this.session();
    const actId = this.activityId();
    if (!sess || !actId) return;

    // Open confirmation dialog instead of browser alert
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: {
        title: 'Stop Session',
        message: 'Are you sure you want to stop this session? The current cycle will be invalidated.',
        confirmText: 'Stop',
        cancelText: 'Cancel'
      } as ConfirmDialogData
    });

    dialogRef.afterClosed().subscribe(confirmed => {
      if (!confirmed) return;

      this.timerSub?.unsubscribe();

      this.sessionService.stopSession(actId, sess.id).subscribe({
        next: (updated) => {
          this.session.set(updated);
          this.goBack();
        },
        error: (err) => {
          // If stop fails due to auth, just go back anyway
          console.log('[Session Timer] Stop failed, navigating back:', err);
          this.goBack();
        }
      });
    });
  }

  protected completeSessionEarly(): void {
    const sess = this.session();
    const actId = this.activityId();
    if (!sess || !actId) return;

    // Open confirmation dialog instead of browser alert
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: {
        title: 'Complete Session Early',
        message: 'Complete this session early? This will mark it as COMPLETED.',
        confirmText: 'Complete',
        cancelText: 'Cancel'
      } as ConfirmDialogData
    });

    dialogRef.afterClosed().subscribe(confirmed => {
      if (!confirmed) return;

      this.timerSub?.unsubscribe();

      this.sessionService.finishSession(actId, sess.id, this.notes).subscribe({
        next: (updated) => {
          this.session.set(updated);
          this.remainingSeconds.set(0);
          setTimeout(() => this.goBack(), 1500);
        },
        error: (err) => {
          // If complete early fails, mark as completed locally
          console.log('[Session Timer] Complete early failed, handling locally:', err);
          const completedSession: PomodoroSession = {
            ...sess,
            status: 'COMPLETED'
          };
          this.session.set(completedSession);
          this.remainingSeconds.set(0);
          setTimeout(() => this.goBack(), 1500);
        }
      });
    });
  }

  protected cancelSession(): void {
    const sess = this.session();
    const actId = this.activityId();
    if (!sess || !actId) return;

    // Open confirmation dialog instead of browser alert
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: {
        title: 'Cancel Session',
        message: 'Cancel current progress? You can start this session again later.',
        confirmText: 'Cancel Session',
        cancelText: 'Keep Session'
      } as ConfirmDialogData
    });

    dialogRef.afterClosed().subscribe(confirmed => {
      if (!confirmed) return;

      this.timerSub?.unsubscribe();

      this.sessionService.cancelSession(actId, sess.id).subscribe({
        next: (updated) => {
          const focus = updated.focusTimeInMinutes;
          const reset: PomodoroSession = { ...updated, status: 'PENDING', currentPhase: 'FOCUS' };
          this.session.set(reset);
          this.remainingSeconds.set(focus * 60);
        },
        error: (err) => {
          // If cancel fails, reset locally anyway
          console.log('[Session Timer] Cancel failed, resetting locally:', err);
          const focus = sess.focusTimeInMinutes || 25;
          const reset: PomodoroSession = { ...sess, status: 'PENDING', currentPhase: 'FOCUS' };
          this.session.set(reset);
          this.remainingSeconds.set(focus * 60);
        }
      });
    });
  }

  private handlePhaseComplete(): void {
    const sess = this.session();
    const actId = this.activityId();
    if (!sess || !actId) return;

    this.timerSub?.unsubscribe();
    this.phaseStartTimestamp = null;

    this.sessionService.completePhase(actId, sess.id).subscribe({
      next: (updated) => {
        // ALWAYS preserve break and focus times - use original if missing in response
        const rawUpdatedFocus = updated.focusTimeInMinutes ?? sess.focusTimeInMinutes;
        const rawUpdatedBreak = updated.breakTimeInMinutes ?? sess.breakTimeInMinutes;
        const finalFocusTime = rawUpdatedFocus && rawUpdatedFocus > 0 ? rawUpdatedFocus : 25;
        const finalBreakTime = rawUpdatedBreak && rawUpdatedBreak > 0 ? rawUpdatedBreak : 5;

        const sessionWithPreservedTimes: PomodoroSession = {
          ...updated,
          focusTimeInMinutes: finalFocusTime,
          breakTimeInMinutes: finalBreakTime
        };
        
        this.session.set(sessionWithPreservedTimes);
        
        // If session is now completed, show completion message
        if (updated.status === 'COMPLETED') {
          // Session finished
          this.remainingSeconds.set(0);
        } else {
          // Continue to next phase (FOCUS -> BREAK or BREAK -> FOCUS)
          // FORCE reset everything before initializing
          this.remainingSeconds.set(0);
          this.pausedElapsedSeconds = 0;
          this.phaseStartTimestamp = null;
          
          // Now initialize with the correct phase
          this.initializeTimerForPhase();
          
          // Set status to PAUSED so the button shows START instead of PAUSE
          // Timer will NOT auto-start - user must manually click START button to continue
          const pausedSession: PomodoroSession = {
            ...sessionWithPreservedTimes,
            status: 'PAUSED'
          };
          this.session.set(pausedSession);
        }
      },
      error: (err) => {
        // If complete phase fails, handle it gracefully
        console.log('[Session Timer] Complete phase failed, handling locally:', err);
        if (err instanceof HttpErrorResponse && err.status === 401) {
          // Just transition to next phase locally
          const currentPhase = sess.currentPhase || 'FOCUS';
          const nextPhase = currentPhase === 'FOCUS' ? 'BREAK' : 'FOCUS';
          const pausedSession: PomodoroSession = {
            ...sess,
            status: 'PAUSED',
            currentPhase: nextPhase
          };
          this.session.set(pausedSession);
          this.remainingSeconds.set(0);
          this.pausedElapsedSeconds = 0;
          this.phaseStartTimestamp = null;
          this.initializeTimerForPhase();
          // No error message shown to user - silent graceful degradation
        } else {
          this.handleError(err, 'complete phase');
        }
      }
    });
  }

  protected goBack(): void {
    const sess = this.session();
    
    // If session is running or paused, stop the timer before going back
    if (sess && (sess.status === 'IN_PROGRESS' || sess.status === 'PAUSED')) {
      this.timerSub?.unsubscribe();
      // Stop timer to reset progress
      this.pausedElapsedSeconds = 0;
      this.phaseStartTimestamp = null;
    }
    
    // Persist notes before leaving the session page
    this.saveNotes();
    this.router.navigate(['/activities', this.activityTitle(), 'sessions']);
  }

  /* -------------------- ERROR HANDLING -------------------- */

  private handleError(err: any, operation: string): void {
    if (err instanceof HttpErrorResponse) {
      // Handle authentication errors (401) - Silent handling, no user message
      if (err.status === 401) {
        console.log(`[Session Timer] 401 error during ${operation}, handled silently`);
        return;
      }
      
      // Handle other HTTP errors with auto-clearing messages
      if (err.status === 403) {
        this.error.set('You do not have permission to perform this action.');
        setTimeout(() => this.error.set(null), 5000);
        return;
      }
      
      if (err.status >= 500) {
        this.error.set('Server error. Please try again later.');
        setTimeout(() => this.error.set(null), 5000);
        return;
      }
      
      if (err.status === 404) {
        this.error.set('Session not found. It may have been deleted.');
        setTimeout(() => this.error.set(null), 5000);
        return;
      }
      
      // Generic HTTP error
      const errorMessage = err.error?.message || err.message || `Failed to ${operation}`;
      this.error.set(errorMessage);
      setTimeout(() => this.error.set(null), 5000);
      return;
    }
    
    // Non-HTTP error
    const errorMessage = err?.message || `Failed to ${operation}`;
    this.error.set(errorMessage);
    setTimeout(() => this.error.set(null), 5000);
  }

  /* -------------------- NOTES AND TODOS -------------------- */

  protected onNotesChanged(value: string): void {
    this.notes = value;
  }

  protected saveNotes(): void {
    const sess = this.session();
    const actId = this.activityId();
    if (!sess || !actId) return;

    this.sessionService.updateNote(actId, sess.id, this.notes).subscribe({
      next: (updated) => {
        console.log('[Session Timer] Note updated:', updated.note);
        const current = this.session();
        if (current) {
          // Preserve current timer/phase state but sync note from backend
          this.session.set({ ...current, note: updated.note });
        } else {
          this.session.set(updated);
        }
      },
      error: (err) => {
        console.error('[Session Timer] Failed to update note:', err);
        // Don't show error for note updates - they're not critical
        // Just log it silently
        if (!(err instanceof HttpErrorResponse && err.status === 401)) {
          console.warn('[Session Timer] Note update failed, but continuing...');
        }
      }
    });
  }

  protected addTodo(): void {
    const newTodo = {
      id: this.nextTodoId++,
      text: '',
      checked: false
    };
    this.todos.update(list => [...list, newTodo]);
    this.persistTodos();
  }

  protected removeTodo(id: number): void {
    this.todos.update(list => list.filter(todo => todo.id !== id));
    this.persistTodos();
  }

  protected updateTodoText(id: number, text: string): void {
    this.todos.update(list =>
      list.map(todo => todo.id === id ? { ...todo, text } : todo)
    );
    this.persistTodos();
  }

  protected toggleTodo(id: number): void {
    this.todos.update(list =>
      list.map(todo => todo.id === id ? { ...todo, checked: !todo.checked } : todo)
    );
    this.persistTodos();
  }

  /* -------------------- PHASE SWITCHING -------------------- */

  protected switchToPhase(phase: 'FOCUS' | 'BREAK'): void {
    // Allow switching phases when session is PENDING or PAUSED
    if (!this.isPending() && !this.isPaused()) {
      return;
    }

    const sess = this.session();
    if (!sess) return;

    // Don't switch if already in the requested phase
    if (sess.currentPhase === phase) {
      return;
    }

    // Stop timer if running (shouldn't happen for PAUSED, but safety check)
    if (this.isRunning()) {
      this.timerSub?.unsubscribe();
      this.phaseStartTimestamp = null;
    }

    // Update the session's current phase locally
    const updatedSession: PomodoroSession = {
      ...sess,
      currentPhase: phase
    };
    this.session.set(updatedSession);

    // Update timer based on selected phase
    const phaseDuration = phase === 'FOCUS' 
      ? (sess.focusTimeInMinutes || 25)
      : (sess.breakTimeInMinutes || 5);
    
    const totalSeconds = phaseDuration * 60;
    this.remainingSeconds.set(totalSeconds);
    
    // Reset paused elapsed time when switching phases
    this.pausedElapsedSeconds = 0;
  }

  protected fastForwardPhase(): void {
    const sess = this.session();
    if (!sess) return;

    // Determine the next phase (FOCUS -> BREAK, BREAK -> FOCUS)
    const currentPhase = sess.currentPhase || 'FOCUS';
    const nextPhase: 'FOCUS' | 'BREAK' = currentPhase === 'FOCUS' ? 'BREAK' : 'FOCUS';

    // Use the switchToPhase method to handle the switch
    this.switchToPhase(nextPhase);
  }
}
