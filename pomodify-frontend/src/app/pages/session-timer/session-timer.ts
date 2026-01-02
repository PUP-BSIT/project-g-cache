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

  // Activity color from color tag
  activityColor = computed(() => {
    const actId = this.activityId();
    if (!actId) return this.getColorHex('teal');
    const colorTag = this.activityColorService.getColorTag(actId);
    return this.getColorHex(colorTag || 'teal');
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
  isPaused = computed(() => this.timerSyncService.isPaused());
  isRunning = computed(() => this.timerSyncService.isRunning());
  isPending = computed(() => this.session()?.status === 'PENDING');
  isCompleted = computed(() => this.session()?.status === 'COMPLETED');

  
  // Shake when time is running low (last 60 seconds)
  isTimeLow = computed(() => {
    return this.isRunning() && this.remainingSeconds() > 0 && this.remainingSeconds() <= 60;
  });

  // Timer display (MM:SS format) - now using sync service
  timerDisplay = computed(() => this.timerSyncService.getTimerDisplay());

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

  constructor() {
    // Load session data when component initializes
    effect(() => {
      const id = this.sessionId();
      this.loadSession(id);
    });

    // Monitor timer completion
    effect(() => {
      if (this.timerSyncService.isTimerComplete()) {
        this.handleTimerComplete();
      }
    });

    // Add test method to window for development (only in development mode)
    if (typeof window !== 'undefined' && !environment.production) {
      (window as any).testAutoStart = () => this.testAutoStart();
      console.log('🧪 Auto-start test method available: window.testAutoStart()');
    }
  }

  ngOnDestroy() {
    this.timerSyncService.cleanup();
    
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
            this.timerSyncService.initializeTimer(sess, actId);
          }
          
          // Check for missed notification (backend sent FCM but user wasn't in app)
          this.checkForMissedNotification(sess);
        }
      }
    });
  }

  /**
   * Check if backend sent a notification while user was away (browser closed)
   * If phaseNotified is true and remainingPhaseSeconds is 0, show modal + sound
   */
  private checkForMissedNotification(sess: PomodoroSession): void {
    if (sess.phaseNotified && sess.remainingPhaseSeconds !== undefined && sess.remainingPhaseSeconds <= 0) {
      console.log('📱 Detected missed notification - showing modal with sound');
      
      const activityTitle = this.activityTitle() || 'Activity';
      const isBreakPhase = sess.currentPhase === 'BREAK';
      
      const context = {
        title: isBreakPhase ? '⏰ Break Over!' : '🍅 Focus Complete!',
        body: isBreakPhase 
          ? `Ready to focus on '${activityTitle}' again?`
          : `Great work on '${activityTitle}'! Time for a break.`,
        activityTitle,
        type: 'phase-complete' as const,
        nextAction: isBreakPhase 
          ? 'Break time is over. Ready to focus again?'
          : 'Time for a break! Step away from your work.'
      };
      
      // Play sound
      const settings = this.settingsService.getSettings();
      if (settings.sound.enabled) {
        this.settingsService.playSound(settings.sound.type);
      }
      
      // Show notification (will show modal on mobile, browser notification on desktop)
      this.notificationService.handlePhaseCompletion(context);
    }
  }

  /* -------------------- TIMER LOGIC -------------------- */

  private handleTimerComplete(): void {
    console.log('⏰ Timer completed - handling phase completion');
    this.handlePhaseComplete();
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

    // Use responsive width based on screen size
    const isMobile = window.innerWidth <= 600;
    const dialogRef = this.dialog.open(TimePickerModalComponent, {
      width: isMobile ? '300px' : '700px',
      maxWidth: isMobile ? '300px' : '700px',
      disableClose: false,
      panelClass: isMobile ? 'mobile-time-picker-dialog' : 'desktop-time-picker-dialog'
    }) as any;

    // Set initial time
    dialogRef.componentInstance.time.set({
      minutes: currentMinutes,
      seconds: currentSeconds
    });

    dialogRef.afterClosed().pipe(
      filter((result): result is TimePickerData => !!result)
    ).subscribe((timeData: TimePickerData) => {
      const totalSeconds = (timeData.minutes * 60) + timeData.seconds;
      const newFocusMinutes = Math.ceil(totalSeconds / 60); // Round up to nearest minute for focusTimeInMinutes
      
      console.log('⏱️ Time picker closed with:', { minutes: timeData.minutes, seconds: timeData.seconds, totalSeconds, newFocusMinutes });
      
      // Update the sync service with new time
      this.timerSyncService.setRemainingSeconds(totalSeconds);
      
      // Get current session status (not the captured one from dialog open)
      const currentSession = this.session();
      const actId = this.activityId();
      
      // Update local session state with new focus time
      if (currentSession) {
        this.session.set({
          ...currentSession,
          focusTimeInMinutes: newFocusMinutes,
          remainingPhaseSeconds: totalSeconds
        });
      }
      
      // Sync focus time to backend (fire and forget)
      if (currentSession && actId) {
        this.sessionService.updateSession(actId, currentSession.id, {
          focusTimeInMinutes: newFocusMinutes
        }).pipe(
          catchError(err => {
            console.warn('Failed to sync focus time to backend:', err);
            return of(null);
          })
        ).subscribe(updated => {
          if (updated) {
            console.log('✅ Focus time synced to backend:', updated.focusTimeInMinutes);
          }
        });
      }
      
      // If timer is running, restart it with the new time
      if (currentSession?.status === 'IN_PROGRESS') {
        this.timerSyncService.startTimer();
      }
    });
  }

  protected startSession(): void {
    const sess = this.session();
    const actId = this.activityId();
    console.log('🎬 Starting session...', { sessionId: sess?.id, activityId: actId, status: sess?.status });
    if (!sess || !actId) return;

    // If paused after phase completion, just start timer locally without API call
    if (sess.status === 'PAUSED' && this.remainingSeconds() > 0) {
      const updatedSession: PomodoroSession = {
        ...sess,
        status: 'IN_PROGRESS'
      };
      this.session.set(updatedSession);
      this.timerSyncService.startTimer();
      return;
    }

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

  private resumeSession(): void {
    const sess = this.session();
    const actId = this.activityId();
    if (!sess || !actId) return;

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

    this.sessionService.completePhase(actId, sess.id).subscribe({
      next: (updated) => {
        this.session.set(updated);
        
        // If session is now completed, show completion message
        if (updated.status === 'COMPLETED') {
          console.log('🎉 Session completed - triggering session completion notification');
          this.timerSyncService.setRemainingSeconds(0);
          this.triggerSessionCompletionNotification();
        } else {
          // Phase completed but session continues - set to PAUSED so user must manually start next phase
          const pausedSession: PomodoroSession = {
            ...updated,
            status: 'PAUSED'
          };
          this.session.set(pausedSession);
          this.timerSyncService.updateFromSession(pausedSession);
        }
      },
      error: (err) => {
        console.log('[Session Timer] Complete phase failed, handling locally:', err);
        
        // Still trigger notifications even if API fails
        this.triggerPhaseCompletionNotification();
        
        // Reset timer and set to paused state
        const currentPhase = sess.currentPhase || 'FOCUS';
        const nextPhase = currentPhase === 'FOCUS' ? 'BREAK' : 'FOCUS';
        
        const pausedSession: PomodoroSession = {
          ...sess,
          status: 'PAUSED',
          currentPhase: nextPhase
        };
        
        this.session.set(pausedSession);
        this.timerSyncService.updateFromSession(pausedSession);
        
        // Only show error for non-auth issues
        if (!(err instanceof HttpErrorResponse && err.status === 401)) {
          this.handleError(err, 'complete phase');
        }
      }
    });
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

  private async triggerPhaseCompletionNotification(): Promise<void> {
    console.log('🎯 Phase completion notification triggered');
    
    const sess = this.session();
    if (!sess) return;
    
    const activityTitle = this.activityTitle();
    const currentPhase = sess.currentPhase || 'FOCUS';
    const nextPhase = currentPhase === 'FOCUS' ? 'BREAK' : 'FOCUS';
    
    const context = {
      title: `${currentPhase} Phase Complete!`,
      body: `Time for a ${nextPhase.toLowerCase()} in "${activityTitle}"`,
      sessionId: sess.id,
      activityId: sess.activityId,
      activityTitle: activityTitle,
      type: 'phase-complete' as const
    };
    
    await this.notificationService.handlePhaseCompletion(context);
    
    // Check if auto-start is enabled for the next phase
    await this.checkAndHandleAutoStart(sess, currentPhase);
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
    
    // Set timer to zero
    this.timerSyncService.setRemainingSeconds(0);
    
    // Manually trigger the phase completion notification
    console.log('⏰ Timer reached zero! Triggering phase completion notification...');
    await this.triggerPhaseCompletionNotification();
    
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
