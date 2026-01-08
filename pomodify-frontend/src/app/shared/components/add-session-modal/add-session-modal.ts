import { Component, OnInit, inject } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { CommonModule } from '@angular/common';

export type SessionData = {
  sessionType: 'CLASSIC' | 'FREESTYLE';
  focusTimeMinutes: number;
  breakTimeMinutes: number;
  cycles: number;
  enableLongBreak?: boolean;
  longBreakTimeInMinutes?: number;
  longBreakIntervalCycles?: number;
  note?: string;
};

type SessionFormValue = {
  focusTimeMinutes: number;
  breakTimeMinutes: number;
  cycles: number;
  enableLongBreak: boolean;
  longBreakTimeInMinutes: number;
  longBreakIntervalCycles: number;
};

@Component({
  selector: 'app-add-session-modal',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatInputModule,
    MatFormFieldModule
  ],
  templateUrl: './add-session-modal.html',
  styleUrls: ['./add-session-modal.scss']
})
export class AddSessionModal implements OnInit {
  private dialogRef = inject(MatDialogRef<AddSessionModal>);
  private fb = inject(FormBuilder);

  sessionForm!: FormGroup;
  sessionType: 'CLASSIC' | 'FREESTYLE' = 'CLASSIC';

  // Constants
  readonly CLASSIC_FOCUS = 25;
  readonly CLASSIC_BREAK = 5;
  readonly CLASSIC_LONG_BREAK = 15;
  readonly CLASSIC_CYCLES = 4;
  readonly MIN_SHORT_BREAK = 2;
  readonly MAX_SHORT_BREAK = 10;
  readonly MIN_LONG_BREAK = 15;
  readonly MAX_LONG_BREAK = 30;

  // Freestyle Cycle Options for Long Break Frequency
  readonly FREESTYLE_CYCLE_OPTIONS = [
    { label: 'Every 2 cycles', value: 2 },
    { label: 'Every 3 cycles', value: 3 },
    { label: 'Every 4 cycles', value: 4 },
    { label: 'Every 5 cycles', value: 5 },
    { label: 'Every 6 cycles', value: 6 }
  ];

  // Common time presets (in minutes)
  focusTimePresets = [25, 30, 45, 60, 90];
  breakTimePresets = [2, 5, 10]; // Adjusted for freestyle mode

  // Computed properties
  get totalDurationMinutes(): number {
    const cycles = this.sessionForm?.get('cycles')?.value || this.CLASSIC_CYCLES;
    if (this.sessionType === 'CLASSIC') {
      const focusTime = this.CLASSIC_FOCUS * cycles;
      const shortBreaks = (cycles - 1) * this.CLASSIC_BREAK;
      const longBreaks = Math.floor((cycles - 1) / 4) * (this.CLASSIC_LONG_BREAK - this.CLASSIC_BREAK);
      return focusTime + shortBreaks + longBreaks;
    } else {
      const focusTime = (this.sessionForm?.get('focusTimeInMinutes')?.value || 25) * cycles;
      const breakTime = (this.sessionForm?.get('breakTimeInMinutes')?.value || 5) * (cycles - 1);
      return focusTime + breakTime;
    }
  }

  get hasLongBreakInSession(): boolean {
    if (this.sessionType === 'CLASSIC') {
      const cycles = this.sessionForm?.get('cycles')?.value || this.CLASSIC_CYCLES;
      return cycles > 4;
    }
    return this.isLongBreakEligible;
  }

  get longBreakCount(): number {
    if (this.sessionType === 'CLASSIC') {
      const cycles = this.sessionForm?.get('cycles')?.value || this.CLASSIC_CYCLES;
      return Math.floor((cycles - 1) / 4);
    }
    return 0;
  }

  get isLongBreakEligible(): boolean {
    return this.totalDurationMinutes > 180; // 3 hours
  }

  get focusTime(): number {
    return this.sessionForm?.get('focusTimeInMinutes')?.value || 25;
  }

  get breakTime(): number {
    return this.sessionForm?.get('breakTimeInMinutes')?.value || 5;
  }

  get longBreakTime(): number {
    return this.sessionForm?.get('longBreakTimeInMinutes')?.value || 15;
  }

  get longBreakIntervalCycles(): number {
    return this.sessionForm?.get('longBreakIntervalCycles')?.value || 4;
  }

  ngOnInit(): void {
    this.sessionForm = this.fb.group({
      focusTimeMinutes: [
        this.CLASSIC_FOCUS,
        {
          validators: [Validators.required, Validators.min(5), Validators.max(90)],
        },
      ],
      breakTimeMinutes: [
        this.CLASSIC_BREAK,
        {
          validators: [Validators.required, Validators.min(2), Validators.max(10)],
        },
      ],
      cycles: [
        this.CLASSIC_CYCLES,
        {
          validators: [Validators.required, Validators.min(1), Validators.max(20)],
        },
      ],
      enableLongBreak: [true],
      longBreakTimeInMinutes: [this.CLASSIC_LONG_BREAK, [Validators.min(15), Validators.max(30)]],
      longBreakIntervalCycles: [4],
    });

    // Add custom validator for Focus > Break (only for Freestyle)
    this.sessionForm.addValidators(this.focusLongerThanBreakValidator.bind(this));
  }

  focusLongerThanBreakValidator(control: AbstractControl): ValidationErrors | null {
    if (this.sessionType === 'CLASSIC') return null; // Classic has fixed values, always valid
    
    const focus = control.get('focusTimeMinutes')?.value;
    const brk = control.get('breakTimeMinutes')?.value;
    if (focus !== null && brk !== null && focus <= brk) {
      return { focusNotLonger: true };
    }
    return null;
  }

  selectSessionType(type: 'CLASSIC' | 'FREESTYLE'): void {
    this.sessionType = type;
    
    if (type === 'CLASSIC') {
      // Set classic fixed values
      this.sessionForm.patchValue({
        focusTimeMinutes: this.CLASSIC_FOCUS,
        breakTimeMinutes: this.CLASSIC_BREAK,
        cycles: this.CLASSIC_CYCLES,
        enableLongBreak: true,
        longBreakTimeInMinutes: this.CLASSIC_LONG_BREAK,
        longBreakIntervalCycles: 4
      });
      
      // Update validators for classic mode
      this.sessionForm.get('focusTimeMinutes')?.setValidators([
        Validators.required, 
        Validators.min(25), 
        Validators.max(25)
      ]);
      this.sessionForm.get('breakTimeMinutes')?.setValidators([
        Validators.required, 
        Validators.min(5), 
        Validators.max(5)
      ]);
    } else {
      // Freestyle mode - more flexible validators
      this.sessionForm.get('focusTimeMinutes')?.setValidators([
        Validators.required, 
        Validators.min(5), 
        Validators.max(90)
      ]);
      this.sessionForm.get('breakTimeMinutes')?.setValidators([
        Validators.required, 
        Validators.min(2), 
        Validators.max(10)
      ]);
    }
    
    // Update form validation
    this.sessionForm.get('focusTimeMinutes')?.updateValueAndValidity();
    this.sessionForm.get('breakTimeMinutes')?.updateValueAndValidity();
  }

  selectFocusTime(minutes: number): void {
    this.sessionForm.patchValue({ focusTimeMinutes: minutes });
  }

  selectBreakTime(minutes: number): void {
    this.sessionForm.patchValue({ breakTimeMinutes: minutes });
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onAddSession(): void {
    if (this.sessionForm.valid) {
      const formValue = this.sessionForm.getRawValue() as SessionFormValue;
      
      const sessionData: SessionData = {
        sessionType: this.sessionType,
        focusTimeMinutes: formValue.focusTimeMinutes,
        breakTimeMinutes: formValue.breakTimeMinutes,
        cycles: formValue.cycles,
      };

      // Add long break settings if enabled
      if (formValue.enableLongBreak) {
        sessionData.enableLongBreak = true;
        sessionData.longBreakTimeInMinutes = formValue.longBreakTimeInMinutes;
        sessionData.longBreakIntervalCycles = formValue.longBreakIntervalCycles;
      }

      this.dialogRef.close(sessionData);
    }
  }

  formatDuration(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h${mins > 0 ? ` ${mins}m` : ''}`;
    }
    return `${mins}m`;
  }

  getLoopPreview(): string[] {
    const cycles = this.longBreakIntervalCycles;
    const pattern: string[] = [];
    
    for (let i = 1; i <= cycles; i++) {
      pattern.push('F'); // Focus
      if (i < cycles) {
        if (this.isLongBreakEligible && i % Math.floor(cycles / 2) === 0) {
          pattern.push('L'); // Long break
        } else {
          pattern.push('B'); // Short break
        }
      }
    }
    
    return pattern.slice(0, 6); // Limit preview to 6 items for UI
  }
}