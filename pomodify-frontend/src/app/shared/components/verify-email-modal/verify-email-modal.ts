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
  @Output() openEmail = new EventEmitter<void>();
  @Output() backToSignUp = new EventEmitter<void>();
  
  private dialogRef = inject(MatDialogRef<VerifyEmailModal>);
  private router = inject(Router);
  
  source: 'signup' | 'login' = 'signup';

  constructor(@Optional() @Inject(MAT_DIALOG_DATA) data: VerifyEmailModalData) {
    if (data?.source) {
      this.source = data.source;
    }
  }

  get actionButtonText(): string {
    return this.source === 'signup' ? 'Continue to Login' : 'Back to Login';
  }

  onOpenEmail(): void {
    this.openEmail.emit();
    window.location.href = 'mailto:';
  }

  onAction(): void {
    this.backToSignUp.emit();
    this.dialogRef.close();
    this.router.navigate(['/login']);
  }
}