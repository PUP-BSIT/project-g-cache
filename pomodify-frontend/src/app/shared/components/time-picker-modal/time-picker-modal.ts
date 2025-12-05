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
      <h2 mat-dialog-title>Set Timer</h2>
      
      <mat-dialog-content>
        <app-digital-clock-picker 
          [(time)]="time"
          [isEditable]="true" />
      </mat-dialog-content>

      <mat-dialog-actions align="end">
        <button mat-button (click)="onCancel()">Cancel</button>
        <button mat-raised-button color="primary" (click)="onConfirm()">
          OK
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [`
    .time-picker-modal {
      h2 {
        color: #1abc9c;
        font-weight: 600;
        margin: 0;
        text-align: center;
      }
    }

    mat-dialog-content {
      padding: 0;
      overflow: visible;
      min-width: 350px;
    }

    mat-dialog-actions {
      padding: 1.5rem 0 0 0;
      margin: 0;
      
      button {
        margin-left: 0.5rem;
      }
    }

    ::ng-deep .mat-mdc-dialog-container {
      --mdc-dialog-container-color: #1e3a47;
      --mdc-dialog-supporting-text-color: #ffffff;
    }

    ::ng-deep .mat-primary {
      --mdc-protected-button-container-color: #1abc9c;
      --mdc-protected-button-label-text-color: #ffffff;
    }

    @media (max-width: 600px) {
      mat-dialog-content {
        min-width: 280px;
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
