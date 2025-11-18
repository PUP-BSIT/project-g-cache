import { Component, EventEmitter, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { Router } from '@angular/router';

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

  onOpenEmail(): void {
    this.openEmail.emit();
    window.location.href = 'mailto:';
  }

  onBackToSignUp(): void {
    this.backToSignUp.emit();
    this.dialogRef.close();
    this.router.navigate(['/signup']);
  }
}