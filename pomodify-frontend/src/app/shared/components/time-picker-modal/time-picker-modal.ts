import { Component, inject, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MatDialogModule, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { DigitalClockPickerComponent, TimePickerConstraints } from '../digital-clock-picker/digital-clock-picker';

/**
 * Phase type for Freestyle Pomodoro sessions
 */
export type PhaseType = 'FOCUS' | 'BREAK' | 'LONG_BREAK';

/**
 * Constraint configuration for each phase type in Freestyle sessions
 * FOCUS: 5-90 min, BREAK: 2-10 min, LONG_BREAK: 15-30 min
 */
export const FREESTYLE_CONSTRAINTS: Record<PhaseType, TimePickerConstraints> = {
  FOCUS: { minMinutes: 5, maxMinutes: 90, minSeconds: 0, maxSeconds: 59 },
  BREAK: { minMinutes: 2, maxMinutes: 10, minSeconds: 0, maxSeconds: 59 },
  LONG_BREAK: { minMinutes: 15, maxMinutes: 30, minSeconds: 0, maxSeconds: 59 }
};

export interface TimePickerData {
  minutes: number;
  seconds: number;
  phaseType?: PhaseType;
  /** Long break interval in cycles (2-10), only for Freestyle sessions */
  longBreakIntervalCycles?: number;
  /** Whether to show the long break interval editor */
  showLongBreakInterval?: boolean;
  /** Focus time in minutes (for multi-phase editing) */
  focusTimeInMinutes?: number;
  /** Break time in minutes (for multi-phase editing) */
  breakTimeInMinutes?: number;
  /** Long break time in minutes (for multi-phase editing) */
  longBreakTimeInMinutes?: number;
  /** Whether to show phase tabs for editing all phases */
  showPhaseTabs?: boolean;
}

export interface TimePickerResult extends TimePickerData {
  /** Updated focus time in minutes */
  focusTimeInMinutes: number;
  /** Updated break time in minutes */
  breakTimeInMinutes: number;
  /** Updated long break time in minutes */
  longBreakTimeInMinutes: number;
}

@Component({
  selector: 'app-time-picker-modal',
  standalone: true,
  imports: [CommonModule, MatDialogModule, DigitalClockPickerComponent],
  template: `
    <div class="time-picker-modal">
      <h2 mat-dialog-title>Set Timer Duration</h2>
      
      <!-- Phase Tabs (for Freestyle sessions) -->
      @if (showPhaseTabs()) {
        <div class="phase-tabs">
          <button 
            type="button"
            class="phase-tab"
            [class.active]="selectedPhase() === 'FOCUS'"
            (click)="selectPhase('FOCUS')">
            <i class="fa-solid fa-bullseye"></i>
            Focus
          </button>
          <button 
            type="button"
            class="phase-tab"
            [class.active]="selectedPhase() === 'BREAK'"
            (click)="selectPhase('BREAK')">
            <i class="fa-solid fa-mug-hot"></i>
            Break
          </button>
          <button 
            type="button"
            class="phase-tab"
            [class.active]="selectedPhase() === 'LONG_BREAK'"
            (click)="selectPhase('LONG_BREAK')">
            <i class="fa-solid fa-couch"></i>
            Long Break
          </button>
        </div>
      }
      
      <div class="instruction-text">
        <p>Scroll or click to edit minutes and seconds</p>
        @if (constraints()) {
          <p class="constraint-hint">{{ constraintHint() }}</p>
        }
      </div>
      <mat-dialog-content>
        <app-digital-clock-picker [(time)]="time" [isEditable]="true" [constraints]="constraints()" />
      </mat-dialog-content>
      
      <!-- Long Break Interval Editor (replaces Selected time display) -->
      @if (showLongBreakInterval()) {
        <div class="long-break-interval-section">
          <span class="interval-label">Long break interval:</span>
          <div class="interval-controls">
            <button 
              type="button"
              class="btn-interval-adjust"
              (click)="decrementInterval()"
              [disabled]="longBreakIntervalCycles() <= 2">
              <i class="fa-solid fa-minus"></i>
            </button>
            <span class="interval-value">{{ longBreakIntervalCycles() }}</span>
            <button 
              type="button"
              class="btn-interval-adjust"
              (click)="incrementInterval()"
              [disabled]="longBreakIntervalCycles() >= 10">
              <i class="fa-solid fa-plus"></i>
            </button>
          </div>
          <span class="interval-unit">{{ longBreakIntervalCycles() === 1 ? 'cycle' : 'cycles' }}</span>
        </div>
      } @else {
        <div class="selected-time">
          <strong>Selected:</strong> {{ time().minutes }}m {{ time().seconds }}s
        </div>
      }
      
      <div class="button-row">
        <button class="btn-cancel" (click)="onCancel()">Cancel</button>
        <button class="btn-confirm" (click)="onConfirm()">Set Timer</button>
      </div>
    </div>
  `,
  styles: [`
    .time-picker-modal { width: 100%; box-sizing: border-box; overflow: hidden; }
    .time-picker-modal h2 { color: #5FA9A4; font-weight: 700; margin: 0 0 8px 0; text-align: center; font-size: 28px; }
    
    /* Phase Tabs */
    .phase-tabs {
      display: flex;
      justify-content: center;
      gap: 8px;
      margin-bottom: 16px;
      padding: 0 16px;
    }
    .phase-tab {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 10px 16px;
      border: 2px solid #E5E7EB;
      border-radius: 12px;
      background: white;
      color: #6B7280;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    .phase-tab:hover {
      border-color: #5FA9A4;
      color: #5FA9A4;
    }
    .phase-tab.active {
      background: #5FA9A4;
      border-color: #5FA9A4;
      color: white;
    }
    .phase-tab i {
      font-size: 14px;
    }
    
    .instruction-text { text-align: center; margin-bottom: 20px; }
    .instruction-text p { color: #9CA3AF; font-size: 14px; margin: 0; }
    .instruction-text .constraint-hint { color: #6B7280; font-size: 12px; margin-top: 4px; }
    .selected-time { text-align: center; padding: 20px 32px; background: linear-gradient(135deg, rgba(95,169,164,0.08) 0%, rgba(95,169,164,0.12) 100%); border-radius: 16px; margin: 32px auto 0 auto; max-width: 280px; color: #2C3E50; font-size: 19px; border: 1px solid rgba(95,169,164,0.25); }
    .selected-time strong { color: #5FA9A4; font-weight: 700; font-size: 20px; }
    
    /* Long Break Interval Section */
    .long-break-interval-section {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      padding: 20px 32px;
      background: linear-gradient(135deg, rgba(95,169,164,0.08) 0%, rgba(95,169,164,0.12) 100%);
      border-radius: 16px;
      margin: 32px auto 0 auto;
      max-width: 320px;
      border: 1px solid rgba(95,169,164,0.25);
    }
    .long-break-interval-section .interval-label {
      color: #5FA9A4;
      font-weight: 700;
      font-size: 16px;
    }
    .long-break-interval-section .interval-controls {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .long-break-interval-section .btn-interval-adjust {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      border: 2px solid #5FA9A4;
      background: white;
      color: #5FA9A4;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s ease;
    }
    .long-break-interval-section .btn-interval-adjust:hover:not(:disabled) {
      background: #5FA9A4;
      color: white;
    }
    .long-break-interval-section .btn-interval-adjust:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }
    .long-break-interval-section .interval-value {
      font-size: 24px;
      font-weight: 700;
      color: #2C3E50;
      min-width: 32px;
      text-align: center;
    }
    .long-break-interval-section .interval-unit {
      color: #6B7280;
      font-size: 16px;
    }
    
    .button-row { display: flex; justify-content: center; align-items: center; gap: 24px; padding: 32px 24px 24px 24px; width: 100%; box-sizing: border-box; }
    .button-row button { min-width: 150px; font-weight: 700; padding: 14px 32px; font-size: 16px; border-radius: 12px; cursor: pointer; border: none; transition: all 0.3s ease; }
    .btn-cancel { color: #6B7280; border: 2px solid #E5E7EB; background-color: #FFFFFF; }
    .btn-confirm { background-color: #5FA9A4; color: #FFFFFF; box-shadow: 0 2px 4px rgba(95,169,164,0.3); }
    mat-dialog-content { padding: 0; overflow: hidden !important; display: flex; justify-content: center; align-items: center; margin: 0; width: 100%; min-height: 240px; max-height: 240px; }
    @media (max-width: 600px) {
      .time-picker-modal h2 { font-size: 18px; margin-bottom: 4px; }
      .phase-tabs { gap: 4px; margin-bottom: 12px; }
      .phase-tab { padding: 8px 10px; font-size: 12px; gap: 4px; }
      .phase-tab i { font-size: 12px; }
      .instruction-text { margin-bottom: 8px; }
      .instruction-text p { font-size: 12px; }
      .instruction-text .constraint-hint { font-size: 10px; }
      .selected-time { padding: 10px 16px; font-size: 14px; margin: 12px auto 0 auto; max-width: 180px; border-radius: 10px; }
      .selected-time strong { font-size: 15px; }
      .long-break-interval-section { padding: 12px 16px; margin: 12px auto 0 auto; max-width: 280px; gap: 8px; flex-wrap: wrap; }
      .long-break-interval-section .interval-label { font-size: 14px; }
      .long-break-interval-section .interval-value { font-size: 20px; }
      .long-break-interval-section .interval-unit { font-size: 14px; }
      .long-break-interval-section .btn-interval-adjust { width: 28px; height: 28px; }
      .button-row { padding: 16px 0 0 0; gap: 8px; }
      .button-row button { flex: 1; min-width: 0; padding: 10px 8px; font-size: 13px; border-radius: 8px; }
      mat-dialog-content { min-height: 120px; max-height: 120px; }
    }
  `]
})
export class TimePickerModalComponent {
  private dialogRef = inject(MatDialogRef<TimePickerModalComponent>);
  private data = inject<TimePickerData>(MAT_DIALOG_DATA);
  
  // Current time being edited
  time = signal<TimePickerData>(this.getInitialTime());
  
  // Selected phase for editing
  selectedPhase = signal<PhaseType>(this.data?.phaseType || 'FOCUS');
  
  // Store times for each phase
  focusTime = signal<{ minutes: number; seconds: number }>({
    minutes: this.data?.focusTimeInMinutes || 25,
    seconds: 0
  });
  breakTime = signal<{ minutes: number; seconds: number }>({
    minutes: this.data?.breakTimeInMinutes || 5,
    seconds: 0
  });
  longBreakTime = signal<{ minutes: number; seconds: number }>({
    minutes: this.data?.longBreakTimeInMinutes || 15,
    seconds: 0
  });
  
  // Long break interval state (2-10 cycles)
  longBreakIntervalCycles = signal<number>(this.data?.longBreakIntervalCycles || 4);
  
  // Whether to show phase tabs
  showPhaseTabs = computed(() => {
    return this.data?.showPhaseTabs === true;
  });
  
  // Whether to show the long break interval editor
  showLongBreakInterval = computed(() => {
    return this.data?.showLongBreakInterval === true;
  });
  
  // Compute constraints based on selected phase
  constraints = computed<TimePickerConstraints | null>(() => {
    const phaseType = this.selectedPhase();
    if (phaseType && FREESTYLE_CONSTRAINTS[phaseType]) {
      return FREESTYLE_CONSTRAINTS[phaseType];
    }
    return null;
  });
  
  // Generate hint text for constraints
  constraintHint = computed(() => {
    const c = this.constraints();
    if (!c) return '';
    return `Valid range: ${c.minMinutes}-${c.maxMinutes} minutes`;
  });

  constructor() {
    // Effect to save current time when phase changes
    effect(() => {
      const currentTime = this.time();
      const phase = this.selectedPhase();
      // This effect runs when time changes, save to appropriate phase storage
    }, { allowSignalWrites: true });
  }

  private getInitialTime(): TimePickerData {
    const phase = this.data?.phaseType || 'FOCUS';
    let minutes = this.data?.minutes || 25;
    let seconds = this.data?.seconds || 0;
    
    // Use phase-specific times if provided
    if (phase === 'FOCUS' && this.data?.focusTimeInMinutes) {
      minutes = this.data.focusTimeInMinutes;
      seconds = 0;
    } else if (phase === 'BREAK' && this.data?.breakTimeInMinutes) {
      minutes = this.data.breakTimeInMinutes;
      seconds = 0;
    } else if (phase === 'LONG_BREAK' && this.data?.longBreakTimeInMinutes) {
      minutes = this.data.longBreakTimeInMinutes;
      seconds = 0;
    }
    
    return { minutes, seconds };
  }

  /** Select a phase to edit */
  selectPhase(phase: PhaseType): void {
    // Save current time to the current phase before switching
    const currentTime = this.time();
    const currentPhase = this.selectedPhase();
    
    if (currentPhase === 'FOCUS') {
      this.focusTime.set({ minutes: currentTime.minutes, seconds: currentTime.seconds });
    } else if (currentPhase === 'BREAK') {
      this.breakTime.set({ minutes: currentTime.minutes, seconds: currentTime.seconds });
    } else if (currentPhase === 'LONG_BREAK') {
      this.longBreakTime.set({ minutes: currentTime.minutes, seconds: currentTime.seconds });
    }
    
    // Switch to new phase
    this.selectedPhase.set(phase);
    
    // Load time for the new phase
    let newTime: { minutes: number; seconds: number };
    if (phase === 'FOCUS') {
      newTime = this.focusTime();
    } else if (phase === 'BREAK') {
      newTime = this.breakTime();
    } else {
      newTime = this.longBreakTime();
    }
    
    this.time.set({ minutes: newTime.minutes, seconds: newTime.seconds });
  }

  /** Increment long break interval (max 10) */
  incrementInterval(): void {
    const current = this.longBreakIntervalCycles();
    if (current < 10) {
      this.longBreakIntervalCycles.set(current + 1);
    }
  }

  /** Decrement long break interval (min 2) */
  decrementInterval(): void {
    const current = this.longBreakIntervalCycles();
    if (current > 2) {
      this.longBreakIntervalCycles.set(current - 1);
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onConfirm(): void {
    // Save current time to the current phase
    const currentTime = this.time();
    const currentPhase = this.selectedPhase();
    
    if (currentPhase === 'FOCUS') {
      this.focusTime.set({ minutes: currentTime.minutes, seconds: currentTime.seconds });
    } else if (currentPhase === 'BREAK') {
      this.breakTime.set({ minutes: currentTime.minutes, seconds: currentTime.seconds });
    } else if (currentPhase === 'LONG_BREAK') {
      this.longBreakTime.set({ minutes: currentTime.minutes, seconds: currentTime.seconds });
    }
    
    // Return all phase times
    const result: TimePickerResult = {
      ...currentTime,
      phaseType: this.selectedPhase(),
      focusTimeInMinutes: this.focusTime().minutes,
      breakTimeInMinutes: this.breakTime().minutes,
      longBreakTimeInMinutes: this.longBreakTime().minutes,
      longBreakIntervalCycles: this.longBreakIntervalCycles()
    };
    this.dialogRef.close(result);
  }
}

