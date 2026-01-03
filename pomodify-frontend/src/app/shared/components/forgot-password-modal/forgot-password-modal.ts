import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Auth } from '../../../core/services/auth';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

type ModalStep = 'email' | 'backup-option' | 'backup-email-input' | 'add-backup-email' | 'success';

@Component({
  selector: 'app-forgot-password-modal',
  standalone: true,
  imports: [
    CommonModule, 
    MatDialogModule, 
    MatButtonModule, 
    MatInputModule, 
    MatFormFieldModule, 
    FormsModule, 
    ReactiveFormsModule,
    MatSnackBarModule
  ],
  templateUrl: './forgot-password-modal.html',
  styleUrls: ['./forgot-password-modal.scss']
})
export class ForgotPasswordModal {
  private fb = inject(FormBuilder);
  private auth = inject(Auth);
  private dialogRef = inject(MatDialogRef<ForgotPasswordModal>);
  private snackBar = inject(MatSnackBar);

  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]]
  });

  backupEmailForm = this.fb.group({
    backupEmail: ['', [Validators.required, Validators.email]]
  });

  newBackupEmailForm = this.fb.group({
    newBackupEmail: ['', [Validators.required, Validators.email]]
  });

  isLoading = signal(false);
  currentStep = signal<ModalStep>('email');
  maskedBackupEmail = signal<string | null>(null);
  sentToEmail = signal<string>('');

  async onSubmit() {
    if (this.form.invalid) return;

    this.isLoading.set(true);
    const email = this.form.value.email!;

    try {
      await this.auth.forgotPassword(email);
      this.sentToEmail.set(email);
      this.currentStep.set('success');
    } catch (error) {
      console.error('Forgot password error:', error);
      this.snackBar.open('Failed to send reset email. Please try again.', 'Close', {
        duration: 3000,
        panelClass: ['error-snackbar']
      });
    } finally {
      this.isLoading.set(false);
    }
  }

  async onCantAccessEmail() {
    if (this.form.invalid) return;

    this.isLoading.set(true);
    const email = this.form.value.email!;

    try {
      const result = await this.auth.checkBackupEmail(email);
      if (result.hasBackupEmail && result.maskedBackupEmail) {
        this.maskedBackupEmail.set(result.maskedBackupEmail);
        this.currentStep.set('backup-option');
      } else {
        this.currentStep.set('add-backup-email');
      }
    } catch (error) {
      console.error('Check backup email error:', error);
      this.snackBar.open('Failed to check backup email. Please try again.', 'Close', {
        duration: 3000,
        panelClass: ['error-snackbar']
      });
    } finally {
      this.isLoading.set(false);
    }
  }

  async onUseBackupEmail() {
    this.currentStep.set('backup-email-input');
  }

  async onSubmitBackupEmail() {
    if (this.backupEmailForm.invalid || this.form.invalid) return;

    this.isLoading.set(true);
    const email = this.form.value.email!;
    const backupEmail = this.backupEmailForm.value.backupEmail!;

    try {
      await this.auth.forgotPasswordViaBackupEmail(email, backupEmail);
      this.sentToEmail.set(backupEmail);
      this.currentStep.set('success');
    } catch (error: any) {
      console.error('Forgot password via backup email error:', error);
      const message = error?.error?.message || 'Backup email does not match. Please try again.';
      this.snackBar.open(message, 'Close', {
        duration: 3000,
        panelClass: ['error-snackbar']
      });
    } finally {
      this.isLoading.set(false);
    }
  }

  onBackToEmail() {
    this.currentStep.set('email');
    this.backupEmailForm.reset();
    this.newBackupEmailForm.reset();
  }

  onClose() {
    this.dialogRef.close();
  }
}
