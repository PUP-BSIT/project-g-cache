import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Auth } from '../../core/services/auth';
import { API, OAUTH2_GOOGLE_URL } from '../../core/config/api.config';
import { ensurePublicPageLightTheme } from '../../shared/theme';
import { SuccessNotificationService } from '../../core/services/success-notification.service';
import { MatDialog } from '@angular/material/dialog';
import { ForgotPasswordModal } from '../../shared/components/forgot-password-modal/forgot-password-modal';
import { UnverifiedAccountModal } from '../../shared/components/unverified-account-modal/unverified-account-modal';

type LoginResponse = {
  success: boolean;
  needsVerification?: boolean;
};

type LoginCredentials = {
  email: string;
  password: string;
};

@Component({
  standalone: true,
  selector: 'app-login',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login.html',
  styleUrls: ['./login.scss'],
})
export class Login implements OnInit {
  private readonly router = inject(Router);
  private readonly auth = inject(Auth);
  private readonly fb = inject(FormBuilder);
  private readonly notificationService = inject(SuccessNotificationService);
  private readonly dialog = inject(MatDialog);

  readonly loginForm: FormGroup = this.fb.group({
    email: ['', { validators: [Validators.required, Validators.email] }],
    password: ['', { validators: [Validators.required, Validators.minLength(6)] }],
  });

  isLoading = false;
  passwordVisible = false;
  credentialsRejected = false;

  ngOnInit(): void {
    ensurePublicPageLightTheme();
  }

  get passwordInputType(): 'password' | 'text' {
    return this.passwordVisible ? 'text' : 'password';
  }

  togglePasswordVisibility(): void {
    this.passwordVisible = !this.passwordVisible;
  }

  onSubmit(): void {
    this.credentialsRejected = false;

    if (this.loginForm.invalid) {
      this.notificationService.showError('Validation Error', 'Please fill in a valid email and password.');
      this.loginForm.markAllAsTouched();
      return;
    }

    const { email, password } = this.loginForm.getRawValue() as LoginCredentials;
    this.isLoading = true;

    this.auth.login(email, password)
      .then((result: LoginResponse) => {
        this.notificationService.showSuccess('Login Successful', 'You have logged in successfully.');
        if (result.needsVerification) {
          this.auth.showVerifyEmailModal('login');
        }
      })
      .catch((error: Error & { message?: string }) => {
        console.error('Login error:', error);
        this.credentialsRejected = true;
        const msg = error?.message || 'Invalid email or password';
        
        if (msg.includes('Account locked')) {
            this.dialog.open(UnverifiedAccountModal, {
                data: { email },
                width: '400px',
                panelClass: 'unverified-account-modal'
            });
        } else {
            this.notificationService.showError('Login Failed', msg);
        }
      })
      .finally(() => {
        this.isLoading = false;
      });
  }

  onGoogleSignIn(): void {
    window.location.href = OAUTH2_GOOGLE_URL;
  }

  onForgotPassword(event: Event): void {
    event.preventDefault();
    this.dialog.open(ForgotPasswordModal, {
      width: '400px',
      disableClose: true,
      panelClass: 'forgot-password-dialog'
    });
  }

  onSignUp(event: Event): void {
    event.preventDefault();
    this.router.navigate(['/signup']);
  }

  onNavigate(page: string, event: Event): void {
    event.preventDefault();
    switch (page) {
      case 'home':
        this.router.navigate(['/landing']);
        break;
    }
  }

  onBack(): void {
    this.router.navigate(['/landing']);
  }

  onClose(): void {
    this.router.navigate(['/landing']);
  }
}
