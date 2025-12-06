import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { DigitalClockPickerComponent } from '../digital-clock-picker/digital-clock-picker';

export interface TimePickerData {
  minutes: number;
  seconds: number;
}

@Component({
  selector: 'app-time-picker-modal',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    DigitalClockPickerComponent
  ],
  template: `
    <div class="time-picker-modal">
      <h2 mat-dialog-title>Set Timer Duration</h2>
      
      <div class="instruction-text">
        <p>Scroll to select minutes and seconds</p>
      </div>
      
      <mat-dialog-content>
        <app-digital-clock-picker 
          [(time)]="time"
          [isEditable]="true" />
      </mat-dialog-content>

      <div class="selected-time">
        <strong>Selected:</strong> {{ time().minutes }}m {{ time().seconds }}s
      </div>

      <mat-dialog-actions align="end">
        <button mat-button (click)="onCancel()">Cancel</button>
        <button mat-raised-button color="primary" (click)="onConfirm()">
          Set Timer
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [`
    .time-picker-modal {
      h2 {
        color: #5FA9A4;
        font-weight: 600;
        margin: 0 0 8px 0;
        text-align: center;
        font-size: 24px;
      }

      .instruction-text {
        text-align: center;
        margin-bottom: 16px;

        p {
          color: #7F8C8D;
          font-size: 14px;
          margin: 0;
        }
      }

      .selected-time {
        text-align: center;
        padding: 16px;
        background: rgba(95, 169, 164, 0.1);
        border-radius: 8px;
        margin: 16px 0 0 0;
        color: #2C3E50;
        font-size: 16px;

        strong {
          color: #5FA9A4;
          font-weight: 600;
        }
      }
    }

    mat-dialog-content {
      padding: 16px 0;
      overflow: visible;
      min-width: 400px;
    }

    mat-dialog-actions {
      padding: 20px 0 0 0;
      margin: 0;
      gap: 12px;
      justify-content: center;
      
      button {
        min-width: 120px;
        font-weight: 600;
      }
    }

    ::ng-deep .mat-mdc-dialog-container {
      --mdc-dialog-container-color: #FFFFFF;
      --mdc-dialog-supporting-text-color: #2C3E50;
      padding: 32px;
    }

    ::ng-deep .mat-primary {
      --mdc-protected-button-container-color: #5FA9A4;
      --mdc-protected-button-label-text-color: #ffffff;
    }

    @media (max-width: 600px) {
      mat-dialog-content {
        min-width: 320px;
      }
    }
  `]
})
export class TimePickerModalComponent {
  private dialogRef = inject(MatDialogRef<TimePickerModalComponent>);

  time = signal<TimePickerData>({ minutes: 25, seconds: 0 });

  onCancel(): void {
    this.dialogRef.close();
  }

  onConfirm(): void {
    this.dialogRef.close(this.time());
  }
}
