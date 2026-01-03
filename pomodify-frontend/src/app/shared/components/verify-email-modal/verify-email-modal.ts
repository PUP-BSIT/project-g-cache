import { Component, EventEmitter, Output, inject, Inject, Optional } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MatDialogModule, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { Router } from '@angular/router';

export interface VerifyEmailModalData {
  source: 'signup' | 'login';
}

@Component({
  selector: 'app-verify-email-modal',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule],
  templateUrl: './verify-email-modal.html',
  styleUrls: ['./verify-email-modal.scss']
})
export class VerifyEmailModal {
  @Output() goToLogin = new EventEmitter<void>();
  
  private dialogRef = inject(MatDialogRef<VerifyEmailModal>);
  private router = inject(Router);
  
  source: 'signup' | 'login' = 'signup';

  constructor(@Optional() @Inject(MAT_DIALOG_DATA) data: VerifyEmailModalData) {
    if (data?.source) {
      this.source = data.source;
    }
  }

  get actionButtonText(): string {
    return this.source === 'signup' ? 'Go to Dashboard' : 'Back to Login';
  }

  onGoToLogin(): void {
    this.goToLogin.emit();
    this.dialogRef.close('goToLogin');
    // After signup, user is already logged in, navigate to dashboard
    if (this.source === 'signup') {
      this.router.navigate(['/dashboard']);
    } else {
      this.router.navigate(['/login']);
    }
  }
}