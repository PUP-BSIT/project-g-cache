import { 
  Component, 
  input, 
  signal, 
  computed, 
  effect,
  inject,
  afterNextRender,
  OnDestroy,
  numberAttribute
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { timer, Subscription, of } from 'rxjs';
import { switchMap, catchError, filter } from 'rxjs/operators';
import { SessionService, PomodoroSession } from '../../core/services/session.service';
import { ActivityService } from '../../core/services/activity.service';
import { MatDialog } from '@angular/material/dialog';
import { TimePickerModalComponent, TimePickerData } from '../../shared/components/time-picker-modal/time-picker-modal';
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

  // Notes and Todos
  notes = signal<string>('');
  todos = signal<Array<{ id: number; text: string; checked: boolean }>>([]);
  private nextTodoId = 1;

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
        console.error('[Session Timer] Failed to load session:', error);
        this.handleError(error, 'load session');
        this.loading.set(false);
        return of(null);
      })
    ).subscribe(sess => {
      if (sess) {
        console.log('[Session Timer] Session loaded:', sess);
        console.log('[Session Timer] Focus time:', sess.focusTimeInMinutes, 'Break time:', sess.breakTimeInMinutes);
        console.log('[Session Timer] Current phase:', sess.currentPhase, 'Status:', sess.status);
        
        this.session.set(sess);
        this.loading.set(false);
        
        // Initialize timer based on session state
        if (sess.status === 'PENDING' || (sess.status as any) === 'NOT_STARTED') {
          // Set timer to focus duration from session (sessions always start in FOCUS phase)
          // Ensure we have valid values
          const focusMinutes = sess.focusTimeInMinutes;
          const breakMinutes = sess.breakTimeInMinutes;
          
          if (!focusMinutes || focusMinutes <= 0) {
            console.warn('[Session Timer] Invalid focusTimeInMinutes:', focusMinutes, 'using default 25');
          }
          if (!breakMinutes || breakMinutes <= 0) {
            console.warn('[Session Timer] Invalid breakTimeInMinutes:', breakMinutes, 'using default 5');
          }
          
          const minutes = focusMinutes && focusMinutes > 0 ? focusMinutes : 25; // Default to 25 if not set or invalid
          const seconds = minutes * 60;
          console.log('[Session Timer] Initializing PENDING session with', minutes, 'minutes (', seconds, 'seconds)');
          this.remainingSeconds.set(seconds);
          this.pausedElapsedSeconds = 0;
          this.phaseStartTimestamp = null;
        } else if (sess.status === 'IN_PROGRESS') {
          // Calculate remaining time in current phase
          console.log('[Session Timer] Initializing IN_PROGRESS session');
          this.initializeTimerForPhase();
        } else if (sess.status === 'PAUSED') {
          // Calculate remaining time (will be preserved from when paused)
          console.log('[Session Timer] Initializing PAUSED session');
          this.initializeTimerForPhase();
        } else if (sess.status === 'COMPLETED') {
          // Session is completed, set timer to 0
          console.log('[Session Timer] Session is COMPLETED');
          this.remainingSeconds.set(0);
        }
        
        // Ensure timer is never zero for non-completed sessions
        if (sess.status !== 'COMPLETED' && this.remainingSeconds() === 0) {
          console.warn('[Session Timer] Timer was zero, reinitializing...');
          this.initializeTimerForPhase();
        }
        
        console.log('[Session Timer] Timer initialized to:', this.remainingSeconds(), 'seconds (', this.timerDisplay(), ')');
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
      console.warn('[Session Timer] Cannot initialize timer: session is null');
      return;
    }

    // Determine current phase (default to FOCUS if null)
    const currentPhase = sess.currentPhase || 'FOCUS';
    
    // Get phase duration based on current phase
    const phaseDuration = currentPhase === 'FOCUS' 
      ? (sess.focusTimeInMinutes || 25)  // Default to 25 minutes if not set
      : (sess.breakTimeInMinutes || 5);  // Default to 5 minutes if not set
    
    const totalPhaseSeconds = phaseDuration * 60;
    
    console.log('[Session Timer] Initializing phase:', currentPhase, 'Duration:', phaseDuration, 'minutes (', totalPhaseSeconds, 'seconds)');
    
    // If paused, use the preserved remaining time
    // If in progress but we don't have elapsed time info, start fresh
    if (sess.status === 'PAUSED' && this.remainingSeconds() > 0) {
      // Keep the current remaining time
      console.log('[Session Timer] Preserving paused time:', this.remainingSeconds(), 'seconds');
      this.pausedElapsedSeconds = totalPhaseSeconds - this.remainingSeconds();
    } else {
      // Start with full phase duration
      console.log('[Session Timer] Setting timer to full phase duration:', totalPhaseSeconds, 'seconds');
      this.remainingSeconds.set(totalPhaseSeconds);
      this.pausedElapsedSeconds = 0;
    }
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
    if (!sess) return 0;
    
    const phaseDuration = sess.currentPhase === 'FOCUS' 
      ? sess.focusTimeInMinutes 
      : sess.breakTimeInMinutes;
    
    return phaseDuration * 60;
  }

  /* -------------------- USER ACTIONS -------------------- */

  protected openTimePicker(): void {
    // Only allow editing if session is PENDING
    if (!this.isPending()) {
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
      
      // Optionally update the session's focus time in the backend
      // For now, we'll just update locally
      console.log('[Session Timer] Time updated to:', timeData);
    });
  }

  protected startSession(): void {
    const sess = this.session();
    const actId = this.activityId();
    if (!sess || !actId) return;

    // If paused, resume instead of start
    if (sess.status === 'PAUSED') {
      this.resumeSession();
      return;
    }

    // Otherwise start the session
    this.sessionService.startSession(actId, sess.id).subscribe({
      next: (updated) => {
        console.log('[Session Timer] Session started:', updated);
        this.session.set(updated);
        // Initialize timer for current phase
        this.initializeTimerForPhase();
        this.startTimer();
      },
      error: (err) => {
        console.error('[Session Timer] Failed to start session:', err);
        this.handleError(err, 'start session');
      }
    });
  }

  protected pauseSession(): void {
    const sess = this.session();
    const actId = this.activityId();
    if (!sess || !actId) return;

    this.timerSub?.unsubscribe();
    this.phaseStartTimestamp = null;

    this.sessionService.pauseSession(actId, sess.id).subscribe({
      next: (updated) => {
        console.log('[Session Timer] Session paused:', updated);
        this.session.set(updated);
        // Preserve current remaining time
      },
      error: (err) => {
        console.error('[Session Timer] Failed to pause session:', err);
        this.handleError(err, 'pause session');
        // Restart timer if pause failed (unless it's an auth error)
        if (!(err instanceof HttpErrorResponse && err.status === 401)) {
          this.startTimer();
        }
      }
    });
  }

  private resumeSession(): void {
    const sess = this.session();
    const actId = this.activityId();
    if (!sess || !actId) return;

    this.sessionService.resumeSession(actId, sess.id).subscribe({
      next: (updated) => {
        console.log('[Session Timer] Session resumed:', updated);
        this.session.set(updated);
        // Initialize timer for current phase (preserving remaining time)
        this.initializeTimerForPhase();
        this.startTimer();
      },
      error: (err) => {
        console.error('[Session Timer] Failed to resume session:', err);
        this.handleError(err, 'resume session');
      }
    });
  }

  protected stopSession(): void {
    const sess = this.session();
    const actId = this.activityId();
    if (!sess || !actId) return;

    if (!confirm('Are you sure you want to stop this session? The current cycle will be invalidated.')) {
      return;
    }

    this.timerSub?.unsubscribe();

    this.sessionService.stopSession(actId, sess.id).subscribe({
      next: (updated) => {
        console.log('[Session Timer] Session stopped:', updated);
        this.session.set(updated);
        this.goBack();
      },
      error: (err) => {
        console.error('[Session Timer] Failed to stop session:', err);
        this.handleError(err, 'stop session');
      }
    });
  }

  protected cancelSession(): void {
    const sess = this.session();
    const actId = this.activityId();
    if (!sess || !actId) return;

    if (!confirm('Cancel current progress? You can start this session again later.')) {
      return;
    }

    this.timerSub?.unsubscribe();

    this.sessionService.cancelSession(actId, sess.id).subscribe({
      next: (updated) => {
        console.log('[Session Timer] Session canceled');
        // Treat canceled session as pending to allow restart
        const focus = updated.focusTimeInMinutes;
        const reset: PomodoroSession = { ...updated, status: 'PENDING', currentPhase: 'FOCUS' };
        this.session.set(reset);
        this.remainingSeconds.set(focus * 60);
        // Keep user on timer page to allow immediate restart
      },
      error: (err) => {
        console.error('[Session Timer] Failed to cancel session:', err);
        this.handleError(err, 'cancel session');
      }
    });
  }

  private handlePhaseComplete(): void {
    const sess = this.session();
    const actId = this.activityId();
    if (!sess || !actId) return;

    console.log('[Session Timer] Phase completed, calling completePhase API');

    this.timerSub?.unsubscribe();
    this.phaseStartTimestamp = null;

    this.sessionService.completePhase(actId, sess.id).subscribe({
      next: (updated) => {
        console.log('[Session Timer] Phase completed:', updated);
        this.session.set(updated);
        
        // If session is now completed, show completion message
        if (updated.status === 'COMPLETED') {
          // Session finished
          this.remainingSeconds.set(0);
        } else {
          // Continue to next phase (FOCUS -> BREAK or BREAK -> FOCUS)
          this.initializeTimerForPhase();
          // Auto-start timer for next phase if session is still IN_PROGRESS
          if (updated.status === 'IN_PROGRESS') {
            this.startTimer();
          }
        }
      },
      error: (err) => {
        console.error('[Session Timer] Failed to complete phase:', err);
        this.handleError(err, 'complete phase');
      }
    });
  }

  protected goBack(): void {
    this.router.navigate(['/activities', this.activityTitle(), 'sessions']);
  }

  /* -------------------- ERROR HANDLING -------------------- */

  private handleError(err: any, operation: string): void {
    if (err instanceof HttpErrorResponse) {
      // Handle authentication errors (401)
      if (err.status === 401) {
        this.error.set('Your session has expired. You will be redirected to login shortly...');
        // The auth-error interceptor will handle token refresh or redirect to login
        // If refresh fails, the interceptor will clear auth data and redirect
        return;
      }
      
      // Handle other HTTP errors
      if (err.status === 403) {
        this.error.set('You do not have permission to perform this action.');
        return;
      }
      
      if (err.status >= 500) {
        this.error.set('Server error. Please try again later.');
        return;
      }
      
      if (err.status === 404) {
        this.error.set('Session not found. It may have been deleted.');
        return;
      }
      
      // Generic HTTP error
      const errorMessage = err.error?.message || err.message || `Failed to ${operation}`;
      this.error.set(errorMessage);
      return;
    }
    
    // Non-HTTP error
    const errorMessage = err?.message || `Failed to ${operation}`;
    this.error.set(errorMessage);
  }

  /* -------------------- NOTES AND TODOS -------------------- */

  protected addTodo(): void {
    const newTodo = {
      id: this.nextTodoId++,
      text: '',
      checked: false
    };
    this.todos.update(list => [...list, newTodo]);
  }

  protected removeTodo(id: number): void {
    this.todos.update(list => list.filter(todo => todo.id !== id));
  }

  protected updateTodoText(id: number, text: string): void {
    this.todos.update(list =>
      list.map(todo => todo.id === id ? { ...todo, text } : todo)
    );
  }

  protected toggleTodo(id: number): void {
    this.todos.update(list =>
      list.map(todo => todo.id === id ? { ...todo, checked: !todo.checked } : todo)
    );
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
    
    console.log('[Session Timer] Switched to', phase, 'phase with', phaseDuration, 'minutes');
  }
}
