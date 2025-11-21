import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { VerifyEmailModal } from '../../shared/components/verify-email-modal/verify-email-modal';

@Injectable({
  providedIn: 'root',
})
export class Auth {
  constructor(
    private router: Router,
    private dialog: MatDialog
  ) {}

  login(email: string, password: string): Promise<{ success: boolean; needsVerification?: boolean }> {
    // TODO: Replace with actual API call
    return new Promise((resolve) => {
      // Simulate API call
      setTimeout(() => {
        // For demo purposes, assume email needs verification if it contains 'unverified'
        const needsVerification = email.includes('unverified');
        
        if (needsVerification) {
          resolve({ success: true, needsVerification: true });
        } else {
          // Navigate to dashboard on successful login
          this.router.navigate(['/dashboard']);
          resolve({ success: true });
        }
      }, 1000);
    });
  }

  signup(email: string, password: string): Promise<void> {
    // In a real app, this would call your backend API to register the user
    return new Promise((resolve, reject) => {
      // Simulate API call
      setTimeout(() => {
        // For demo purposes, always resolve successfully
        // In a real app, you would handle errors from your API
        resolve();
      }, 1000);
    });
  }

  showVerifyEmailModal() {
    const dialogRef = this.dialog.open(VerifyEmailModal, {
      width: '400px',
      disableClose: true,
      panelClass: 'verify-email-dialog'
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result === 'backToSignUp') {
        this.router.navigate(['/signup']);
      }
    });
  }
}
