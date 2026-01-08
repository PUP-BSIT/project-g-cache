import { Component, EventEmitter, Input, Output, signal, DestroyRef, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { API } from '../../core/config/api.config';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { timer, of, Subscription } from 'rxjs';
import { switchMap, catchError, takeWhile } from 'rxjs/operators';

export type WizardState = 'idle' | 'generating' | 'preview' | 'confirming' | 'error';

export interface BlueprintPlan {
  level: string;
  activityTitle: string;
  activityDescription: string;
  focusMinutes: number;
  breakMinutes: number;
  todos: string[];
  tipNote: string;
}

export interface DualBlueprintResponse {
  message: string;
  beginnerPlan: BlueprintPlan;
  intermediatePlan: BlueprintPlan;
  isFallback: boolean;
}

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
export class SmartActionWizardComponent implements AfterViewInit {
  @Input() open = false;
  @Output() closed = new EventEmitter<void>();
  @Output() confirmed = new EventEmitter<{ activityId: number; sessionId: number }>();
  @ViewChild('topicTextarea') topicTextarea?: ElementRef<HTMLTextAreaElement>;

  state = signal<WizardState>('idle');
  topic = signal('');
  dualBlueprint = signal<DualBlueprintResponse | null>(null);
  error = signal<string | null>(null);
  
  // Track previous suggestions for regeneration
  previousSuggestions = signal<string[]>([]);
  
  private pollingIntervalMs = 1000;
  private pollingSubscription: Subscription | null = null;

  constructor(private http: HttpClient, private destroyRef: DestroyRef) {}

  ngAfterViewInit(): void {
    this.adjustTextareaHeight();
  }

  private adjustTextareaHeight(): void {
    if (this.topicTextarea?.nativeElement) {
      const textarea = this.topicTextarea.nativeElement;
      textarea.style.height = 'auto';
      textarea.style.height = textarea.scrollHeight + 'px';
    }
  }

  startGeneration() {
    this.state.set('generating');
    this.error.set(null);
    this.dualBlueprint.set(null);
    
    const requestBody = {
      topic: this.topic().trim(),
      previousSuggestions: this.previousSuggestions()
    };

    this.http.post<{ requestId: string }>(API.AI.GENERATE_DUAL_PREVIEW_ASYNC, requestBody)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          const requestId = response.requestId;
          this.pollForDualPreview(requestId);
        },
        error: () => {
          this.error.set('Failed to start plan generation.');
          this.state.set('error');
        },
      });
  }

  private pollForDualPreview(requestId: string) {
    // Cancel any existing polling
    this.pollingSubscription?.unsubscribe();
    
    let isComplete = false;
    
    this.pollingSubscription = timer(0, this.pollingIntervalMs)
      .pipe(
        takeWhile(() => !isComplete),
        switchMap(() => this.http.get<DualBlueprintResponse>(API.AI.GET_DUAL_PREVIEW_ASYNC_RESULT(requestId), { observe: 'response' })),
        catchError(() => of(null)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((response) => {
        if (!response) return;
        
        // 202 ACCEPTED means still processing
        if (response.status === 202) return;
        
        // 200 OK means we have results
        if (response.status === 200 && response.body) {
          isComplete = true;
          const result = response.body;
          this.dualBlueprint.set(result);
          
          // Track the generated suggestions for "Generate Again"
          const newSuggestions = [
            ...this.previousSuggestions(),
            result.beginnerPlan.activityTitle,
            result.intermediatePlan.activityTitle
          ];
          this.previousSuggestions.set(newSuggestions);
          
          this.state.set('preview');
        }
      });
  }

  acceptPlan(level: 'beginner' | 'intermediate') {
    const blueprint = this.dualBlueprint();
    if (!blueprint) return;
    
    const plan = level === 'beginner' ? blueprint.beginnerPlan : blueprint.intermediatePlan;
    
    this.state.set('confirming');
    this.http
      .post<ConfirmBlueprintResponse>(API.AI.CONFIRM_PLAN, {
        activityTitle: plan.activityTitle,
        activityDescription: plan.activityDescription,
        focusMinutes: plan.focusMinutes,
        breakMinutes: plan.breakMinutes,
        firstSessionNote: null,
        categoryId: null,
        todos: plan.todos,
        tipNote: plan.tipNote,
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

  onTopicInput(event: Event): void {
    const textarea = event.target as HTMLTextAreaElement;
    // Reset height to auto to get accurate scrollHeight
    textarea.style.height = 'auto';
    // Get the scrollHeight which includes all content with wrapping
    const scrollHeight = textarea.scrollHeight;
    // Set height to match content
    textarea.style.height = scrollHeight + 'px';
  }

  close() {
    this.pollingSubscription?.unsubscribe();
    this.pollingSubscription = null;
    this.closed.emit();
    this.state.set('idle');
    this.topic.set('');
    this.dualBlueprint.set(null);
    this.error.set(null);
    this.previousSuggestions.set([]);
  }
}
