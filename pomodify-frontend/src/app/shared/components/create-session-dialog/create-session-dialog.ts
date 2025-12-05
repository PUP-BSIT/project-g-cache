import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { SessionType } from '../../../core/services/session.service';

export interface CreateSessionDialogData {
  sessionType: SessionType;
  focusTimeInMinutes: number;
  breakTimeInMinutes: number;
  cycles: number;
}

@Component({
  selector: 'app-create-session-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule
  ],
  template: `
    <div class="create-session-dialog">
      <h2 mat-dialog-title>Create New Session</h2>
      
      <mat-dialog-content>
        <div class="form-container">
          <!-- Session Type -->
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Session Type</mat-label>
            <mat-select [(ngModel)]="formData.sessionType">
              <mat-option value="CLASSIC">Classic</mat-option>
              <mat-option value="FREESTYLE">Freestyle</mat-option>
            </mat-select>
          </mat-form-field>

          <!-- Focus Time -->
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Focus Time (minutes)</mat-label>
            <input 
              matInput 
              type="number" 
              [(ngModel)]="formData.focusTimeInMinutes"
              min="1"
              max="120">
          </mat-form-field>

          <!-- Break Time -->
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Break Time (minutes)</mat-label>
            <input 
              matInput 
              type="number" 
              [(ngModel)]="formData.breakTimeInMinutes"
              min="1"
              max="60">
          </mat-form-field>

          <!-- Cycles (hidden for FREESTYLE) -->
          @if (formData.sessionType === 'CLASSIC') {
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Cycles</mat-label>
              <input 
                matInput 
                type="number" 
                [(ngModel)]="formData.cycles"
                min="1"
                max="12">
            </mat-form-field>
          }
        </div>
      </mat-dialog-content>

      <mat-dialog-actions align="end">
        <button mat-button (click)="onCancel()">Cancel</button>
        <button mat-raised-button color="primary" (click)="onConfirm()">
          Create Session
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [`
    .create-session-dialog {
      min-width: 400px;
      
      h2 {
        color: #1abc9c;
        font-weight: 600;
        margin: 0;
      }
    }

    mat-dialog-content {
      padding: 1.5rem 0;
      overflow: visible;
    }

    .form-container {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .full-width {
      width: 100%;
    }

    mat-dialog-actions {
      padding: 1rem 0 0 0;
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

    ::ng-deep .mat-mdc-form-field {
      --mdc-outlined-text-field-label-text-color: rgba(255, 255, 255, 0.7);
      --mdc-outlined-text-field-input-text-color: #ffffff;
      --mdc-outlined-text-field-outline-color: rgba(26, 188, 156, 0.3);
      --mdc-outlined-text-field-hover-outline-color: rgba(26, 188, 156, 0.6);
      --mdc-outlined-text-field-focus-outline-color: #1abc9c;
    }

    ::ng-deep .mat-mdc-select {
      --mat-select-trigger-text-color: #ffffff;
      --mat-select-arrow-color: rgba(255, 255, 255, 0.7);
    }

    @media (max-width: 600px) {
      .create-session-dialog {
        min-width: 300px;
      }
    }
  `]
})
export class CreateSessionDialogComponent {
  private dialogRef = inject(MatDialogRef<CreateSessionDialogComponent>);

  // Use regular properties for form binding, not signals
  formData: CreateSessionDialogData = {
    sessionType: 'CLASSIC',
    focusTimeInMinutes: 25,
    breakTimeInMinutes: 5,
    cycles: 4
  };

  onCancel(): void {
    this.dialogRef.close();
  }

  onConfirm(): void {
    this.dialogRef.close(this.formData);
  }
}
