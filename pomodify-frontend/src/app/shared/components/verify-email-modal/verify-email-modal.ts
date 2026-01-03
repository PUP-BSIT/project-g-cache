import { Component, EventEmitter, Output, inject, Inject, Optional } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MatDialogModule, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { Router } from '@angular/router';

export interface VerifyEmailModalData {
  source: 'signup' | 'login';
  email?: string;
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
  email: string = '';

  constructor(@Optional() @Inject(MAT_DIALOG_DATA) data: VerifyEmailModalData) {
    if (data?.source) {
      this.source = data.source;
    }
    if (data?.email) {
      this.email = data.email;
    }
  }

  get actionButtonText(): string {
    return this.source === 'signup' ? 'Continue to Login' : 'Back to Login';
  }

  get isGmailUser(): boolean {
    return this.email.toLowerCase().endsWith('@gmail.com');
  }

  onOpenEmail(): void {
    if (this.isGmailUser) {
      window.open('https://mail.google.com', '_blank');
    }
  }

  onGoToLogin(): void {
    this.goToLogin.emit();
    this.dialogRef.close('goToLogin');
    this.router.navigate(['/login']);
  }
}