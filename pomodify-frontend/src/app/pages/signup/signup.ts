import { Component, ChangeDetectionStrategy, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Auth } from '../../core/services/auth';
import { ensurePublicPageLightTheme } from '../../shared/theme';
import { SuccessNotificationService } from '../../core/services/success-notification.service';

type SignupCredentials = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
};

@Component({
  standalone: true,
  selector: 'app-signup',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './signup.html',
  styleUrls: ['./signup.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Signup implements OnInit {
  private readonly router = inject(Router);
  private readonly auth = inject(Auth);
  private readonly fb = inject(FormBuilder);
  private readonly notificationService = inject(SuccessNotificationService);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly signupForm: FormGroup = this.fb.group({
    firstName: ['', { validators: [Validators.required, Validators.minLength(2)] }],
    lastName: ['', { validators: [Validators.required, Validators.minLength(2)] }],
    email: ['', { validators: [Validators.required, Validators.email] }],
    password: ['', { validators: [Validators.required, Validators.minLength(8)] }],
    confirmPassword: ['', { validators: [Validators.required, Validators.minLength(8)] }],
  });

  isLoading = false;
  passwordVisible = false;
  confirmPasswordVisible = false;

  ngOnInit(): void {
    ensurePublicPageLightTheme();
  }

  get passwordInputType(): 'password' | 'text' {
    return this.passwordVisible ? 'text' : 'password';
  }

  get confirmPasswordInputType(): 'password' | 'text' {
    return this.confirmPasswordVisible ? 'text' : 'password';
  }

  togglePasswordVisibility(): void {
    this.passwordVisible = !this.passwordVisible;
  }

  toggleConfirmPasswordVisibility(): void {
    this.confirmPasswordVisible = !this.confirmPasswordVisible;
  }

  onSubmit(): void {
    if (this.signupForm.invalid) {
      this.notificationService.showError('Validation Error', 'Please fill in all fields with valid information.');
      this.signupForm.markAllAsTouched();
      return;
    }

    const { firstName, lastName, email, password, confirmPassword } = this.signupForm.getRawValue() as SignupCredentials;

    if (password !== confirmPassword) {
      this.notificationService.showError('Password Mismatch', 'Passwords do not match');
      const confirmControl = this.signupForm.get('confirmPassword');
      if (confirmControl) {
        confirmControl.setErrors({ ...(confirmControl.errors || {}), mismatch: true });
      }
      return;
    }

    this.isLoading = true;

    this.auth.signup(firstName, lastName, email, password)
      .then(() => {
        this.notificationService.showSuccess('Account Created Successfully', 'Welcome to Pomodify!');
        this.auth.showVerifyEmailModal();
      })
      .catch((error: Error & { message?: string }) => {
        this.notificationService.showError('Signup Failed', error?.message || 'Failed to create account. Please try again.');
      })
      .finally(() => {
        this.isLoading = false;
        this.cdr.markForCheck();
      });
  }

  onGoogleSignIn(): void {
    window.location.href = 'https://accounts.google.com/o/oauth2/v2/auth';
  }

  onLogin(event: Event): void {
    event.preventDefault();
    this.router.navigate(['/login']);
  }

  onNavigate(page: string, event: Event): void {
    event.preventDefault();
    switch (page) {
      case 'home':
        this.router.navigate(['/'], { state: { skipRedirect: true } });
        break;
    }
  }

  onBack(): void {
    this.router.navigate(['/'], { state: { skipRedirect: true } });
  }

  onClose(): void {
    this.router.navigate(['/'], { state: { skipRedirect: true } });
  }
}
