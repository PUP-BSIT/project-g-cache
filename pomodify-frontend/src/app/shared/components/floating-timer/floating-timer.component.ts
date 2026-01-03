import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { TimerSyncService } from '../../../core/services/timer-sync.service';
import { CdkDrag } from '@angular/cdk/drag-drop';

@Component({
  selector: 'app-floating-timer',
  standalone: true,
  imports: [CommonModule, CdkDrag],
  templateUrl: './floating-timer.component.html',
  styleUrls: ['./floating-timer.component.scss']
})
export class FloatingTimerComponent {
  private timerSyncService = inject(TimerSyncService);
  private router = inject(Router);
  
  expanded = signal(false);
  
  remainingSeconds = computed(() => this.timerSyncService.remainingSeconds());
  isRunning = computed(() => this.timerSyncService.isRunning());
  isPaused = computed(() => this.timerSyncService.isPaused());
  
  // Show if running or paused AND not on the session page
  isVisible = computed(() => {
    const active = this.isRunning() || this.isPaused();
    const onSessionPage = this.router.url.includes('/sessions/');
    return active && !onSessionPage;
  });
  
  timerDisplay = computed(() => {
    const seconds = this.remainingSeconds();
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  });

  toggleExpand() {
    this.expanded.update(v => !v);
  }

  goToSession() {
    const actId = this.timerSyncService.currentActivityId();
    const sessId = this.timerSyncService.currentSessionId();
    if (actId && sessId) {
      this.router.navigate(['/activities', actId, 'sessions', sessId]);
    }
  }
}
