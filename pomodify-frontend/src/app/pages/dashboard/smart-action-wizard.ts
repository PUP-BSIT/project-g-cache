import { Component, EventEmitter, Input, Output, effect, signal, DestroyRef } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { API } from '../../core/config/api.config';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { timer, of } from 'rxjs';
import { switchMap, catchError } from 'rxjs/operators';

export type WizardState = 'idle' | 'generating' | 'preview' | 'error';

type ConfirmBlueprintResponse = {
  message: string;
  activityId: number;
  sessionId: number;
};

@Component({
  selector: 'app-smart-action-wizard',
  templateUrl: './smart-action-wizard.html',
  styleUrls: ['./smart-action-wizard.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule],
})
export class SmartActionWizardComponent {
  @Input() open = false;
  @Output() closed = new EventEmitter<void>();
  @Output() confirmed = new EventEmitter<{ activityId: number; sessionId: number }>();

  state = signal<WizardState>('idle');
  topic = signal('');
  preview = signal<any>(null);
  error = signal<string | null>(null);
  private pollingIntervalMs = 1000;

  constructor(private http: HttpClient, private destroyRef: DestroyRef) {}

  startGeneration() {
    this.state.set('generating');
    this.error.set(null);
    this.preview.set(null);
    this.http.post(API.AI.GENERATE_PREVIEW_ASYNC, { topic: this.topic().trim() }, { responseType: 'text' })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (requestId: string) => {
          // If requestId is a JSON string, parse it; otherwise, use as is
          let id = requestId;
          try {
            const parsed = JSON.parse(requestId);
            if (parsed && typeof parsed.requestId === 'string') {
              id = parsed.requestId;
            }
          } catch {}
          this.pollForPreview(id);
        },
        error: () => {
          this.error.set('Failed to start plan generation.');
          this.state.set('error');
        },
      });
  }

  private pollForPreview(requestId: string) {
    timer(0, this.pollingIntervalMs)
      .pipe(
        switchMap(() => this.http.get(API.AI.GET_PREVIEW_ASYNC_RESULT(requestId))),
        catchError(() => of(null)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((res: any) => {
        if (!res) return;
        // If still processing, backend returns 202 (no body)
        if (res && res.activityTitle) {
          this.preview.set(res);
          this.state.set('preview');
        }
      });
  }

  acceptAndStart() {
    const preview = this.preview();
    if (!preview) return;
    this.state.set('generating');
    this.http
      .post<ConfirmBlueprintResponse>(API.AI.CONFIRM_PLAN, {
        activityTitle: preview.activityTitle,
        activityDescription: preview.activityDescription,
        focusMinutes: preview.focusMinutes,
        breakMinutes: preview.breakMinutes,
        firstSessionNote: preview.firstSessionNote,
        categoryId: null,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.confirmed.emit({ activityId: res.activityId, sessionId: res.sessionId });
          this.close();
        },
        error: () => {
          this.error.set('Failed to confirm plan.');
          this.state.set('error');
        },
      });
  }

  generateAgain() {
    this.startGeneration();
  }

  close() {
    this.closed.emit();
    this.state.set('idle');
    this.topic.set('');
    this.preview.set(null);
    this.error.set(null);
  }
}
