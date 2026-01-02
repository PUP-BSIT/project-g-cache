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
  @Output() goToLogin = new EventEmitter<void>();
  
  private dialogRef = inject(MatDialogRef<VerifyEmailModal>);
  private router = inject(Router);

  onGoToLogin(): void {
    this.goToLogin.emit();
    this.dialogRef.close('goToLogin');
    this.router.navigate(['/login']);
  }
}