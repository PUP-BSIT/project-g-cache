import { Component, OnInit, inject, signal, input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { SessionService, PomodoroSession, SessionStatus } from '../../core/services/session.service';
import { ActivityService } from '../../core/services/activity.service';
import { switchMap, catchError, of, filter } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { CreateSessionDialogComponent, CreateSessionDialogData } from '../../shared/components/create-session-dialog/create-session-dialog';
import { SessionNoteDialogComponent } from '../../shared/components/session-note-dialog/session-note-dialog.component'; // Need to create this or use existing?
import { HttpErrorResponse } from '@angular/common/http';

// Use PomodoroSession from SessionService for type safety

@Component({
  selector: 'app-sessions-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './sessions-list.html',
  styleUrls: ['./sessions-list.scss']
})
export class SessionsListComponent implements OnInit {

    getNoteText(note: any): string {
      // Handle null/undefined
      if (!note) return '';
      
      // Handle plain string
      if (typeof note === 'string') return note;
      
      // Handle object formats
      if (typeof note === 'object') {
        // Backend SessionNoteDto format: { id, content, items }
        if ('content' in note && note.content) {
          return String(note.content);
        }
        // Alternative format with 'text' property
        if ('text' in note && note.text) {
          return String(note.text);
        }
      }
      
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
  
  // Note editing state
  editingNoteForSession = signal<number | null>(null);
  noteDraft = signal<string>('');
  savingNote = signal(false);
  
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
      console.log('[Sessions List] Loaded sessions with notes:', sessions.map(s => ({ id: s.id, note: s.note })));
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
      catchError((error: HttpErrorResponse) => {
        console.error('[Sessions List] Failed to create session:', error);
        // Handle 409 Conflict - active session exists
        if (error.status === 409) {
          const message = error.error?.message || 'An active session already exists. Please complete or abandon it before creating a new one.';
          this.error.set(message);
        } else {
          this.error.set('Failed to create session. Please try again.');
        }
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

  /**
   * Check if notes can be edited for a session based on status
   * Editable: IN_PROGRESS, PAUSED, PENDING (stopped), ABANDONED
   */
  protected canEditNote(status: string): boolean {
    const editableStatuses = ['IN_PROGRESS', 'PAUSED', 'PENDING', 'ABANDONED'];
    return editableStatuses.includes(status?.toUpperCase());
  }

  /**
   * Check if notes are view-only (completed sessions)
   */
  protected isNoteViewOnly(status: string): boolean {
    return status?.toUpperCase() === 'COMPLETED';
  }

  /**
   * Start editing a note for a session
   */
  protected startEditNote(session: PomodoroSession, event: Event): void {
    event.stopPropagation();
    this.editingNoteForSession.set(session.id);
    this.noteDraft.set(this.getNoteText(session.note));
  }

  /**
   * Cancel note editing
   */
  protected cancelEditNote(event: Event): void {
    event.stopPropagation();
    this.editingNoteForSession.set(null);
    this.noteDraft.set('');
  }

  /**
   * Save the note for a session
   */
  protected saveNote(session: PomodoroSession, event: Event): void {
    event.stopPropagation();
    const actId = this.activityId();
    if (!actId) return;

    this.savingNote.set(true);
    const noteText = this.noteDraft();

    this.sessionService.updateNote(actId, session.id, noteText).subscribe({
      next: () => {
        // Update local state
        const updated = this.sessions().map(s => 
          s.id === session.id ? { ...s, note: noteText } : s
        );
        this.sessions.set(updated);
        this.editingNoteForSession.set(null);
        this.noteDraft.set('');
        this.savingNote.set(false);
      },
      error: (err) => {
        console.error('Failed to save note:', err);
        this.savingNote.set(false);
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
