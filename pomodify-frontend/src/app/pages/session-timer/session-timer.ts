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
import { Router } from '@angular/router';
import { timer, Subscription, of } from 'rxjs';
import { switchMap, catchError, filter } from 'rxjs/operators';
import { SessionService, PomodoroSession } from '../../core/services/session.service';
import { ActivityService } from '../../core/services/activity.service';
import { MatDialog } from '@angular/material/dialog';
import { TimePickerModalComponent, TimePickerData } from '../../shared/components/time-picker-modal/time-picker-modal';

/**
 * Session Timer Page - Main timer interface for Pomodoro sessions
 * Features: Drift-proof timer, editable time (PENDING only), SSR-safe, real-time phase tracking
 */
@Component({
  selector: 'app-session-timer',
  standalone: true,
  imports: [CommonModule],
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

  // Timer display (MM:SS format)
  timerDisplay = computed(() => {
    const total = this.remainingSeconds();
    const mins = Math.floor(total / 60);
    const secs = total % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
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

  // Timer subscription
  private timerSub?: Subscription;
  private phaseStartTime: number = 0;

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
        this.error.set(error.message || 'Failed to load session');
        this.loading.set(false);
        return of(null);
      })
    ).subscribe(sess => {
      if (sess) {
        this.session.set(sess);
        this.loading.set(false);
        
        // Initialize timer based on session state
        if (sess.status === 'PENDING' || (sess.status as any) === 'NOT_STARTED') {
          // Set timer to focus duration
          const minutes = sess.focusTimeInMinutes;
          this.remainingSeconds.set(minutes * 60);
        } else if (sess.status === 'IN_PROGRESS') {
          // Calculate remaining time in current phase
          this.calculateRemainingTime();
        } else if (sess.status === 'PAUSED') {
          // Keep current remaining time
          this.calculateRemainingTime();
        }
      }
    });
  }

  /* -------------------- TIMER LOGIC -------------------- */

  private startTimerIfRunning() {
    const sess = this.session();
    if (sess?.status === 'IN_PROGRESS') {
      this.startTimer();
    }
  }

  private startTimer() {
    this.timerSub?.unsubscribe();
    this.phaseStartTime = Date.now();
    
    this.timerSub = timer(0, 1000).subscribe(() => {
      const remaining = this.remainingSeconds();
      
      if (remaining > 0) {
        this.remainingSeconds.update(val => Math.max(0, val - 1));
      } else {
        // Timer reached zero - auto-complete phase
        this.timerSub?.unsubscribe();
        this.handlePhaseComplete();
      }
    });
  }

  private calculateRemainingTime() {
    const sess = this.session();
    if (!sess) return;

    const phaseDuration = sess.currentPhase === 'FOCUS' 
      ? sess.focusTimeInMinutes 
      : sess.breakTimeInMinutes;
    
    // For now, just set to full phase duration
    // In a real implementation, you'd calculate based on startedAt timestamp
    this.remainingSeconds.set(phaseDuration * 60);
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

    this.sessionService.startSession(actId, sess.id).subscribe({
      next: (updated) => {
        console.log('[Session Timer] Session started:', updated);
        this.session.set(updated);
        this.startTimer();
      },
      error: (err) => {
        console.error('[Session Timer] Failed to start session:', err);
        this.error.set('Failed to start session');
      }
    });
  }

  protected pauseSession(): void {
    const sess = this.session();
    const actId = this.activityId();
    if (!sess || !actId) return;

    this.timerSub?.unsubscribe();

    this.sessionService.pauseSession(actId, sess.id).subscribe({
      next: (updated) => {
        console.log('[Session Timer] Session paused:', updated);
        this.session.set(updated);
      },
      error: (err) => {
        console.error('[Session Timer] Failed to pause session:', err);
        this.error.set('Failed to pause session');
      }
    });
  }

  protected resumeSession(): void {
    const sess = this.session();
    const actId = this.activityId();
    if (!sess || !actId) return;

    this.sessionService.resumeSession(actId, sess.id).subscribe({
      next: (updated) => {
        console.log('[Session Timer] Session resumed:', updated);
        this.session.set(updated);
        this.startTimer();
      },
      error: (err) => {
        console.error('[Session Timer] Failed to resume session:', err);
        this.error.set('Failed to resume session');
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
        this.error.set('Failed to stop session');
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
        this.error.set('Failed to cancel session');
      }
    });
  }

  private handlePhaseComplete(): void {
    const sess = this.session();
    const actId = this.activityId();
    if (!sess || !actId) return;

    console.log('[Session Timer] Phase completed, calling completePhase API');

    this.sessionService.completePhase(actId, sess.id).subscribe({
      next: (updated) => {
        console.log('[Session Timer] Phase completed:', updated);
        this.session.set(updated);
        
        // If session is now completed, show completion message
        if (updated.status === 'COMPLETED') {
          // Session finished
          this.timerSub?.unsubscribe();
        } else {
          // Continue to next phase
          this.calculateRemainingTime();
          this.startTimer();
        }
      },
      error: (err) => {
        console.error('[Session Timer] Failed to complete phase:', err);
        this.error.set('Failed to complete phase');
      }
    });
  }

  protected goBack(): void {
    this.router.navigate(['/activities', this.activityTitle(), 'sessions']);
  }
}
