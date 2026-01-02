import { Component, Inject, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { Auth } from '../../../core/services/auth';
import { SuccessNotificationService } from '../../../core/services/success-notification.service';

export interface UnverifiedAccountModalData {
  email: string;
}

@Component({
  selector: 'app-unverified-account-modal',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule],
  templateUrl: './unverified-account-modal.html',
  styleUrls: ['./unverified-account-modal.scss']
})
export class UnverifiedAccountModal {
  private auth = inject(Auth);
  private notificationService = inject(SuccessNotificationService);
  private dialogRef = inject(MatDialogRef<UnverifiedAccountModal>);

  isResending = signal(false);

  constructor(@Inject(MAT_DIALOG_DATA) public data: UnverifiedAccountModalData) {}

  onResendVerification(): void {
    if (this.isResending()) return;
    
    this.isResending.set(true);
    this.auth.resendVerification(this.data.email)
      .then(() => {
        this.notificationService.showSuccess('Email Sent', 'A new verification link has been sent to your email.');
        this.dialogRef.close();
      })
      .catch((error) => {
        console.error('Resend error:', error);
        this.notificationService.showError('Error', 'Failed to send verification email. Please try again.');
      })
      .finally(() => {
        this.isResending.set(false);
      });
  }

  onClose(): void {
    this.dialogRef.close();
  }
}
