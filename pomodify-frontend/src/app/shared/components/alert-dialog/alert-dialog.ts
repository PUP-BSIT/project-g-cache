import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MatDialogModule, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';

export interface AlertDialogData {
  title: string;
  message: string;
  buttonText?: string;
  type?: 'info' | 'warning' | 'error';
}

@Component({
  selector: 'app-alert-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule
  ],
  template: `
    <div class="alert-dialog" [ngClass]="'alert-' + (data.type || 'info')">
      <div class="alert-icon">
        @switch (data.type) {
          @case ('error') {
            <i class="fa-solid fa-circle-xmark"></i>
          }
          @case ('warning') {
            <i class="fa-solid fa-triangle-exclamation"></i>
          }
          @default {
            <i class="fa-solid fa-circle-info"></i>
          }
        }
      </div>
      
      <h2 mat-dialog-title>{{ data.title }}</h2>
      
      <mat-dialog-content>
        <p>{{ data.message }}</p>
      </mat-dialog-content>

      <mat-dialog-actions align="center">
        <button type="button" mat-raised-button color="primary" (click)="onClose()">
          {{ data.buttonText || 'OK' }}
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [`
    .alert-dialog {
      min-width: 320px;
      max-width: 400px;
      text-align: center;
      padding: 16px 0;

      .alert-icon {
        font-size: 48px;
        margin-bottom: 16px;
        
        i {
          display: inline-block;
        }
      }

      h2 {
        font-weight: 600;
        margin: 0;
        font-size: 20px;
      }

      p {
        color: #2C3E50;
        font-size: 15px;
        line-height: 1.5;
        margin: 12px 0;
      }
    }

    .alert-info {
      .alert-icon i { color: #3498DB; }
      h2 { color: #3498DB; }
    }

    .alert-warning {
      .alert-icon i { color: #F39C12; }
      h2 { color: #F39C12; }
    }

    .alert-error {
      .alert-icon i { color: #E74C3C; }
      h2 { color: #E74C3C; }
    }

    mat-dialog-content {
      padding: 8px 24px 16px;
      overflow: visible;
    }

    mat-dialog-actions {
      padding: 8px 24px 16px;
      margin: 0;
      justify-content: center;
      
      button {
        min-width: 100px;
        padding: 8px 32px;
        background-color: #5FA9A4;
        
        &:hover {
          background-color: #4a8a86;
        }
      }
    }

    ::ng-deep .mat-mdc-dialog-container {
      --mdc-dialog-container-color: #FFFFFF;
      --mdc-dialog-supporting-text-color: #2C3E50;
    }
  `]
})
export class AlertDialogComponent {
  protected dialogRef = inject(MatDialogRef<AlertDialogComponent>);
  protected data: AlertDialogData = inject(MAT_DIALOG_DATA);

  onClose(): void {
    this.dialogRef.close();
  }
}
