import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MatDialogModule, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';

export interface ConfirmDialogData {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
}

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule
  ],
  template: `
    <div class="confirm-dialog">
      <h2 mat-dialog-title>{{ data.title }}</h2>
      
      <mat-dialog-content>
        <p>{{ data.message }}</p>
      </mat-dialog-content>

      <mat-dialog-actions align="end">
        <button mat-button (click)="onCancel()">
          {{ data.cancelText || 'Cancel' }}
        </button>
        <button mat-raised-button color="warn" (click)="onConfirm()">
          {{ data.confirmText || 'Confirm' }}
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [`
    .confirm-dialog {
      min-width: 300px;

      h2 {
        color: #5FA9A4;
        font-weight: 600;
        margin: 0;
        text-align: center;
      }

      p {
        color: #2C3E50;
        font-size: 16px;
        line-height: 1.5;
        margin: 16px 0;
      }
    }

    mat-dialog-content {
      padding: 20px 24px;
      overflow: visible;
    }

    mat-dialog-actions {
      padding: 16px 24px;
      margin: 0;
      
      button {
        margin-left: 8px;
      }
    }

    ::ng-deep .mat-mdc-dialog-container {
      --mdc-dialog-container-color: #FFFFFF;
      --mdc-dialog-supporting-text-color: #2C3E50;
    }

    ::ng-deep .mat-warn {
      --mdc-protected-button-container-color: #E74C3C;
      --mdc-protected-button-label-text-color: #ffffff;
    }
  `]
})
export class ConfirmDialogComponent {
  private dialogRef = inject(MatDialogRef<ConfirmDialogComponent>);
  data = inject<ConfirmDialogData>(MAT_DIALOG_DATA);

  onCancel(): void {
    this.dialogRef.close(false);
  }

  onConfirm(): void {
    this.dialogRef.close(true);
  }
}
