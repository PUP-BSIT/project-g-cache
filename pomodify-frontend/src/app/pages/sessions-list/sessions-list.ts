import { Component, OnInit, inject, signal, input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { SessionService, PomodoroSession, SessionStatus } from '../../core/services/session.service';
import { ActivityService } from '../../core/services/activity.service';
import { switchMap, catchError, of, filter } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { CreateSessionDialogComponent, CreateSessionDialogData } from '../../shared/components/create-session-dialog/create-session-dialog';
import { SessionNoteDialogComponent } from '../../shared/components/session-note-dialog/session-note-dialog.component'; // Need to create this or use existing?

// Use PomodoroSession from SessionService for type safety

@Component({
  selector: 'app-sessions-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './sessions-list.html',
  styleUrls: ['./sessions-list.scss']
})
export class SessionsListComponent implements OnInit {

    getNoteText(note: any): string {
      if (typeof note === 'string') return note;
      if (note && typeof note === 'object' && 'text' in note && typeof note.text === 'string') return note.text;
      return '';
    }
  protected router = inject(Router);
  private sessionService = inject(SessionService);
  private activityService = inject(ActivityService);
  private dialog = inject(MatDialog);
  
  // Route parameter
  activityTitle = input.required<string>();
  
  sessions = signal<PomodoroSession[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);
  activityId = signal<number | null>(null);
  
  showAbandoned = signal(false);
  
  filteredSessions = computed(() => {
    const all = this.sessions();
    const show = this.showAbandoned();
    return all.filter(s => show || s.status !== 'ABANDONED');
  });

  hasActiveSession = computed(() => {
    return this.sessions().some(s => 
      s.status === 'PENDING' || 
      s.status === 'IN_PROGRESS' || 
      s.status === 'PAUSED'
    );
  });

  toggleAbandoned() {
    this.showAbandoned.update(v => !v);
  }

  ngOnInit(): void {
    this.loadSessions();
  }

  /**
   * Get the effective status for a session, checking local storage for running timers
   */
  protected getEffectiveStatus(session: PomodoroSession): SessionStatus {
    try {
      const key = `pomodify_timer_${session.id}`;
      const stored = localStorage.getItem(key);
      if (stored) {
        const state = JSON.parse(stored);
        const age = Date.now() - state.lastSyncTime;
        // Only trust persisted state if it's recent (within 5 minutes)
        if (age < 5 * 60 * 1000) {
          if (state.isRunning) return 'IN_PROGRESS';
          if (state.isPaused) return 'PAUSED';
        }
      }
    } catch (e) {
      // Ignore localStorage errors
    }
    return session.status;
  }

  protected loadSessions(): void {
    this.loading.set(true);
    this.error.set(null);
    
    // First, get all activities to find the matching activityId by title
    this.activityService.getAllActivities(0, 100).pipe(
      switchMap(response => {
        const activity = response.activities.find(
          act => act.activityTitle === this.activityTitle()
        );
        
        if (!activity) {
          throw new Error(`Activity "${this.activityTitle()}" not found`);
        }
        
        this.activityId.set(activity.activityId);
        
        // Now fetch sessions for this activity
        return this.sessionService.getSessions(activity.activityId);
      }),
      catchError(error => {
        this.error.set(error.message || 'Failed to load sessions');
        this.loading.set(false);
        return of([]);
      })
    ).subscribe(sessions => {
      this.sessions.set(sessions);
      this.loading.set(false);
    });
  }

  protected openSession(session: PomodoroSession): void {
    if (session.status === 'ABANDONED') return;
    
    if (session.status === 'COMPLETED') {
      return;
    }
    
    // Navigate for PENDING, IN_PROGRESS, or PAUSED sessions
    this.router.navigate(['/activities', this.activityTitle(), 'sessions', session.id]);
  }

  protected viewNotes(session: PomodoroSession, event: Event): void {
    event.stopPropagation();
    const noteText = this.getNoteText(session.note);
    
    this.dialog.open(SessionNoteDialogComponent, {
      data: {
        title: 'Session Notes',
        note: noteText || 'No notes for this session.'
      },
      width: '500px'
    });
  }

  protected createNewSession(): void {
    if (this.hasActiveSession()) {
      alert('You have an active session. Please complete or abandon it before creating a new one.');
      return;
    }

    const actId = this.activityId();
    if (!actId) {
      console.error('Activity ID not available');
      return;
    }

    const dialogRef = this.dialog.open(CreateSessionDialogComponent, {
      width: '600px',
      maxWidth: '95vw',
      disableClose: false,
      panelClass: 'create-session-dialog-panel'
    });

    dialogRef.afterClosed().pipe(
      filter((result): result is CreateSessionDialogData => !!result),
      switchMap(formData => {
        console.log('[Sessions List] Creating session:', formData);
        return this.sessionService.createSession(actId, formData);
      }),
      catchError(error => {
        console.error('[Sessions List] Failed to create session:', error);
        this.error.set('Failed to create session. Please try again.');
        return of(null);
      })
    ).subscribe(newSession => {
      if (newSession) {
        console.log('[Sessions List] Session created successfully:', newSession);
        // Navigate to the session timer page
        this.router.navigate(['/activities', this.activityTitle(), 'sessions', newSession.id]);
      }
    });
  }

  protected getStatusClass(status: string): string {
    const statusMap: { [key: string]: string } = {
      'PENDING': 'status-pending',
      'IN_PROGRESS': 'status-in-progress',
      'PAUSED': 'status-paused',
      'COMPLETED': 'status-completed'
    };
    return statusMap[status] || '';
  }

  protected formatDate(dateString?: string): string {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
}
