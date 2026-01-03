import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MatDialogModule, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { DigitalClockPickerComponent } from '../digital-clock-picker/digital-clock-picker';

export interface TimePickerData {
  minutes: number;
  seconds: number;
}

@Component({
  selector: 'app-time-picker-modal',
  standalone: true,
  imports: [CommonModule, MatDialogModule, DigitalClockPickerComponent],
  template: `
    <div class="time-picker-modal">
      <h2 mat-dialog-title>Set Timer Duration</h2>
      <div class="instruction-text">
        <p>Scroll or click to edit minutes and seconds</p>
      </div>
      <mat-dialog-content>
        <app-digital-clock-picker [(time)]="time" [isEditable]="true" />
      </mat-dialog-content>
      <div class="selected-time">
        <strong>Selected:</strong> {{ time().minutes }}m {{ time().seconds }}s
      </div>
      <div class="button-row">
        <button class="btn-cancel" (click)="onCancel()">Cancel</button>
        <button class="btn-confirm" (click)="onConfirm()">Set Timer</button>
      </div>
    </div>
  `,
  styles: [`
    .time-picker-modal { width: 100%; box-sizing: border-box; overflow: hidden; }
    .time-picker-modal h2 { color: #5FA9A4; font-weight: 700; margin: 0 0 8px 0; text-align: center; font-size: 28px; }
    .instruction-text { text-align: center; margin-bottom: 20px; }
    .instruction-text p { color: #9CA3AF; font-size: 14px; margin: 0; }
    .selected-time { text-align: center; padding: 20px 32px; background: linear-gradient(135deg, rgba(95,169,164,0.08) 0%, rgba(95,169,164,0.12) 100%); border-radius: 16px; margin: 32px auto 0 auto; max-width: 280px; color: #2C3E50; font-size: 19px; border: 1px solid rgba(95,169,164,0.25); }
    .selected-time strong { color: #5FA9A4; font-weight: 700; font-size: 20px; }
    .button-row { display: flex; justify-content: center; align-items: center; gap: 24px; padding: 32px 24px 24px 24px; width: 100%; box-sizing: border-box; }
    .button-row button { min-width: 150px; font-weight: 700; padding: 14px 32px; font-size: 16px; border-radius: 12px; cursor: pointer; border: none; transition: all 0.3s ease; }
    .btn-cancel { color: #6B7280; border: 2px solid #E5E7EB; background-color: #FFFFFF; }
    .btn-confirm { background-color: #5FA9A4; color: #FFFFFF; box-shadow: 0 2px 4px rgba(95,169,164,0.3); }
    mat-dialog-content { padding: 0; overflow: hidden !important; display: flex; justify-content: center; align-items: center; margin: 0; width: 100%; min-height: 240px; max-height: 240px; }
    @media (max-width: 600px) {
      .time-picker-modal h2 { font-size: 18px; margin-bottom: 4px; }
      .instruction-text { margin-bottom: 8px; }
      .instruction-text p { font-size: 12px; }
      .selected-time { padding: 10px 16px; font-size: 14px; margin: 12px auto 0 auto; max-width: 180px; border-radius: 10px; }
      .selected-time strong { font-size: 15px; }
      .button-row { padding: 16px 0 0 0; gap: 8px; }
      .button-row button { flex: 1; min-width: 0; padding: 10px 8px; font-size: 13px; border-radius: 8px; }
      mat-dialog-content { min-height: 120px; max-height: 120px; }
    }
  `]
})
export class TimePickerModalComponent {
  private dialogRef = inject(MatDialogRef<TimePickerModalComponent>);
  private data = inject<TimePickerData>(MAT_DIALOG_DATA);
  
  time = signal<TimePickerData>(this.data || { minutes: 25, seconds: 0 });

  onCancel(): void {
    this.dialogRef.close();
  }

  onConfirm(): void {
    this.dialogRef.close(this.time());
  }
}

