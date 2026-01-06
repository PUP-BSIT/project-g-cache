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
import { CommonModule, isPlatformBrowser, DOCUMENT } from '@angular/common';
import { Router } from '@angular/router';
import { timer, Subscription, of } from 'rxjs';
import { switchMap, catchError, filter } from 'rxjs/operators';
import { SessionService, PomodoroSession } from '../../core/services/session.service';
import { ActivityService } from '../../core/services/activity.service';
import { ActivityColorService } from '../../core/services/activity-color.service';
import { TimerSyncService } from '../../core/services/timer-sync.service';
import { AiService } from '../../core/services/ai.service';
import { MatDialog } from '@angular/material/dialog';
import { TimePickerModalComponent, TimePickerData } from '../../shared/components/time-picker-modal/time-picker-modal';
import { ConfirmDialogComponent, ConfirmDialogData } from '../../shared/components/confirm-dialog/confirm-dialog';
import { Auth } from '../../core/services/auth';
import { HttpErrorResponse } from '@angular/common/http';
import { NotificationService } from '../../core/services/notification.service';
import { SettingsService } from '../../core/services/settings.service';
import { environment } from '../../../environments/environment';

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
    private notesDebounceTimeout: any;
    private todosDebounceTimeout: any;
  // Route params via Component Input Binding
  sessionId = input.required({ transform: numberAttribute });
  activityTitle = input.required<string>();

  // Injected services
  private sessionService = inject(SessionService);
  private activityService = inject(ActivityService);
  private activityColorService = inject(ActivityColorService);
  private timerSyncService = inject(TimerSyncService);
  private aiService = inject(AiService);
  protected router = inject(Router);
  private dialog = inject(MatDialog);
  private auth = inject(Auth);
  private platformId = inject(PLATFORM_ID);
  private notificationService = inject(NotificationService);
  private settingsService = inject(SettingsService);
  private document = inject(DOCUMENT);
  
  // Store original title to restore on destroy
  private originalTitle = 'Pomodify';

  // Guard to prevent duplicate notifications
  private notificationSentForCurrentPhase = false;

  // Auto-start functionality
  protected showAutoStartCountdown = signal(false);
  protected autoStartCountdown = signal(0);
  private autoStartTimeoutId: number | null = null;

  // AI suggestion state
  protected isGeneratingAi = signal(false);

  // State signals
  session = signal<PomodoroSession | null>(null);
  activityId = signal<number | null>(null);
  loading = signal(true);
  error = signal<string | null>(null);

  // Activity color - stored from backend when activity is loaded
  private activityColorFromBackend = signal<string | null>(null);
  
  // Activity color from color tag (localStorage) or backend
  activityColor = computed(() => {
    const actId = this.activityId();
    if (!actId) return this.getColorHex('teal');
    
    // First check localStorage
    const colorTag = this.activityColorService.getColorTag(actId);
    if (colorTag) {
      return this.getColorHex(colorTag);
    }
    
    // Then check backend color
    const backendColor = this.activityColorFromBackend();
    if (backendColor) {
      // Backend stores hex color directly (e.g., #EF4444)
      if (backendColor.startsWith('#')) {
        return backendColor;
      }
      // Or it might be a color name
      return this.getColorHex(backendColor);
    }
    
    return this.getColorHex('teal');
  });

  // Color mapping helper
  private getColorHex(colorName: string): string {
    const colorMap: Record<string, string> = {
      'red': '#EF4444',
      'orange': '#F97316',
      'yellow': '#FBBF24',
      'green': '#10B981',
      'blue': '#3B82F6',
      'purple': '#8B5CF6',
      'teal': '#5FA9A4'
    };
    return colorMap[colorName] || colorMap['teal'];
  }

  // Timer state - now using TimerSyncService
  currentPhase = computed(() => this.session()?.currentPhase || 'FOCUS');
  remainingSeconds = computed(() => this.timerSyncService.remainingSeconds());
  // isPaused: timer is not running AND session is active (not PENDING/COMPLETED/ABANDONED)
  isPaused = computed(() => {
    const sess = this.session();
    if (!sess) return false;
    // Session is "paused" if timer is not running and session is not in terminal state
    const isTerminalState = sess.status === 'NOT_STARTED' || sess.status === 'COMPLETED' || sess.status === 'ABANDONED';
    const isTimerStopped = !this.timerSyncService.isRunning();
    return isTimerStopped && !isTerminalState;
  });
  isRunning = computed(() => this.timerSyncService.isRunning());
  isNotStarted = computed(() => this.session()?.status === 'NOT_STARTED');
  isCompleted = computed(() => this.session()?.status === 'COMPLETED');
  isAbandoned = computed(() => this.session()?.status === 'ABANDONED');

  // Track if session has been reset (for Reset -> Stop button transition)
  private sessionHasBeenReset = signal(false);
  
  // Public method to check if session was reset
  protected hasBeenReset = computed(() => this.sessionHasBeenReset());

  // Track if we're at the start of a new phase (not mid-phase pause)
  // This determines if button shows "Start" vs "Resume"
  private isAtPhaseStart = signal(true);
  
  // Button should show "Start" if at phase start, "Resume" if mid-phase pause
  protected showStartButton = computed(() => this.isAtPhaseStart());

  
  // Shake when time is running low (last 60 seconds)
  isTimeLow = computed(() => {
    return this.isRunning() && this.remainingSeconds() > 0 && this.remainingSeconds() <= 60;
  });

  // Timer display (MM:SS format) - now using sync service
  timerDisplay = computed(() => this.timerSyncService.getTimerDisplay());

  // Split timer display for inline editing
  minutesDisplay = computed(() => {
    const seconds = this.remainingSeconds();
    return Math.floor(seconds / 60).toString().padStart(2, '0');
  });

  secondsDisplay = computed(() => {
    const seconds = this.remainingSeconds();
    return (seconds % 60).toString().padStart(2, '0');
  });

  // Inline Editing State
  isEditingMinutes = signal(false);
  isEditingSeconds = signal(false);
  tempMinutes = signal(0);
  tempSeconds = signal(0);

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
  todos = signal<Array<{ id: number; text: string; done: boolean }>>([]);
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
      const parsed = JSON.parse(raw) as Array<{ id: number; text: string; done: boolean }>;
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

  // Visibility change handler reference for cleanup
  private visibilityChangeHandler: (() => void) | null = null;

  constructor() {
    // Tell notification service we're on the timer page
    this.notificationService.setOnTimerPage(true);
    
    // Load session data when component initializes
    effect(() => {
      const id = this.sessionId();
      this.loadSession(id);
    });

    // Monitor timer completion
    effect(() => {
      if (this.timerSyncService.isTimerComplete() && !this.notificationSentForCurrentPhase) {
        this.notificationSentForCurrentPhase = true;
        this.handleTimerComplete();
      }
    });

    // Add test method to window for development (only in development mode)
    if (typeof window !== 'undefined' && !environment.production) {
      (window as any).testAutoStart = () => this.testAutoStart();
      console.log('🧪 Auto-start test method available: window.testAutoStart()');
    }
    
    // Effect to update browser tab title with timer
    effect(() => {
      if (isPlatformBrowser(this.platformId)) {
        const timerDisplay = this.timerDisplay();
        const phase = this.currentPhase();
        const isRunning = this.isRunning();
        const isPaused = this.isPaused();
        const sess = this.session();
        
        if (sess && (isRunning || isPaused)) {
          // Show timer in tab: "16:11 Focus | Pomodify" or "⏸ 16:11 | Pomodify"
          const phaseLabel = phase === 'FOCUS' ? '🎯' : '☕';
          const pauseIcon = isPaused ? '⏸ ' : '';
          this.document.title = `${pauseIcon}${timerDisplay} ${phaseLabel} Pomodify`;
        } else {
          // Restore original title when not running
          this.document.title = this.originalTitle;
        }
      }
    });
    
    // Listen for tab visibility changes to reload session when user returns
    // This handles the case where user clicks a notification to return to the app
    if (isPlatformBrowser(this.platformId)) {
      this.visibilityChangeHandler = () => this.handleVisibilityChange();
      document.addEventListener('visibilitychange', this.visibilityChangeHandler);
    }
  }
  
  /**
   * Handle tab visibility change - reload session when tab becomes visible
   * This ensures the timer shows the correct state after clicking a notification
   * or when returning to the app after being away
   */
  private handleVisibilityChange(): void {
    if (document.hidden) {
      return; // Tab became hidden, nothing to do
    }
    
    console.log('[Session Timer] Tab became visible - checking if session reload needed');
    
    const sess = this.session();
    const remainingSeconds = this.remainingSeconds();
    
    // Always reload session when tab becomes visible if session exists
    // Backend scheduler may have processed phase completion while we were away
    // This ensures we sync with the latest backend state
    if (sess && sess.status !== 'COMPLETED' && sess.status !== 'ABANDONED' && sess.status !== 'NOT_STARTED') {
      console.log('[Session Timer] Reloading session after tab became visible', {
        remainingSeconds,
        status: sess.status,
        isRunning: this.isRunning(),
        currentPhase: sess.currentPhase
      });
      
      // CRITICAL: Stop local timer immediately to prevent race conditions
      // The backend may have already processed the phase completion
      if (remainingSeconds <= 0 && this.timerSyncService.isRunning()) {
        console.log('[Session Timer] Timer at 0 - stopping local timer before reload');
        this.timerSyncService.pauseTimer();
      }
      
      // Reload session from backend to get latest state
      this.reloadSessionFromBackend();
    }
  }
  
  /**
   * Reload session data from backend without full component reload
   */
  private reloadSessionFromBackend(): void {
    const actId = this.activityId();
    const sess = this.session();
    
    if (!actId || !sess) {
      return;
    }
    
    // Store the current local state for comparison
    const localPhase = sess.currentPhase;
    const localStatus = sess.status;
    const localCycles = sess.cyclesCompleted;
    
    this.sessionService.getSession(actId, sess.id).subscribe({
      next: (updatedSession) => {
        console.log('[Session Timer] Session reloaded from backend:', {
          status: updatedSession.status,
          currentPhase: updatedSession.currentPhase,
          remainingPhaseSeconds: updatedSession.remainingPhaseSeconds,
          cyclesCompleted: updatedSession.cyclesCompleted,
          localPhase,
          localStatus,
          localCycles
        });
        
        // Check if backend has already processed a phase transition
        const backendProcessedPhase = localPhase !== updatedSession.currentPhase || 
                                       localCycles !== updatedSession.cyclesCompleted;
        
        if (backendProcessedPhase) {
          console.log('[Session Timer] Backend already processed phase transition - syncing UI');
          // Reset notification guard since backend already sent notification
          this.notificationSentForCurrentPhase = true;
        }
        
        // Update session state
        this.session.set(updatedSession);
        
        // Initialize timer with the backend state
        this.timerSyncService.initializeTimer(updatedSession, actId, this.activityTitle());
        
        // If session is PAUSED after backend processing, mark as at phase start
        if (updatedSession.status === 'PAUSED' && backendProcessedPhase) {
          this.isAtPhaseStart.set(true);
          
          // Check auto-start for the new phase
          const currentPhase = updatedSession.currentPhase as 'FOCUS' | 'BREAK' | 'LONG_BREAK';
          this.checkAndAutoStartNextPhase(currentPhase);
        }
        
        // Handle completed session
        if (updatedSession.status === 'COMPLETED') {
          console.log('[Session Timer] Session is completed');
          this.timerSyncService.stopTimer();
        }
      },
      error: (err) => {
        console.error('[Session Timer] Failed to reload session:', err);
      }
    });
  }

  ngOnDestroy() {
    // Tell notification service we're leaving the timer page
    this.notificationService.setOnTimerPage(false);
    
    // DON'T cleanup the timer sync service if timer is still running
    // This allows the timer to continue in the background when navigating away
    // The timer will continue and trigger notifications even on other pages
    if (!this.timerSyncService.isRunning()) {
      this.timerSyncService.cleanup();
    } else {
      console.log('[Session Timer] Timer still running - keeping timer sync service active for background notifications');
    }
    
    // Restore original browser tab title
    if (isPlatformBrowser(this.platformId)) {
      this.document.title = this.originalTitle;
      
      // Remove visibility change listener
      if (this.visibilityChangeHandler) {
        document.removeEventListener('visibilitychange', this.visibilityChangeHandler);
        this.visibilityChangeHandler = null;
      }
    }
    
    // Clean up auto-start timeout
    if (this.autoStartTimeoutId) {
      clearTimeout(this.autoStartTimeoutId);
      this.autoStartTimeoutId = null;
    }
    
    // Hide auto-start countdown if showing
    this.hideAutoStartCountdown();
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
        
        // Store the activity's color from backend
        if (activity.color) {
          this.activityColorFromBackend.set(activity.color);
        }
        
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
        console.log('📋 Session loaded:', {
          id: sess.id,
          status: sess.status,
          currentPhase: sess.currentPhase,
          focusTime: sess.focusTimeInMinutes,
          breakTime: sess.breakTimeInMinutes,
          remainingPhaseSeconds: sess.remainingPhaseSeconds,
          note: sess.note
        });
        
        this.session.set(sess);
        // Defensive: handle note as string or object with 'content' field
        const noteValue = sess.note;
        this.notes = typeof noteValue === 'string'
          ? noteValue
          : (noteValue && typeof noteValue === 'object' && 'content' in noteValue && typeof (noteValue as any).content === 'string'
              ? (noteValue as any).content
              : '');
        
        // Load todos from backend note if available, otherwise from local storage
        if (noteValue && typeof noteValue === 'object' && 'items' in noteValue && Array.isArray((noteValue as any).items)) {
          const backendTodos = (noteValue as any).items.map((item: any) => ({
            id: item.id || this.nextTodoId++,
            text: item.text || '',
            done: item.done || false
          }));
          if (backendTodos.length > 0) {
            this.todos.set(backendTodos);
            const maxId = backendTodos.reduce((max: number, t: any) => Math.max(max, t.id), 0);
            this.nextTodoId = maxId + 1;
          } else {
            // Fallback to local storage if no backend todos
            this.loadTodosFromStorage(sess);
          }
        } else {
          // Fallback to local storage
          this.loadTodosFromStorage(sess);
        }
        
        this.loading.set(false);
        
        // Initialize timer sync service with session data
        if (isPlatformBrowser(this.platformId)) {
          const actId = this.activityId();
          if (actId) {
            this.timerSyncService.initializeTimer(sess, actId, this.activityTitle());
          }
          
          // Check for missed notification (backend sent FCM but user wasn't in app)
          this.checkForMissedNotification(sess);
        }
      }
    });
  }

  /**
   * Check if backend sent a notification while user was away (browser closed)
   * 
   * The backend scheduler now pauses the session after sending a notification,
   * so when the user returns, the session will be in PAUSED state with the
   * next phase already set. We just need to update the UI to reflect this.
   * 
   * Cases handled:
   * 1. Session is PAUSED with timer at full phase duration - scheduler processed it
   * 2. Session is IN_PROGRESS with timer at 0 - timer just completed, needs transition
   * 3. Session is COMPLETED - all cycles done
   */
  private checkForMissedNotification(sess: PomodoroSession): void {
    const sessionNotCompleted = sess.status !== 'COMPLETED' && sess.status !== 'ABANDONED';
    
    if (!sessionNotCompleted) {
      // Session is completed or abandoned - nothing to do
      if (sess.status === 'COMPLETED') {
        console.log('📱 Session is COMPLETED - stopping timer');
        this.timerSyncService.stopTimer();
      }
      return;
    }
    
    // Case 1: Backend scheduler already processed the phase completion
    // Session is PAUSED and waiting for user to start the next phase
    if (sess.status === 'PAUSED') {
      console.log('📱 Session is PAUSED - backend scheduler already processed phase completion');
      console.log('📱 Current phase:', sess.currentPhase, 'Remaining seconds:', sess.remainingPhaseSeconds);
      
      // Mark that we're at the start of a new phase (button should show "Start")
      this.isAtPhaseStart.set(true);
      
      // The notification was already sent by the scheduler, so skip sending another
      this.notificationSentForCurrentPhase = true;
      
      // Check auto-start settings for the current phase
      const currentPhase = sess.currentPhase as 'FOCUS' | 'BREAK' | 'LONG_BREAK';
      this.checkAndAutoStartNextPhase(currentPhase);
      return;
    }
    
    // Case 2: Timer reached 0 but phase wasn't transitioned yet (rare edge case)
    // This can happen if the backend scheduler hasn't run yet (10 second interval)
    const timerAtZero = sess.remainingPhaseSeconds !== undefined && sess.remainingPhaseSeconds <= 0;
    const sessionInProgress = sess.status === 'IN_PROGRESS';
    
    if (timerAtZero && sessionInProgress) {
      console.log('📱 Detected timer at 0 with IN_PROGRESS status - triggering phase completion');
      
      // Set the notification guard - we'll send notification as part of phase completion
      this.notificationSentForCurrentPhase = false;
      
      // Trigger phase completion to transition to next phase
      this.handlePhaseComplete();
    }
  }

  /* -------------------- TIMER LOGIC -------------------- */

  private handleTimerComplete(): void {
    console.log('⏰ Timer completed - handling phase completion');
    this.handlePhaseComplete();
  }

  /* -------------------- USER ACTIONS -------------------- */

  // Inline Timer Editing - Only Freestyle sessions can be edited
  protected canEditTimer(): boolean {
    const sess = this.session();
    // Only allow editing for FREESTYLE sessions when PENDING or PAUSED
    // CLASSIC sessions have fixed durations: 25 min focus, 5 min break, 15 min long break
    return !!sess && 
           sess.sessionType === 'FREESTYLE' && 
           sess.status !== 'COMPLETED' && 
           sess.status !== 'IN_PROGRESS';
  }

  protected openTimePicker(): void {
    if (!this.canEditTimer()) return;

    const currentSeconds = this.remainingSeconds();
    const minutes = Math.floor(currentSeconds / 60);
    const seconds = currentSeconds % 60;

    const dialogRef = this.dialog.open(TimePickerModalComponent, {
      data: { minutes, seconds } as TimePickerData,
      width: '400px',
      panelClass: 'time-picker-dialog'
    });

    dialogRef.afterClosed().subscribe((result: TimePickerData | undefined) => {
      if (result) {
        this.updateTimerFromPicker(result);
      }
    });
  }

  private updateTimerFromPicker(data: TimePickerData): void {
    const phase = this.currentPhase();
    let totalSeconds = (data.minutes * 60) + data.seconds;
    let totalMinutes = Math.ceil(totalSeconds / 60);

    // Validation (Clamp)
    if (phase === 'FOCUS') {
      if (totalMinutes < 1) totalMinutes = 1;
      if (totalMinutes > 180) totalMinutes = 180;
    } else if (phase === 'BREAK') {
      if (totalMinutes < 2) totalMinutes = 2;
      if (totalMinutes > 10) totalMinutes = 10;
    } else if (phase === 'LONG_BREAK') {
      if (totalMinutes < 15) totalMinutes = 15;
      if (totalMinutes > 30) totalMinutes = 30;
    }
    
    // Clamp seconds based on minutes limits
    let minSec = 0;
    let maxSec = 0;
    
    if (phase === 'FOCUS') {
        minSec = 1 * 60;
        maxSec = 180 * 60;
    } else if (phase === 'BREAK') {
        minSec = 2 * 60;
        maxSec = 10 * 60;
    } else if (phase === 'LONG_BREAK') {
        minSec = 15 * 60;
        maxSec = 30 * 60;
    }
    
    if (totalSeconds < minSec) totalSeconds = minSec;
    if (totalSeconds > maxSec) totalSeconds = maxSec;
    
    // Update Timer
    this.timerSyncService.setRemainingSeconds(totalSeconds);
    
    // Update Backend
    const sess = this.session();
    const actId = this.activityId();
    if (sess && actId) {
        let updateReq: any = {
            sessionType: sess.sessionType,
            focusTimeInMinutes: sess.focusTimeInMinutes,
            breakTimeInMinutes: sess.breakTimeInMinutes,
            cycles: sess.cycles,
            enableLongBreak: sess.enableLongBreak,
            longBreakTimeInMinutes: sess.longBreakTimeInMinutes,
            longBreakIntervalInMinutes: sess.longBreakIntervalInMinutes
        };
        
        // We send minutes to backend.
        const minutesToSend = Math.ceil(totalSeconds / 60);
        
        if (phase === 'FOCUS') {
            updateReq.focusTimeInMinutes = minutesToSend;
        } else if (phase === 'BREAK') {
            updateReq.breakTimeInMinutes = minutesToSend;
        } else if (phase === 'LONG_BREAK') {
            updateReq.longBreakTimeInMinutes = minutesToSend;
        }
        
        this.sessionService.updateSession(actId, sess.id, updateReq).subscribe({
            next: (updatedSession) => {
                this.session.set(updatedSession);
                console.log('✅ Session settings updated:', updatedSession);
            },
            error: (err) => console.error('❌ Failed to update session settings:', err)
        });
    }
  }

  protected completeEarly(): void {
    const sess = this.session();
    const actId = this.activityId();
    if (!sess || !actId) return;

    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Complete Session Early?',
        message: 'Are you sure you want to complete this session early? If at least 1 focus phase is completed, it will be marked as COMPLETED. Otherwise, it will be marked as NOT STARTED.',
        confirmText: 'Complete Early',
        cancelText: 'Cancel',
        type: 'warning'
      } as ConfirmDialogData
    });

    dialogRef.afterClosed().pipe(
      filter(result => !!result),
      switchMap(() => {
        this.loading.set(true);
        return this.sessionService.completeEarly(actId, sess.id);
      })
    ).subscribe({
      next: (updatedSession) => {
        this.session.set(updatedSession);
        this.loading.set(false);
        this.goBack();
      },
      error: (err) => {
        this.handleError(err, 'complete session early');
        this.loading.set(false);
      }
    });
  }

  /**
   * Complete Session button handler (Freestyle only)
   * If no cycle completed -> NOT_STARTED
   * If at least 1 cycle completed -> COMPLETED
   */
  protected completeSession(): void {
    const sess = this.session();
    const actId = this.activityId();
    if (!sess || !actId) return;

    const cyclesCompleted = sess.cyclesCompleted || 0;
    const hasCompletedFocus = cyclesCompleted > 0;

    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Complete Session?',
        message: hasCompletedFocus 
          ? `You have completed ${cyclesCompleted} cycle(s). This session will be marked as COMPLETED and you won't be able to edit the notes anymore.`
          : 'You haven\'t completed any cycles yet. This session will be marked as NOT STARTED and reset.',
        confirmText: hasCompletedFocus ? 'Complete Session' : 'Mark as Not Started',
        cancelText: 'Cancel',
        type: hasCompletedFocus ? 'info' : 'warning'
      } as ConfirmDialogData
    });

    dialogRef.afterClosed().pipe(
      filter(result => !!result),
      switchMap(() => {
        this.loading.set(true);
        this.timerSyncService.stopTimer();
        return this.sessionService.completeEarly(actId, sess.id);
      })
    ).subscribe({
      next: (updatedSession) => {
        this.session.set(updatedSession);
        this.loading.set(false);
        this.goBack();
      },
      error: (err) => {
        this.handleError(err, 'complete session');
        this.loading.set(false);
      }
    });
  }

  /**
   * Start session with confirmation modal (only for FREESTYLE sessions)
   * CLASSIC sessions start directly without confirmation since they are uneditable
   */
  protected confirmAndStartSession(): void {
    const sess = this.session();
    const actId = this.activityId();
    if (!sess || !actId) return;

    // Classic sessions start directly without confirmation (they're uneditable anyway)
    if (sess.sessionType === 'CLASSIC') {
      this.startSession();
      return;
    }

    // Freestyle sessions show confirmation modal
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Start Session?',
        message: 'Once you start this session, it will be marked as IN PROGRESS. You won\'t be able to edit the timer duration while the session is running.',
        confirmText: 'Start Session',
        cancelText: 'Cancel',
        type: 'info'
      } as ConfirmDialogData
    });

    dialogRef.afterClosed().subscribe((confirmed: boolean) => {
      if (confirmed) {
        this.startSession();
      }
    });
  }

  /**
   * Skip to next phase
   * - If current phase is FOCUS, switches to BREAK (doesn't count as cycle completion)
   * - If current phase is BREAK, switches to FOCUS (cycle only counts if focus was completed)
   */
  protected skipPhase(): void {
    const sess = this.session();
    const actId = this.activityId();
    if (!sess || !actId) return;

    const currentPhase = sess.currentPhase || 'FOCUS';
    const nextPhase = currentPhase === 'FOCUS' ? 'BREAK' : 'FOCUS';
    
    // Call backend to skip phase
    this.sessionService.skipPhase(actId, sess.id).subscribe({
      next: (updated) => {
        this.session.set(updated);
        this.timerSyncService.updateFromSession(updated);
        
        // If was running, keep it running in the new phase
        if (sess.status === 'IN_PROGRESS') {
          this.timerSyncService.startTimer();
        }
      },
      error: (err) => {
        // Handle locally if backend fails
        console.warn('[Session Timer] Skip phase failed, handling locally:', err);
        
        // Calculate the new timer value based on the next phase
        const newTime = nextPhase === 'FOCUS' 
          ? (sess.focusTimeInMinutes || 25) * 60
          : (sess.breakTimeInMinutes || 5) * 60;
        
        const localUpdated: PomodoroSession = {
          ...sess,
          currentPhase: nextPhase,
          remainingPhaseSeconds: newTime
        };
        
        this.session.set(localUpdated);
        this.timerSyncService.updateFromSession(localUpdated);
        
        // If was running, keep it running
        if (sess.status === 'IN_PROGRESS') {
          this.timerSyncService.startTimer();
        }
      }
    });
  }

  /**
   * Reset session to beginning (NOT_STARTED)
   * Only appears after pause
   */
  protected resetSession(): void {
    const sess = this.session();
    const actId = this.activityId();
    if (!sess || !actId) return;

    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Reset Session?',
        message: 'Are you sure you want to reset this session? All progress will be lost and the session will be marked as NOT STARTED. You can then start fresh or stop to abandon the session.',
        confirmText: 'Reset Session',
        cancelText: 'Cancel',
        type: 'danger'
      } as ConfirmDialogData
    });

    dialogRef.afterClosed().pipe(
      filter(result => !!result),
      switchMap(() => {
        this.loading.set(true);
        this.timerSyncService.stopTimer();
        return this.sessionService.resetSession(actId, sess.id);
      })
    ).subscribe({
      next: (updatedSession) => {
        this.session.set(updatedSession);
        this.timerSyncService.updateFromSession(updatedSession);
        this.sessionHasBeenReset.set(true);
        this.loading.set(false);
      },
      error: (err) => {
        // Handle locally if backend fails
        console.warn('[Session Timer] Reset session failed, handling locally:', err);
        
        const resetSession: PomodoroSession = {
          ...sess,
          status: 'NOT_STARTED',
          currentPhase: 'FOCUS',
          cyclesCompleted: 0,
          remainingPhaseSeconds: (sess.focusTimeInMinutes || 25) * 60
        };
        
        this.session.set(resetSession);
        this.timerSyncService.updateFromSession(resetSession);
        this.sessionHasBeenReset.set(true);
        this.loading.set(false);
      }
    });
  }

  /**
   * Resume session action (public method for template)
   */
  protected resumeSessionAction(): void {
    this.resumeSession();
  }

  protected abandonSession(): void {
    const sess = this.session();
    const actId = this.activityId();
    if (!sess || !actId) return;

    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Abandon Session?',
        message: 'Are you sure you want to abandon this session? It will be marked as ABANDONED.',
        confirmText: 'Abandon',
        cancelText: 'Cancel',
        type: 'danger'
      } as ConfirmDialogData
    });

    dialogRef.afterClosed().pipe(
      filter(result => !!result),
      switchMap(() => {
        this.loading.set(true);
        return this.sessionService.stopSession(actId, sess.id);
      })
    ).subscribe({
      next: (updatedSession) => {
        this.session.set(updatedSession);
        this.loading.set(false);
        this.goBack();
      },
      error: (err) => {
        this.handleError(err, 'abandon session');
        this.loading.set(false);
      }
    });
  }

  protected startSession(): void {
    const sess = this.session();
    const actId = this.activityId();
    console.log('🎬 Starting session...', { sessionId: sess?.id, activityId: actId, status: sess?.status });
    if (!sess || !actId) return;

    // Clear the reset flag when starting
    this.sessionHasBeenReset.set(false);

    // If paused normally (user pressed pause), resume via API
    if (sess.status === 'PAUSED') {
      this.resumeSession();
      return;
    }

    // Otherwise start the session
    console.log('📡 Calling backend to start session...');
    this.sessionService.startSession(actId, sess.id).subscribe({
      next: (updated) => {
        console.log('✅ Session started successfully:', updated.status);
        this.session.set(updated);
        this.timerSyncService.updateFromSession(updated);
        this.timerSyncService.startTimer();
      },
      error: (err) => {
        // If start fails, still start the timer locally to prevent disruption
        console.log('[Session Timer] Start failed, handling gracefully:', err);
        if (err instanceof HttpErrorResponse && err.status === 401) {
          const startedSession: PomodoroSession = {
            ...sess,
            status: 'IN_PROGRESS'
          };
          this.session.set(startedSession);
          this.timerSyncService.updateFromSession(startedSession);
          this.timerSyncService.startTimer();
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

    // Capture current remaining time BEFORE pausing
    const currentRemaining = this.timerSyncService.remainingSeconds();

    // Pause timer sync service
    this.timerSyncService.pauseTimer();
    
    // Mark that we're pausing mid-phase (not at start of new phase)
    this.isAtPhaseStart.set(false);

    // Update local state immediately
    const pausedSession: PomodoroSession = {
      ...sess,
      status: 'PAUSED',
      remainingPhaseSeconds: currentRemaining
    };
    this.session.set(pausedSession);

    // Try to sync with backend (fire and forget - don't update local state from response)
    this.sessionService.pauseSession(actId, sess.id).pipe(
      catchError(err => {
        console.log('[Session Timer] Pause sync failed, continuing with local state:', err);
        return of(null);
      })
    ).subscribe({
      next: (updated) => {
        if (updated) {
          // Only update session metadata, NOT the timer state
          // Keep our local remaining time as the source of truth
          this.session.set({
            ...updated,
            remainingPhaseSeconds: currentRemaining
          });
          // Don't call updateFromSession - it would overwrite our correct local timer
        }
      }
    });
  }

  /**
   * Start a new phase (called when at beginning of a phase, not resuming mid-phase)
   */
  protected startPhase(): void {
    const sess = this.session();
    const actId = this.activityId();
    if (!sess || !actId) return;

    console.log('[Session Timer] Starting new phase:', sess.currentPhase);
    
    // Clear the reset flag when starting a phase
    this.sessionHasBeenReset.set(false);
    
    // Mark that we're no longer at phase start
    this.isAtPhaseStart.set(false);

    // Call start/resume on backend to begin the phase
    this.sessionService.resumeSession(actId, sess.id).subscribe({
      next: (updated) => {
        const runningSession: PomodoroSession = {
          ...updated,
          status: 'IN_PROGRESS'
        };
        this.session.set(runningSession);
        this.timerSyncService.updateFromSession(runningSession);
        this.timerSyncService.startTimer();
      },
      error: (err) => {
        // If API fails, start timer locally anyway
        console.log('[Session Timer] Start phase API failed, starting locally:', err);
        const runningSession: PomodoroSession = {
          ...sess,
          status: 'IN_PROGRESS'
        };
        this.session.set(runningSession);
        this.timerSyncService.startTimer();
      }
    });
  }

  private resumeSession(): void {
    const sess = this.session();
    const actId = this.activityId();
    if (!sess || !actId) return;

    // Clear the reset flag when resuming (for classic mode button pairing)
    this.sessionHasBeenReset.set(false);

    this.sessionService.resumeSession(actId, sess.id).subscribe({
      next: (updated) => {
        this.session.set(updated);
        this.timerSyncService.updateFromSession(updated);
        this.timerSyncService.startTimer();
      },
      error: (err) => {
        // If resume fails, update local state and start timer anyway
        console.log('[Session Timer] Resume failed, handling gracefully:', err);
        const resumedSession: PomodoroSession = {
          ...sess,
          status: 'IN_PROGRESS'
        };
        this.session.set(resumedSession);
        this.timerSyncService.updateFromSession(resumedSession);
        this.timerSyncService.startTimer();
      }
    });
  }

  protected stopSession(): void {
    const sess = this.session();
    const actId = this.activityId();
    if (!sess || !actId) return;

    // Open confirmation dialog
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: {
        title: 'Stop Session',
        message: 'Are you sure you want to stop this session? The current cycle will be invalidated.',
        confirmText: 'Stop',
        cancelText: 'Cancel'
      } as ConfirmDialogData
    }) as any;

    dialogRef.afterClosed().subscribe((confirmed: boolean) => {
      if (!confirmed) return;

      this.timerSyncService.stopTimer();

      this.sessionService.stopSession(actId, sess.id).subscribe({
        next: (updated) => {
          this.session.set(updated);
          this.goBack();
        },
        error: (err) => {
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

    // Open confirmation dialog
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: {
        title: 'Complete Session Early',
        message: 'Complete this session early? This will mark it as COMPLETED.',
        confirmText: 'Complete',
        cancelText: 'Cancel'
      } as ConfirmDialogData
    }) as any;

    dialogRef.afterClosed().subscribe((confirmed: boolean) => {
      if (!confirmed) return;

      this.timerSyncService.stopTimer();

      this.sessionService.finishSession(actId, sess.id, this.notes).subscribe({
        next: (updated) => {
          this.session.set(updated);
          this.timerSyncService.setRemainingSeconds(0);
          setTimeout(() => this.goBack(), 1500);
        },
        error: (err) => {
          console.log('[Session Timer] Complete early failed, handling locally:', err);
          const completedSession: PomodoroSession = {
            ...sess,
            status: 'COMPLETED'
          };
          this.session.set(completedSession);
          this.timerSyncService.setRemainingSeconds(0);
          setTimeout(() => this.goBack(), 1500);
        }
      });
    });
  }

  // ...existing code...
  private handlePhaseComplete(): void {
    const sess = this.session();
    const actId = this.activityId();
    if (!sess || !actId) return;

    // CRITICAL: If tab is not visible, let the backend scheduler handle phase completion
    // This prevents race conditions where frontend calls completePhase() before backend
    // can send FCM push notification. Backend scheduler will:
    // 1. Find the session (status=IN_PROGRESS, phaseEndTime <= now)
    // 2. Send FCM push notification
    // 3. Transition to next phase and set status to PAUSED
    if (document.hidden) {
      console.log('[Session Timer] Tab not visible - letting backend scheduler handle phase completion');
      // Stop the local timer to prevent it from going negative
      this.timerSyncService.pauseTimer();
      return;
    }

    // Store local phase for comparison
    const localPhase = sess.currentPhase || 'FOCUS';
    const localCycles = sess.cyclesCompleted || 0;

    // First, fetch the latest session state from backend to check if phase was already transitioned
    // This prevents duplicate notifications when backend scheduler already processed the phase
    this.sessionService.getSession(actId, sess.id).subscribe({
      next: (latestSession) => {
        // Check if backend already transitioned to a different phase or incremented cycles
        const backendPhase = latestSession.currentPhase;
        const backendCycles = latestSession.cyclesCompleted || 0;
        const backendStatus = latestSession.status;
        
        const phaseChanged = backendPhase !== localPhase;
        const cyclesChanged = backendCycles !== localCycles;
        const isNotInProgress = backendStatus === 'PAUSED' || backendStatus === 'COMPLETED';
        
        if (phaseChanged || cyclesChanged || isNotInProgress) {
          // Backend already processed the phase transition - just sync UI, no notification
          console.log(`[Session Timer] Backend already processed phase transition:`, {
            localPhase,
            backendPhase,
            localCycles,
            backendCycles,
            backendStatus
          });
          
          this.session.set(latestSession);
          this.timerSyncService.initializeTimer(latestSession, actId, this.activityTitle());
          this.isAtPhaseStart.set(true);
          this.notificationSentForCurrentPhase = true; // Backend already sent notification
          
          // Handle completed session
          if (backendStatus === 'COMPLETED') {
            console.log('[Session Timer] Session completed by backend');
            this.timerSyncService.stopTimer();
            return;
          }
          
          // Check auto-start for the new phase
          if (backendPhase) {
            this.checkAndAutoStartNextPhase(backendPhase as 'FOCUS' | 'BREAK' | 'LONG_BREAK');
          }
          return;
        }
        
        // Backend hasn't processed yet - proceed with normal phase completion
        this.processPhaseCompletion(sess, actId, localPhase);
      },
      error: (err) => {
        // If we can't fetch latest state, proceed with local phase completion
        console.log('[Session Timer] Could not fetch latest session state, proceeding locally:', err);
        const localPhase = sess.currentPhase || 'FOCUS';
        this.processPhaseCompletion(sess, actId, localPhase);
      }
    });
  }

  /**
   * Process phase completion after confirming backend hasn't already done it
   */
  private processPhaseCompletion(sess: PomodoroSession, actId: number, currentPhase: string): void {
    // After any break (BREAK or LONG_BREAK), go to FOCUS. After FOCUS, go to BREAK (backend determines if it's LONG_BREAK)
    // Note: Optimistic update uses BREAK, backend response will have the correct phase (BREAK or LONG_BREAK)
    const nextPhase: 'FOCUS' | 'BREAK' = currentPhase === 'FOCUS' ? 'BREAK' : 'FOCUS';
    // Increment cycles when completing any break phase (BREAK or LONG_BREAK)
    const newCyclesCompleted = (currentPhase === 'BREAK' || currentPhase === 'LONG_BREAK') 
      ? (sess.cyclesCompleted || 0) + 1 
      : sess.cyclesCompleted || 0;
    
    // Mark that we're at the start of a new phase (button should show "Start" not "Resume")
    this.isAtPhaseStart.set(true);
    
    // Only trigger notification if we haven't already sent one for this phase
    // (prevents duplicate notifications when returning to page after timer completed in background)
    if (!this.notificationSentForCurrentPhase) {
      // Trigger notification BEFORE optimistic update so it shows the correct completed phase
      this.triggerPhaseCompletionNotification(currentPhase as 'FOCUS' | 'BREAK' | 'LONG_BREAK');
    }
    
    // Reset the notification guard for the new phase AFTER notification is sent
    // This allows the next phase completion to trigger a notification
    this.notificationSentForCurrentPhase = false;
    
    // Optimistic update: immediately update the UI to show new phase
    // Use IN_PROGRESS status but timer is not running (controlled by frontend)
    const optimisticSession: PomodoroSession = {
      ...sess,
      status: 'IN_PROGRESS', // Keep as IN_PROGRESS, timer just isn't running
      currentPhase: nextPhase,
      cyclesCompleted: newCyclesCompleted
    };
    this.session.set(optimisticSession);
    
    // Update timer to show the new phase duration (not running yet)
    // Note: For optimistic update, we use breakTimeInMinutes for BREAK. 
    // Backend will return the correct phase (BREAK or LONG_BREAK) with proper duration.
    const newPhaseDuration = nextPhase === 'FOCUS' 
      ? (sess.focusTimeInMinutes || 25) * 60 
      : (sess.breakTimeInMinutes || 5) * 60;
    this.timerSyncService.setRemainingSeconds(newPhaseDuration);
    this.timerSyncService.pauseTimer(); // Ensure timer is paused

    this.sessionService.completePhase(actId, sess.id).subscribe({
      next: (updated) => {
        // Sync with backend response - backend determines the actual next phase (BREAK vs LONG_BREAK)
        const syncedSession: PomodoroSession = {
          ...updated,
          status: 'IN_PROGRESS' // Keep IN_PROGRESS, frontend controls timer
        };
        this.session.set(syncedSession);
        
        // Update timer with correct duration from backend (handles LONG_BREAK properly)
        if (updated.remainingPhaseSeconds !== undefined) {
          this.timerSyncService.setRemainingSeconds(updated.remainingPhaseSeconds);
        }
        
        // If session is now completed, show completion message
        if (updated.status === 'COMPLETED') {
          console.log('🎉 Session completed - triggering session completion notification');
          this.session.set(updated);
          this.timerSyncService.setRemainingSeconds(0);
          this.triggerSessionCompletionNotification();
          return;
        }
        
        // Check auto-start settings and start next phase if enabled
        // Use the actual phase from backend response
        const actualNextPhase = updated.currentPhase as 'FOCUS' | 'BREAK' | 'LONG_BREAK';
        this.checkAndAutoStartNextPhase(actualNextPhase);
      },
      error: (err) => {
        console.log('[Session Timer] Complete phase failed, optimistic update already applied:', err);
        
        // Still check auto-start even if backend fails
        this.checkAndAutoStartNextPhase(nextPhase);
        
        // Only show error for non-auth issues
        if (!(err instanceof HttpErrorResponse && err.status === 401)) {
          this.handleError(err, 'complete phase');
        }
      }
    });
  }
  
  /**
   * Check auto-start settings and automatically start the next phase if enabled
   */
  private checkAndAutoStartNextPhase(nextPhase: 'FOCUS' | 'BREAK' | 'LONG_BREAK'): void {
    const settings = this.settingsService.getSettings();
    // Treat LONG_BREAK the same as BREAK for auto-start purposes
    const isBreakPhase = nextPhase === 'BREAK' || nextPhase === 'LONG_BREAK';
    const shouldAutoStart = isBreakPhase 
      ? settings.autoStart.autoStartBreaks 
      : settings.autoStart.autoStartPomodoros;
    
    if (shouldAutoStart) {
      console.log(`[Session Timer] Auto-starting ${nextPhase} phase based on settings`);
      // Use a short delay to let UI update, then auto-start
      setTimeout(() => {
        this.startPhase();
      }, 500);
    } else {
      console.log(`[Session Timer] Auto-start disabled for ${nextPhase}, waiting for user input`);
    }
  }

  protected goBack(): void {
    console.log('[goBack] Navigating away - session should stay IN_PROGRESS');
    console.log('[goBack] Current session status:', this.session()?.status);
    console.log('[goBack] Timer sync service will handle persistence');
    
    // The timer sync service will continue tracking time in the background
    // When user returns, it will restore the correct timer state
    
    // Navigate back to sessions list for this activity
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

  protected onNotesChanged(event: Event): void {
    const target = event.target as HTMLTextAreaElement;
    this.notes = target.value;
    this.saveNotesToLocalStorage();
    if (this.notesDebounceTimeout) clearTimeout(this.notesDebounceTimeout);
    this.notesDebounceTimeout = setTimeout(() => {
      this.saveNotesToBackend();
    }, 5000);
  }

  protected saveNotes(): void {
    // Deprecated: use debounced save instead
    // This method can be used for manual save if needed
    this.saveNotesToBackend();
  }

  private saveNotesToLocalStorage(): void {
    const sess = this.session();
    if (!sess) return;
    window.localStorage.setItem(`pomodify_session_notes_${sess.activityId}_${sess.id}`, this.notes);
  }

  private saveNotesToBackend(): void {
    const sess = this.session();
    const actId = this.activityId();
    if (!sess || !actId) return;
    this.sessionService.updateNote(actId, sess.id, this.notes).subscribe({
      next: (updated) => {
        console.log('[Session Timer] Note updated:', updated.note);
        const current = this.session();
        // Defensive: handle note as string or object with 'content' field
        const noteValue = updated.note;
        const safeNote = typeof noteValue === 'string'
          ? noteValue
          : (noteValue && typeof noteValue === 'object' && 'content' in noteValue && typeof (noteValue as any).content === 'string'
              ? (noteValue as any).content
              : this.notes); // Preserve current notes if response format is unexpected
        if (current) {
          // Preserve current timer/phase state but sync note from backend
          this.session.set({ ...current, note: safeNote });
        } else {
          this.session.set({ ...updated, note: safeNote });
        }
        // Only update this.notes if we got a valid response
        if (safeNote) {
          this.notes = safeNote;
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
      done: false
    };
    this.todos.update(list => [...list, newTodo]);
    this.persistTodos();
    this.onTodosChanged();
  }

  /**
   * Generate AI-suggested todos based on activity title and previous session notes
   */
  protected generateAiTodos(): void {
    const actId = this.activityId();
    if (!actId) {
      console.warn('[Session Timer] Cannot generate AI todos: no activity ID');
      return;
    }

    this.isGeneratingAi.set(true);
    console.log('🤖 Generating AI suggestions for activity:', this.activityTitle());

    // Get current todo texts to avoid duplicates
    const currentTodos = this.todos().map(t => t.text).filter(t => t && t.trim() !== '');

    this.aiService.suggestNextStep({ activityId: actId, currentTodos }).subscribe({
      next: (response) => {
        console.log('✨ AI suggestion received:', response);
        
        // Parse the suggested note into todo items
        const suggestions = this.parseAiSuggestionToTodos(response.suggestedNote);
        
        // Add each suggestion as a new todo
        suggestions.forEach(text => {
          const newTodo = {
            id: this.nextTodoId++,
            text: text,
            done: false
          };
          this.todos.update(list => [...list, newTodo]);
        });
        
        this.persistTodos();
        this.onTodosChanged();
        this.isGeneratingAi.set(false);
        
        console.log(`✅ Added ${suggestions.length} AI-suggested todo(s)`);
      },
      error: (err) => {
        console.error('[Session Timer] AI suggestion failed:', err);
        this.isGeneratingAi.set(false);
        // No fallback - let the error propagate so user knows AI failed
      }
    });
  }

  /**
   * Parse AI suggestion text into individual todo items
   */
  private parseAiSuggestionToTodos(suggestion: string): string[] {
    if (!suggestion || suggestion.trim() === '') {
      return [];
    }

    // Try to split by common delimiters (newlines, numbered lists, bullet points)
    const lines = suggestion
      .split(/[\n\r]+|(?:\d+\.\s)|(?:[-•]\s)/)
      .map(line => line.trim())
      .filter(line => line.length > 0 && line.length < 200);

    // If we got multiple items, return them
    if (lines.length > 1) {
      return lines.slice(0, 5); // Limit to 5 items max
    }

    // Otherwise return the whole suggestion as a single todo
    return [suggestion.trim()];
  }

  protected removeTodo(id: number): void {
    this.todos.update(list => list.filter(todo => todo.id !== id));
    this.persistTodos();
    this.onTodosChanged();
  }

  protected updateTodoText(id: number, text: string): void {
    this.todos.update(list =>
      list.map(todo => todo.id === id ? { ...todo, text } : todo)
    );
    this.persistTodos();
    this.onTodosChanged();
  }

  protected toggleTodo(id: number): void {
    this.todos.update(list =>
      list.map(todo => todo.id === id ? { ...todo, done: !todo.done } : todo)
    );
    this.persistTodos();
    this.onTodosChanged();
  }

  private onTodosChanged(): void {
    this.saveTodosToLocalStorage();
    if (this.todosDebounceTimeout) clearTimeout(this.todosDebounceTimeout);
    this.todosDebounceTimeout = setTimeout(() => {
      this.saveTodosToBackend();
    }, 5000);
  }

  private saveTodosToLocalStorage(): void {
    const sess = this.session();
    if (!sess) return;
    const key = this.getTodosStorageKey(sess);
    if (!key) return;
    try {
      const value = JSON.stringify(this.todos());
      window.localStorage.setItem(key, value);
    } catch (e) {
      console.warn('[Session Timer] Failed to persist todos to storage', e);
    }
  }

  private saveTodosToBackend(): void {
    const sess = this.session();
    const actId = this.activityId();
    if (!sess || !actId) return;
    this.sessionService.saveTodos(actId, sess.id, this.todos()).subscribe({
      next: () => {
        console.log('[Session Timer] Todos saved to backend');
      },
      error: (err) => {
        console.error('[Session Timer] Failed to save todos:', err);
      }
    });
  }

  /* -------------------- PHASE SWITCHING -------------------- */

  protected switchToPhase(phase: 'FOCUS' | 'BREAK'): void {
    // Allow switching phases when session is NOT_STARTED or PAUSED
    if (!this.isNotStarted() && !this.isPaused()) {
      return;
    }

    const sess = this.session();
    if (!sess) return;

    // Don't switch if already in the requested phase
    if (sess.currentPhase === phase) {
      return;
    }

    // Update the session's current phase locally
    const updatedSession: PomodoroSession = {
      ...sess,
      currentPhase: phase
    };
    this.session.set(updatedSession);

    // Update timer sync service with new phase
    this.timerSyncService.updateFromSession(updatedSession);
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

  /* -------------------- NOTIFICATION HANDLERS -------------------- */

  private async triggerSessionCompletionNotification(): Promise<void> {
    console.log('🎯 Session completion notification triggered');
    
    const sess = this.session();
    if (!sess) return;
    
    const activityTitle = this.activityTitle();
    
    const context = {
      title: 'Session Complete!',
      body: `Great work! You completed your session for "${activityTitle}"`,
      sessionId: sess.id,
      activityId: sess.activityId,
      activityTitle: activityTitle,
      type: 'session-complete' as const
    };
    
    await this.notificationService.handleSessionCompletion(context);
  }

  private async triggerPhaseCompletionNotification(completedPhase: 'FOCUS' | 'BREAK' | 'LONG_BREAK'): Promise<void> {
    console.log('🎯 Phase completion notification triggered for:', completedPhase);
    
    const sess = this.session();
    if (!sess) return;
    
    const activityTitle = this.activityTitle();
    // After any break (BREAK or LONG_BREAK), next is FOCUS. After FOCUS, next is BREAK.
    const nextPhase = completedPhase === 'FOCUS' ? 'BREAK' : 'FOCUS';
    
    // Format the completed phase name for display
    const completedPhaseName = completedPhase === 'LONG_BREAK' ? 'Long Break' : completedPhase;
    
    const context = {
      title: `${completedPhaseName} Phase Complete!`,
      body: `Time for a ${nextPhase.toLowerCase()} in "${activityTitle}"`,
      sessionId: sess.id,
      activityId: sess.activityId,
      activityTitle: activityTitle,
      type: 'phase-complete' as const
    };
    
    await this.notificationService.handlePhaseCompletion(context);
    
    // Note: Auto-start is handled by handlePhaseComplete after backend call completes
  }

  protected async testTimerNotification(): Promise<void> {
    console.log('🧪 Testing timer notification manually...');
    
    const sess = this.session();
    if (!sess) return;
    
    const settings = this.settingsService.getSettings();
    console.log('🔧 Current settings:', { notifications: settings.notifications, sound: settings.sound.enabled });
    console.log('🔧 Tab hidden:', document.hidden);
    
    // Test the notification service directly
    await this.notificationService.testDesktopNotification();
  }

  protected async forceTestNotification(): Promise<void> {
    console.log('🚨 FORCE testing desktop notification (bypassing settings)...');
    
    const sess = this.session();
    if (!sess) return;
    
    const activityTitle = this.activityTitle();
    
    const testContext = {
      title: 'FORCE TEST: Timer Complete!',
      body: `Force test notification for "${activityTitle}" (bypassing settings)`,
      sessionId: sess.id,
      activityId: sess.activityId
    };
    
    await this.notificationService.forceDesktopNotification(testContext);
  }

  protected async forceTimerZero(): Promise<void> {
    console.log('🚨 FORCING TIMER TO ZERO FOR TESTING...');
    
    const sess = this.session();
    const currentPhase = sess?.currentPhase || 'FOCUS';
    
    // Set timer to zero
    this.timerSyncService.setRemainingSeconds(0);
    
    // Manually trigger the phase completion notification
    console.log('⏰ Timer reached zero! Triggering phase completion notification...');
    await this.triggerPhaseCompletionNotification(currentPhase as 'FOCUS' | 'BREAK');
    
    console.log('✅ Forced timer completion test complete!');
  }

  // Auto-start functionality methods
  private async checkAndHandleAutoStart(session: PomodoroSession, currentPhase: string): Promise<void> {
    const settings = this.settingsService.getSettings();
    
    // Don't auto-start if session is completed
    if (session.status === 'COMPLETED') {
      console.log('🏁 Session completed, no auto-start needed');
      return;
    }
    
    // Check if auto-start is enabled for the next phase
    const shouldAutoStart = 
      (currentPhase === 'FOCUS' && settings.autoStart.autoStartBreaks) ||
      (currentPhase === 'BREAK' && settings.autoStart.autoStartPomodoros);
    
    if (shouldAutoStart) {
      console.log(`🚀 Auto-start enabled for next phase after ${currentPhase}`);
      await this.startAutoStartCountdown();
    } else {
      console.log(`⏸️ Auto-start disabled for next phase after ${currentPhase}`);
    }
  }

  // Flag to track if auto-start was cancelled
  private autoStartCancelled = false;

  private async startAutoStartCountdown(): Promise<void> {
    const settings = this.settingsService.getSettings();
    const countdownSeconds = settings.autoStart.countdownSeconds;
    
    console.log(`⏱️ Starting ${countdownSeconds}-second auto-start countdown`);
    
    // Reset cancelled flag
    this.autoStartCancelled = false;
    
    // Show countdown
    this.showAutoStartCountdown.set(true);
    for (let i = countdownSeconds; i > 0; i--) {
      // Check if cancelled
      if (this.autoStartCancelled) {
        console.log('🛑 Auto-start countdown cancelled');
        this.hideAutoStartCountdown();
        return;
      }
      this.autoStartCountdown.set(i);
      await this.delay(1000);
    }
    
    // Check again before starting (in case cancelled during last second)
    if (this.autoStartCancelled) {
      console.log('🛑 Auto-start cancelled before starting');
      this.hideAutoStartCountdown();
      return;
    }
    
    this.hideAutoStartCountdown();
    await this.autoStartNextPhase();
  }

  protected cancelAutoStart(): void {
    console.log('🛑 User cancelled auto-start');
    this.autoStartCancelled = true;
    this.hideAutoStartCountdown();
  }

  private async autoStartNextPhase(): Promise<void> {
    const sess = this.session();
    
    if (!sess) {
      console.error('❌ Cannot auto-start: missing session');
      return;
    }
    
    console.log('🚀 Auto-starting next phase...');
    
    // If session is paused (after phase completion), just start the timer
    if (sess.status === 'PAUSED') {
      console.log('✅ Auto-start: Starting timer for next phase');
      this.timerSyncService.startTimer();
    } else {
      console.log('⚠️ Auto-start: Session not in expected PAUSED state, current status:', sess.status);
      // Try to start anyway
      this.timerSyncService.startTimer();
    }
  }

  // ...existing code...

  private hideAutoStartCountdown(): void {
    this.showAutoStartCountdown.set(false);
    this.autoStartCountdown.set(0);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Mobile device detection (actual mobile devices, not just screen size)
  protected isMobile(): boolean {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
    
    // Check user agent for mobile devices
    const userAgent = navigator.userAgent.toLowerCase();
    const mobileKeywords = [
      'android', 'iphone', 'ipad', 'ipod', 'blackberry', 
      'windows phone', 'mobile', 'webos', 'opera mini'
    ];
    
    // Check if any mobile keyword is in user agent
    const isMobileUserAgent = mobileKeywords.some(keyword => userAgent.includes(keyword));
    
    // Check for touch capability (additional mobile indicator)
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    
    // Return true if it's a mobile user agent OR (touch device AND small screen)
    return isMobileUserAgent || (isTouchDevice && window.innerWidth <= 768);
  }

  // Test method for auto-start functionality (can be called from browser console)
  protected testAutoStart(): void {
    console.log('🧪 Testing auto-start functionality...');
    const sess = this.session();
    if (!sess) {
      console.error('❌ No session available for testing');
      return;
    }
    
    console.log('🧪 Current session:', sess);
    console.log('🧪 Current phase:', sess.currentPhase);
    
    // Simulate phase completion
    this.checkAndHandleAutoStart(sess, sess.currentPhase || 'FOCUS');
  }

}
