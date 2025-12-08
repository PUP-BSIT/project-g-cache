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
        font-weight: 700;
        margin: 0 0 8px 0;
        text-align: center;
        font-size: 28px;
        letter-spacing: -0.5px;
      }

      .instruction-text {
        text-align: center;
        margin-bottom: 20px;

        p {
          color: #9CA3AF;
          font-size: 14px;
          margin: 0;
          font-weight: 500;
        }
      }

      .selected-time {
        text-align: center;
        padding: 20px 32px;
        background: linear-gradient(135deg, rgba(95, 169, 164, 0.08) 0%, rgba(95, 169, 164, 0.12) 100%);
        border-radius: 16px;
        margin: 32px auto 0 auto;
        max-width: 280px;
        color: #2C3E50;
        font-size: 19px;
        border: 1px solid rgba(95, 169, 164, 0.25);
        box-shadow: 0 2px 8px rgba(95, 169, 164, 0.08);
        font-weight: 500;

        strong {
          color: #5FA9A4;
          font-weight: 700;
          font-size: 20px;
        }
      }
    }

    mat-dialog-content {
      padding: 0;
      overflow: hidden !important;
      display: flex;
      justify-content: center;
      align-items: center;
      margin: 0;
      width: 100%;
      min-height: 240px;
      max-height: 240px;
      
      * {
        scrollbar-width: none !important;
        -ms-overflow-style: none !important;
        
        &::-webkit-scrollbar {
          display: none !important;
        }
      }
    }

    mat-dialog-actions {
      padding: 32px 24px 24px 24px;
      margin: 0;
      gap: 24px;
      justify-content: center;
      display: flex;
      align-items: center;
      
      button {
        min-width: 150px;
        font-weight: 700;
        padding: 14px 32px;
        font-size: 16px;
        border-radius: 12px;
        text-transform: none;
        letter-spacing: 0.3px;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        
        &:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }
      }
      
      button[mat-button] {
        color: #6B7280;
        border: 2px solid #E5E7EB;
        background-color: #FFFFFF;
        
        &:hover {
          border-color: #9CA3AF;
          background-color: #F9FAFB;
        }
      }
      
      button[mat-raised-button] {
        background-color: #5FA9A4 !important;
        color: #FFFFFF !important;
        box-shadow: 0 2px 4px rgba(95, 169, 164, 0.3);
        padding: 14px 48px !important;
        letter-spacing: 1px !important;
        
        &:hover {
          background-color: #4E8E89 !important;
          box-shadow: 0 4px 12px rgba(95, 169, 164, 0.4);
        }
      }
    }

    ::ng-deep .mat-mdc-dialog-container {
      --mdc-dialog-container-color: #FFFFFF;
      --mdc-dialog-supporting-text-color: #2C3E50;
      padding: 32px 48px 36px 48px;
      width: 900px !important;
      min-width: 900px;
      max-width: 95vw;
      height: auto !important;
      max-height: none !important;
      overflow: visible !important;
      border-radius: 20px;
    }

    ::ng-deep .mat-mdc-dialog-surface {
      width: 900px !important;
      min-width: 900px;
      max-width: 95vw;
      overflow: visible !important;
    }

    ::ng-deep .cdk-overlay-pane {
      max-width: 900px !important;
      max-height: none !important;
      overflow: visible !important;
    }

    ::ng-deep .cdk-global-overlay-wrapper {
      position: fixed !important;
      top: 0 !important;
      left: 0 !important;
      right: 0 !important;
      bottom: 0 !important;
      display: flex !important;
      justify-content: center !important;
      align-items: center !important;
      z-index: 1000;
      pointer-events: none;
    }

    ::ng-deep .mat-primary {
      --mdc-protected-button-container-color: #5FA9A4;
      --mdc-protected-button-label-text-color: #ffffff;
    }
    
    ::ng-deep .mat-mdc-raised-button {
      padding: 14px 48px !important;
      letter-spacing: 1px !important;
      min-width: 170px !important;
    }
    
    ::ng-deep .mat-mdc-button {
      padding: 14px 32px !important;
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
