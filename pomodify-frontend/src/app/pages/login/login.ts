import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Auth } from '../../core/services/auth';
import { API, OAUTH2_GOOGLE_URL } from '../../core/config/api.config';
import { ensurePublicPageLightTheme } from '../../shared/theme';
import { SuccessNotificationService } from '../../core/services/success-notification.service';

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
        this.notificationService.showError('Login Failed', error?.message || 'Invalid email or password');
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
    // TODO(User, Name): Implement forgot password navigation
  }

  onSignUp(event: Event): void {
    event.preventDefault();
    this.router.navigate(['/signup']);
  }

  onNavigate(page: string, event: Event): void {
    event.preventDefault();
    switch (page) {
      case 'home':
        this.router.navigate(['/']);
        break;
    }
  }

  onBack(): void {
    this.router.navigate(['/']);
  }

  onClose(): void {
    this.router.navigate(['/']);
  }
}
