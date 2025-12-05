// activities.ts - Dedicated Pomodoro Timer Page with Backend Integration
import { CommonModule } from '@angular/common';
import { Component, signal, OnInit, OnDestroy, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { toggleTheme } from '../../shared/theme';
import { Auth } from '../../core/services/auth';
import { SessionService, PomodoroSession, SessionType, SessionPhase, CreateSessionRequest } from '../../core/services/session.service';
import { ActivityData } from '../../core/services/activity.service';

// Timer modes matching backend
export type TimerMode = 'classic' | 'freestyle';

@Component({
  selector: 'app-activities-timer',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, FormsModule],
  templateUrl: './activities.html',
  styleUrls: ['./activities.scss'],
})
export class ActivitiesPage implements OnInit, OnDestroy {
  private router = inject(Router);
  private auth = inject(Auth);
  private sessionService = inject(SessionService);

  // Sidebar state
  protected sidebarExpanded = signal(true);

  // Activity from navigation
  protected activity = signal<ActivityData | null>(null);

  // Backend session
  protected backendSession = signal<PomodoroSession | null>(null);
  
  // Local timer state for UI
  protected timeRemaining = signal<number>(0);
  protected isRunning = signal<boolean>(false);

  // Timer interval
  private timerInterval: any = null;
  
  // SSE connection
  private eventSource: EventSource | null = null;

  // Color mapping
  private colorMap: Record<string, string> = {
    red: '#ef4444',
    orange: '#f97316',
    yellow: '#eab308',
    green: '#22c55e',
    blue: '#3b82f6',
    purple: '#a855f7',
    teal: '#14b8a6',
  };

  // Computed properties for UI
  protected get session(): PomodoroSession | null {
    return this.backendSession();
  }

  protected get focusMinutes(): number {
    return this.backendSession()?.focusTimeInMinutes || 25;
  }

  protected get breakMinutes(): number {
    return this.backendSession()?.breakTimeInMinutes || 5;
  }

  protected get cycles(): number | null {
    const session = this.backendSession();
    return session?.sessionType === 'CLASSIC' ? session.cycles : null;
  }

  protected get mode(): TimerMode {
    const sessionType = this.backendSession()?.sessionType;
    return sessionType === 'FREESTYLE' ? 'freestyle' : 'classic';
  }

  ngOnInit(): void {
    // Get activity from navigation state
    const navigation = this.router.getCurrentNavigation();
    const state = navigation?.extras?.state || history.state;

    if (state && state['activity']) {
      const activityData = state['activity'];
      this.activity.set(activityData);

      // Check if there's an existing session
      if (state['sessionId']) {
        this.loadExistingSession(activityData.activityId, state['sessionId']);
      } else {
        // Create a new session with defaults
        this.createNewSession('classic');
      }
    } else {
      // No activity provided, redirect back to dashboard
      this.router.navigate(['/dashboard']);
    }
  }

  ngOnDestroy(): void {
    this.stopTimerInterval();
    this.disconnectSSE();
  }

  // ===== Session Management =====

  private createNewSession(mode: TimerMode): void {
    if (!this.activity()) return;

    const request: CreateSessionRequest = {
      sessionType: mode === 'classic' ? 'CLASSIC' : 'FREESTYLE',
      focusTimeInMinutes: 25,
      breakTimeInMinutes: 5,
      cycles: mode === 'classic' ? 4 : 1,
    };

    this.sessionService.createSession(this.activity()!.activityId, request).subscribe({
      next: (session) => {
        this.backendSession.set(session);
        this.timeRemaining.set(session.focusTimeInMinutes * 60);
        this.connectToSSE();
      },
      error: (err) => {
        console.error('Failed to create session:', err);
        alert('Failed to create session. Please try again.');
      }
    });
  }

  private loadExistingSession(activityId: number, sessionId: number): void {
    this.sessionService.getSession(activityId, sessionId).subscribe({
      next: (session) => {
        this.backendSession.set(session);
        this.calculateTimeRemaining(session);
        this.connectToSSE();
        
        if (session.status === 'IN_PROGRESS') {
          this.isRunning.set(true);
          this.startTimerInterval();
        }
      },
      error: (err) => {
        console.error('Failed to load session:', err);
        this.router.navigate(['/dashboard']);
      }
    });
  }

  private calculateTimeRemaining(session: PomodoroSession): void {
    // For now, reset to phase duration (backend should track this)
    if (session.currentPhase === 'FOCUS') {
      this.timeRemaining.set(session.focusTimeInMinutes * 60);
    } else if (session.currentPhase === 'BREAK') {
      this.timeRemaining.set(session.breakTimeInMinutes * 60);
    } else {
      this.timeRemaining.set(session.focusTimeInMinutes * 60);
    }
  }

  // ===== Timer Controls =====

  protected startTimer(): void {
    const session = this.backendSession();
    if (!session || !this.activity()) return;

    this.sessionService.startSession(this.activity()!.activityId, session.id).subscribe({
      next: (updatedSession) => {
        this.backendSession.set(updatedSession);
        this.isRunning.set(true);
        this.startTimerInterval();
      },
      error: (err) => {
        console.error('Failed to start session:', err);
        alert('Failed to start session. Please try again.');
      }
    });
  }

  protected pauseTimer(): void {
    const session = this.backendSession();
    if (!session || !this.activity()) return;

    this.sessionService.pauseSession(this.activity()!.activityId, session.id).subscribe({
      next: (updatedSession) => {
        this.backendSession.set(updatedSession);
        this.isRunning.set(false);
        this.stopTimerInterval();
      },
      error: (err) => {
        console.error('Failed to pause session:', err);
      }
    });
  }

  protected resumeTimer(): void {
    const session = this.backendSession();
    if (!session || !this.activity()) return;

    this.sessionService.resumeSession(this.activity()!.activityId, session.id).subscribe({
      next: (updatedSession) => {
        this.backendSession.set(updatedSession);
        this.isRunning.set(true);
        this.startTimerInterval();
      },
      error: (err) => {
        console.error('Failed to resume session:', err);
      }
    });
  }

  protected resetCurrentPhase(): void {
    const session = this.backendSession();
    if (!session) return;

    if (session.currentPhase === 'FOCUS') {
      this.timeRemaining.set(session.focusTimeInMinutes * 60);
    } else if (session.currentPhase === 'BREAK') {
      this.timeRemaining.set(session.breakTimeInMinutes * 60);
    }
  }

  protected stopCurrentCycle(): void {
    const session = this.backendSession();
    if (!session || !this.activity()) return;

    this.sessionService.stopSession(this.activity()!.activityId, session.id).subscribe({
      next: (updatedSession) => {
        this.backendSession.set(updatedSession);
        this.isRunning.set(false);
        this.stopTimerInterval();
        this.timeRemaining.set(updatedSession.focusTimeInMinutes * 60);
      },
      error: (err) => {
        console.error('Failed to stop session:', err);
      }
    });
  }

  protected cancelSession(): void {
    const session = this.backendSession();
    if (!session || !this.activity()) return;

    this.sessionService.cancelSession(this.activity()!.activityId, session.id).subscribe({
      next: () => {
        this.stopTimerInterval();
        this.disconnectSSE();
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        console.error('Failed to cancel session:', err);
        // Navigate anyway
        this.router.navigate(['/dashboard']);
      }
    });
  }

  // ===== Mode Switching =====

  protected switchMode(mode: TimerMode): void {
    const session = this.backendSession();
    if (!session || session.status === 'IN_PROGRESS' || session.status === 'PAUSED') {
      return; // Can't switch mode while session is active
    }

    // Delete current session and create new one
    if (this.activity()) {
      this.sessionService.deleteSession(this.activity()!.activityId, session.id).subscribe({
        next: () => {
          this.createNewSession(mode);
        },
        error: (err) => {
          console.error('Failed to delete session:', err);
        }
      });
    }
  }

  // ===== Timer Interval Management =====

  private startTimerInterval(): void {
    this.stopTimerInterval();

    this.timerInterval = setInterval(() => {
      const currentTime = this.timeRemaining();
      
      if (currentTime <= 0) {
        // Phase completed - notify backend
        this.completePhase();
        return;
      }

      this.timeRemaining.update(time => time - 1);
    }, 1000);
  }

  private stopTimerInterval(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  private completePhase(): void {
    const session = this.backendSession();
    if (!session || !this.activity()) return;

    this.stopTimerInterval();

    this.sessionService.completePhase(this.activity()!.activityId, session.id).subscribe({
      next: (updatedSession) => {
        this.backendSession.set(updatedSession);
        
        // Check if session is complete
        if (updatedSession.status === 'COMPLETED') {
          this.isRunning.set(false);
          alert('🎉 Session completed! Great work!');
        } else {
          // Update time for next phase
          this.calculateTimeRemaining(updatedSession);
          
          if (this.isRunning()) {
            this.startTimerInterval();
          }
        }
      },
      error: (err) => {
        console.error('Failed to complete phase:', err);
      }
    });
  }

  // ===== SSE Connection =====

  private connectToSSE(): void {
    const session = this.backendSession();
    if (!session || !this.activity()) return;

    this.eventSource = this.sessionService.connectToSessionEvents(
      this.activity()!.activityId,
      session.id
    );

    this.eventSource.addEventListener('phase-change', (event: any) => {
      const data = JSON.parse(event.data);
      console.log('Phase change event:', data);
      
      // Update session state from server
      if (this.activity()) {
        this.sessionService.getSession(this.activity()!.activityId, session.id).subscribe({
          next: (updatedSession) => {
            this.backendSession.set(updatedSession);
            this.calculateTimeRemaining(updatedSession);
          }
        });
      }
    });

    this.eventSource.onerror = (error) => {
      console.error('SSE error:', error);
      this.disconnectSSE();
    };
  }

  private disconnectSSE(): void {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
  }

  // ===== Display Helpers =====

  protected getTimerDisplay(): string {
    const time = this.timeRemaining();
    const minutes = Math.floor(time / 60);
    const seconds = time % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  protected getCycleDuration(): number {
    return this.focusMinutes + this.breakMinutes;
  }

  protected getTotalSessionMinutes(): number {
    const session = this.backendSession();
    if (!session || session.sessionType === 'FREESTYLE') return 0;
    return this.getCycleDuration() * session.cycles;
  }

  protected getColorHex(colorTag: string): string {
    return this.colorMap[colorTag || 'teal'] || this.colorMap['teal'];
  }

  protected get currentPhase(): string {
    return this.backendSession()?.currentPhase?.toLowerCase() || 'focus';
  }

  protected get cyclesCompleted(): number {
    return this.backendSession()?.cyclesCompleted || 0;
  }

  protected get isPaused(): boolean {
    return this.backendSession()?.status === 'PAUSED';
  }

  // ===== Time Updates (Note: These would require recreating the session) =====

  protected updateFocusTime(minutes: number): void {
    // For now, just show a message that session needs to be recreated
    console.log('Focus time update requested:', minutes);
    alert('To change timer settings, please cancel and create a new session.');
  }

  protected updateBreakTime(minutes: number): void {
    console.log('Break time update requested:', minutes);
    alert('To change timer settings, please cancel and create a new session.');
  }

  protected updateCycles(cycles: number): void {
    console.log('Cycles update requested:', cycles);
    alert('To change timer settings, please cancel and create a new session.');
  }

  // ===== Navigation =====

  protected toggleSidebar(): void {
    this.sidebarExpanded.update(expanded => !expanded);
  }

  protected onToggleTheme(): void {
    toggleTheme();
  }

  protected onLogout(): void {
    this.auth.logout();
  }

  protected onNavIconClick(event: MouseEvent, route: string): void {
    if (!this.sidebarExpanded()) {
      this.sidebarExpanded.set(true);
    }
    if (this.router.url === route) {
      event.preventDefault();
    }
  }

  protected openProfileModal(): void {
    // TODO: Implement profile modal
    console.log('Profile modal clicked');
  }
}
