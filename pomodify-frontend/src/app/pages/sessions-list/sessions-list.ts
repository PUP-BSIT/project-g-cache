import { Component, OnInit, inject, signal, input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { SessionService, PomodoroSession, SessionStatus } from '../../core/services/session.service';
import { ActivityService } from '../../core/services/activity.service';
import { ActivityColorService } from '../../core/services/activity-color.service';
import { switchMap, catchError, of, filter } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { CreateSessionDialogComponent, CreateSessionDialogData } from '../../shared/components/create-session-dialog/create-session-dialog';
import { SessionNoteDialogComponent } from '../../shared/components/session-note-dialog/session-note-dialog.component';
import { AlertDialogComponent, AlertDialogData } from '../../shared/components/alert-dialog/alert-dialog';
import { HttpErrorResponse } from '@angular/common/http';
import { Logger } from '../../core/services/logger.service';

// Use PomodoroSession from SessionService for type safety

@Component({
  selector: 'app-sessions-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './sessions-list.html',
  styleUrls: ['./sessions-list.scss'],
  host: {
    'class': 'sessions-list-page'
  }
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
  private activityColorService = inject(ActivityColorService);
  private dialog = inject(MatDialog);
  
  // Route parameter
  activityTitle = input.required<string>();
  
  sessions = signal<PomodoroSession[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);
  activityId = signal<number | null>(null);
  activityColor = signal<string | null>(null);  // Store the activity's color
  
  showAbandoned = signal(false);
  
  // Note editing state
  editingNoteForSession = signal<number | null>(null);
  noteDraft = signal<string>('');
  savingNote = signal(false);
  
  // Notes toggle state - tracks which sessions have expanded notes
  expandedNotes = signal<Set<number>>(new Set());
  
  // Pagination state
  readonly PAGE_SIZE = 6;
  completedPage = signal(1);
  abandonedPage = signal(1);
  
  filteredSessions = computed(() => {
    const all = this.sessions();
    const show = this.showAbandoned();
    return all.filter(s => show || s.status !== 'ABANDONED');
  });

  // Active sessions (NOT_STARTED, IN_PROGRESS, PAUSED) - no pagination
  activeSessions = computed(() => {
    return this.sessions().filter(s => 
      s.status === 'NOT_STARTED' || s.status === 'IN_PROGRESS' || s.status === 'PAUSED'
    );
  });

  // Completed sessions with pagination
  allCompletedSessions = computed(() => {
    return this.sessions().filter(s => s.status === 'COMPLETED');
  });

  completedSessions = computed(() => {
    const all = this.allCompletedSessions();
    const page = this.completedPage();
    const start = (page - 1) * this.PAGE_SIZE;
    return all.slice(start, start + this.PAGE_SIZE);
  });

  completedTotalPages = computed(() => {
    return Math.ceil(this.allCompletedSessions().length / this.PAGE_SIZE);
  });

  // Abandoned sessions with pagination
  allAbandonedSessions = computed(() => {
    return this.sessions().filter(s => s.status === 'ABANDONED');
  });

  abandonedSessions = computed(() => {
    const all = this.allAbandonedSessions();
    const page = this.abandonedPage();
    const start = (page - 1) * this.PAGE_SIZE;
    return all.slice(start, start + this.PAGE_SIZE);
  });

  abandonedTotalPages = computed(() => {
    return Math.ceil(this.allAbandonedSessions().length / this.PAGE_SIZE);
  });

  // Smart pagination - shows max 5 pages with ellipsis
  readonly MAX_VISIBLE_PAGES = 5;

  completedVisiblePages = computed(() => {
    return this.getVisiblePages(this.completedPage(), this.completedTotalPages());
  });

  abandonedVisiblePages = computed(() => {
    return this.getVisiblePages(this.abandonedPage(), this.abandonedTotalPages());
  });

  hasActiveSession = computed(() => {
    return this.sessions().some(s => 
      s.status === 'NOT_STARTED' || 
      s.status === 'IN_PROGRESS' || 
      s.status === 'PAUSED'
    );
  });

  toggleAbandoned() {
    this.showAbandoned.update(v => !v);
    this.abandonedPage.set(1); // Reset to first page when toggling
  }

  /**
   * Toggle notes expansion for a session
   */
  toggleNotes(sessionId: number, event: Event): void {
    event.stopPropagation();
    this.expandedNotes.update(set => {
      const newSet = new Set(set);
      if (newSet.has(sessionId)) {
        newSet.delete(sessionId);
      } else {
        newSet.add(sessionId);
      }
      return newSet;
    });
  }

  /**
   * Check if notes are expanded for a session
   */
  isNotesExpanded(sessionId: number): boolean {
    return this.expandedNotes().has(sessionId);
  }

  // Helper function to determine which pages to display with smart truncation
  private getVisiblePages(currentPage: number, totalPages: number): (number | string)[] {
    if (totalPages <= this.MAX_VISIBLE_PAGES) {
      // Show all pages if we're under the limit
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const pages: (number | string)[] = [];

    if (currentPage <= this.MAX_VISIBLE_PAGES) {
      // Show first 5 pages (1-5)
      for (let i = 1; i <= this.MAX_VISIBLE_PAGES; i++) {
        pages.push(i);
      }
      // Add ellipsis and last page if there are more pages
      if (totalPages > this.MAX_VISIBLE_PAGES) {
        pages.push('...');
        pages.push(totalPages);
      }
    } else {
      // Show page 1, ellipsis, then 4 pages ending at currentPage
      pages.push(1);
      pages.push('...');
      
      const start = currentPage - 3; // This gives us 4 pages (start to currentPage inclusive)
      const end = Math.min(currentPage, totalPages);
      
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
      
      // Add ellipsis and last page if current page is not the last
      if (end < totalPages) {
        pages.push('...');
        pages.push(totalPages);
      }
    }

    return pages;
  }

  // Pagination methods
  goToCompletedPage(page: number): void {
    if (page >= 1 && page <= this.completedTotalPages()) {
      this.completedPage.set(page);
    }
  }

  goToAbandonedPage(page: number): void {
    if (page >= 1 && page <= this.abandonedTotalPages()) {
      this.abandonedPage.set(page);
    }
  }

  // Helper methods for template pagination (handles string | number from array)
  navigateCompletedPage(page: string | number): void {
    if (typeof page === 'number') {
      this.goToCompletedPage(page);
    }
  }

  navigateAbandonedPage(page: string | number): void {
    if (typeof page === 'number') {
      this.goToAbandonedPage(page);
    }
  }

  ngOnInit(): void {
    this.loadSessions();
  }

  /**
   * Get the effective status for a session, checking local storage for running timers
   */
  protected getEffectiveStatus(session: PomodoroSession): SessionStatus {
    // Terminal states (ABANDONED, COMPLETED) should always use the backend status
    // Don't let stale localStorage override these
    if (session.status === 'ABANDONED' || session.status === 'COMPLETED') {
      return session.status;
    }
    
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
          throw new Error(`Activity "${this.activityTitle()}" not found. It may have been deleted.`);
        }
        
        this.activityId.set(activity.activityId);
        
        // Get the activity color from localStorage or backend
        const storedColor = this.activityColorService.getColorTag(activity.activityId);
        const color = storedColor || activity.color || '#5FA9A4';
        this.activityColor.set(color);
        
        // Now fetch sessions for this activity
        return this.sessionService.getSessions(activity.activityId);
      }),
      catchError(error => {
        const errorMsg = error.message || 'Failed to load sessions';
        this.error.set(errorMsg);
        this.loading.set(false);
        return of([]);
      })
    ).subscribe(sessions => {
      Logger.log('[Sessions List] Loaded sessions with notes:', sessions.map(s => ({ id: s.id, note: s.note })));
      this.sessions.set(sessions);
      this.loading.set(false);
    });
  }

  /**
   * Get the session card gradient style based on activity color
   */
  protected getSessionCardStyle(): { [key: string]: string } {
    const color = this.activityColor() || '#5FA9A4';
    Logger.log('[Sessions List] Activity color:', color);
    const hexColor = this.colorNameToHex(color);
    const lighterColor = this.lightenColor(hexColor, 15);
    
    return {
      'background': `linear-gradient(135deg, ${hexColor} 0%, ${lighterColor} 100%)`
    };
  }

  /**
   * Convert color name or hue value to hex
   */
  private colorNameToHex(color: string): string {
    // If already hex, return as-is
    if (color.startsWith('#')) {
      return color;
    }
    
    // Check if it's a numeric hue value (from the slider)
    const hueNum = parseFloat(color);
    if (!isNaN(hueNum) && hueNum >= 0 && hueNum <= 360) {
      return this.hueToHex(hueNum);
    }
    
    // Common color name mappings
    const colorMap: { [key: string]: string } = {
      'red': '#E74C3C',
      'orange': '#F39C12',
      'yellow': '#F1C40F',
      'green': '#27AE60',
      'teal': '#5FA9A4',
      'blue': '#3498DB',
      'purple': '#9B59B6',
      'pink': '#E91E63',
      'indigo': '#5C6BC0',
      'cyan': '#00BCD4'
    };
    
    return colorMap[color.toLowerCase()] || '#5FA9A4';
  }

  /**
   * Convert hue (0-360) to hex color
   */
  private hueToHex(hue: number): string {
    const s = 0.7; // Saturation
    const l = 0.5; // Lightness
    
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs((hue / 60) % 2 - 1));
    const m = l - c / 2;
    
    let r = 0, g = 0, b = 0;
    
    if (hue < 60) { r = c; g = x; b = 0; }
    else if (hue < 120) { r = x; g = c; b = 0; }
    else if (hue < 180) { r = 0; g = c; b = x; }
    else if (hue < 240) { r = 0; g = x; b = c; }
    else if (hue < 300) { r = x; g = 0; b = c; }
    else { r = c; g = 0; b = x; }
    
    const toHex = (n: number) => {
      const hex = Math.round((n + m) * 255).toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    };
    
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  }

  /**
   * Lighten a hex color by a percentage
   */
  private lightenColor(hex: string, percent: number): string {
    const num = parseInt(hex.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = Math.min(255, (num >> 16) + amt);
    const G = Math.min(255, ((num >> 8) & 0x00FF) + amt);
    const B = Math.min(255, (num & 0x0000FF) + amt);
    return '#' + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
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

  protected onCreateSessionClick(): void {
    if (this.hasActiveSession()) {
      this.showAlertDialog(
        'Active Session Exists',
        'Finish current session first',
        'warning'
      );
      return;
    }
    this.createNewSession();
  }

  protected createNewSession(): void {
    const actId = this.activityId();
    if (!actId) {
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
        Logger.log('[Sessions List] Creating session:', formData);
        return this.sessionService.createSession(actId, formData);
      }),
      catchError((error: HttpErrorResponse) => {
        // Handle 409 Conflict - active session exists
        if (error.status === 409) {
          const message = error.error?.message || 'An active session already exists. Please complete or abandon it before creating a new one.';
          this.showAlertDialog('Active Session Exists', message, 'warning');
        } else {
          this.showAlertDialog('Error', 'Failed to create session. Please try again.', 'error');
        }
        return of(null);
      })
    ).subscribe(newSession => {
      if (newSession) {
        Logger.log('[Sessions List] Session created successfully:', newSession);
        // Navigate to the session timer page
        this.router.navigate(['/activities', this.activityTitle(), 'sessions', newSession.id]);
      }
    });
  }

  /**
   * Check if notes can be edited for a session based on status
   * Editable: IN_PROGRESS, PAUSED, NOT_STARTED (stopped), ABANDONED
   */
  protected canEditNote(status: string): boolean {
    const editableStatuses = ['IN_PROGRESS', 'PAUSED', 'NOT_STARTED', 'PENDING', 'ABANDONED'];
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
      error: (_err) => {
        this.savingNote.set(false);
      }
    });
  }

  private showAlertDialog(title: string, message: string, type: 'info' | 'warning' | 'error' = 'info'): void {
    this.dialog.open(AlertDialogComponent, {
      width: '400px',
      data: {
        title,
        message,
        type,
        buttonText: 'OK'
      } as AlertDialogData
    });
  }

  protected getStatusClass(status: string): string {
    const statusMap: { [key: string]: string } = {
      'NOT_STARTED': 'status-not-started',
      'PENDING': 'status-pending',
      'IN_PROGRESS': 'status-in-progress',
      'PAUSED': 'status-paused',
      'COMPLETED': 'status-completed',
      'ABANDONED': 'status-abandoned'
    };
    return statusMap[status] || '';
  }

  protected formatDate(dateString?: string): string {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
}