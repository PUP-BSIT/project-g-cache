import { Injectable, inject } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { VerifyEmailModal } from '../components/verify-email-modal/verify-email-modal';

@Injectable({
  providedIn: 'root'
})
export class VerifyEmailService {
  private dialog = inject(MatDialog);
  private router = inject(Router);

  openVerifyEmailModal(email: string): void {
    const dialogRef = this.dialog.open(VerifyEmailModal, {
      width: '90%',
      maxWidth: '500px',
      disableClose: true,
      panelClass: 'verify-email-dialog',
      data: { email }
    });

    const openEmailSub = dialogRef.componentInstance.openEmail.subscribe(() => {
      window.location.href = `mailto:${email}`;
    });

    const backToSignUpSub = dialogRef.componentInstance.backToSignUp.subscribe(() => {
      this.router.navigate(['/signup']);
    });

    dialogRef.afterClosed().subscribe(() => {
      openEmailSub.unsubscribe();
      backToSignUpSub.unsubscribe();
    });
  }
}