import { Component, inject, computed, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { SessionType } from '../../../core/services/session.service';

export interface CreateSessionDialogData {
  sessionType: SessionType;
  focusTimeInMinutes: number;
  breakTimeInMinutes: number;
  cycles: number | null;
  enableLongBreak: boolean;
  longBreakTimeInMinutes?: number;
  longBreakIntervalInMinutes?: number;
}

@Component({
  selector: 'app-create-session-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatCheckboxModule,
    MatIconModule,
    MatTooltipModule
  ],
  templateUrl: './create-session-dialog.html',
  styleUrls: ['./create-session-dialog.scss']
})
export class CreateSessionDialogComponent {
  private dialogRef = inject(MatDialogRef<CreateSessionDialogComponent>);
  private fb = inject(FormBuilder);

  form: FormGroup;
  
  // Constants
  readonly MIN_SHORT_BREAK = 2;
  readonly MAX_SHORT_BREAK = 10;
  readonly MIN_LONG_BREAK = 15;
  readonly MAX_LONG_BREAK = 30;
  
  // Classic Fixed Values
  readonly CLASSIC_FOCUS = 25;
  readonly CLASSIC_BREAK = 5;
  readonly CLASSIC_LONG_BREAK = 15;
  readonly CLASSIC_LONG_BREAK_INTERVAL = 5; // Every 5th break

  // Freestyle Cycle Options for Long Break Frequency
  readonly FREESTYLE_CYCLE_OPTIONS = [
    { label: 'Every 2 cycles', value: 2 },
    { label: 'Every 3 cycles', value: 3 },
    { label: 'Every 4 cycles', value: 4 },
    { label: 'Every 5 cycles', value: 5 },
    { label: 'Every 6 cycles', value: 6 }
  ];

  constructor() {
    this.form = this.fb.group({
      sessionType: ['CLASSIC', Validators.required],
      focusTimeInMinutes: [this.CLASSIC_FOCUS, [Validators.required, Validators.min(5), Validators.max(90)]],
      breakTimeInMinutes: [this.CLASSIC_BREAK, [Validators.required, Validators.min(this.MIN_SHORT_BREAK), Validators.max(this.MAX_SHORT_BREAK)]],
      cycles: [4, [Validators.required, Validators.min(1), Validators.max(20)]],
      enableLongBreak: [true],
      longBreakTimeInMinutes: [this.CLASSIC_LONG_BREAK, [Validators.min(this.MIN_LONG_BREAK), Validators.max(this.MAX_LONG_BREAK)]],
      longBreakIntervalCycles: [4] // Cycles before long break (for Freestyle)
    });

    // Add custom validator for Focus > Break (only for Freestyle)
    this.form.addValidators(this.focusLongerThanBreakValidator.bind(this));
  }

  focusLongerThanBreakValidator(control: AbstractControl): ValidationErrors | null {
    const sessionType = control.get('sessionType')?.value;
    if (sessionType === 'CLASSIC') return null; // Classic has fixed values, always valid
    
    const focus = control.get('focusTimeInMinutes')?.value;
    const brk = control.get('breakTimeInMinutes')?.value;
    if (focus !== null && brk !== null && focus <= brk) {
      return { focusNotLonger: true };
    }
    return null;
  }

  selectSessionType(type: 'CLASSIC' | 'FREESTYLE'): void {
    this.form.patchValue({ sessionType: type });
    
    if (type === 'CLASSIC') {
      // Reset to Classic fixed values
      this.form.patchValue({
        focusTimeInMinutes: this.CLASSIC_FOCUS,
        breakTimeInMinutes: this.CLASSIC_BREAK,
        longBreakTimeInMinutes: this.CLASSIC_LONG_BREAK,
        enableLongBreak: true
      });
    } else {
      // Freestyle defaults
      this.form.patchValue({
        focusTimeInMinutes: 25,
        breakTimeInMinutes: 5,
        longBreakTimeInMinutes: 15,
        longBreakIntervalCycles: 4,
        enableLongBreak: true
      });
    }
  }

  get sessionType() { return this.form.get('sessionType')?.value; }
  get focusTime() { return this.form.get('focusTimeInMinutes')?.value || 0; }
  get breakTime() { return this.form.get('breakTimeInMinutes')?.value || 0; }
  get cycles() { return this.form.get('cycles')?.value || 0; }
  get longBreakTime() { return this.form.get('longBreakTimeInMinutes')?.value || 15; }
  get longBreakIntervalCycles() { return this.form.get('longBreakIntervalCycles')?.value || 4; }

  get totalDurationMinutes(): number {
    if (this.sessionType === 'CLASSIC') {
      // Classic: (25 focus + 5 break) * cycles, plus long breaks
      const cycleTime = this.CLASSIC_FOCUS + this.CLASSIC_BREAK;
      let total = cycleTime * this.cycles;
      
      // Add long break time for every 5th cycle
      const longBreaks = Math.floor(this.cycles / this.CLASSIC_LONG_BREAK_INTERVAL);
      // Long break replaces normal break, so add the difference
      total += longBreaks * (this.CLASSIC_LONG_BREAK - this.CLASSIC_BREAK);
      
      return total;
    }
    // Freestyle: Just one loop cycle
    return this.focusTime + this.breakTime;
  }

  get hasLongBreakInSession(): boolean {
    if (this.sessionType === 'CLASSIC') {
      return this.cycles >= this.CLASSIC_LONG_BREAK_INTERVAL;
    }
    return true; // Freestyle always has long break option
  }

  get longBreakCount(): number {
    if (this.sessionType === 'CLASSIC') {
      return Math.floor(this.cycles / this.CLASSIC_LONG_BREAK_INTERVAL);
    }
    return 0;
  }

  formatDuration(minutes: number): string {
    if (minutes < 60) {
      return `${minutes} min`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (mins === 0) {
      return `${hours}h`;
    }
    return `${hours}h ${mins}m`;
  }

  getLoopPreview(): string[] {
    // Generate preview pattern: F B F B F B F L (for 4 cycle interval)
    const pattern: string[] = [];
    const interval = this.longBreakIntervalCycles;
    
    for (let i = 1; i <= interval; i++) {
      pattern.push('F'); // Focus
      if (i === interval) {
        pattern.push('L'); // Long break at the end
      } else {
        pattern.push('B'); // Short break
      }
    }
    
    return pattern;
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onConfirm(): void {
    if (this.form.valid) {
      const formValue = this.form.value;
      
      // Prepare data
      const data: CreateSessionDialogData = {
        sessionType: formValue.sessionType,
        focusTimeInMinutes: formValue.sessionType === 'CLASSIC' ? this.CLASSIC_FOCUS : formValue.focusTimeInMinutes,
        breakTimeInMinutes: formValue.sessionType === 'CLASSIC' ? this.CLASSIC_BREAK : formValue.breakTimeInMinutes,
        cycles: formValue.sessionType === 'CLASSIC' ? formValue.cycles : null,
        enableLongBreak: true,
        longBreakTimeInMinutes: formValue.sessionType === 'CLASSIC' ? this.CLASSIC_LONG_BREAK : formValue.longBreakTimeInMinutes,
        longBreakIntervalInMinutes: formValue.sessionType === 'FREESTYLE' 
          ? (formValue.focusTimeInMinutes + formValue.breakTimeInMinutes) * formValue.longBreakIntervalCycles 
          : (this.CLASSIC_FOCUS + this.CLASSIC_BREAK) * this.CLASSIC_LONG_BREAK_INTERVAL
      };

      this.dialogRef.close(data);
    } else {
      this.form.markAllAsTouched();
    }
  }
}