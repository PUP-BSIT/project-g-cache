import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Auth } from '../../core/services/auth';

@Component({
  standalone: true,
  selector: 'app-login',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login.html',
  styleUrls: ['./login.scss'],
})
export class Login {
  private router = inject(Router);
  private auth = inject(Auth);
  private fb = inject(FormBuilder);

  loginForm: FormGroup = this.fb.group({
    email: [
      '',
      {
        validators: [Validators.required, Validators.email],
      },
    ],
    password: [
      '',
      {
        validators: [Validators.required, Validators.minLength(6)],
      },
    ],
  });

  // UI state
  isLoading = false;
  errorMessage = '';
  passwordVisible = false;

  get passwordInputType(): 'password' | 'text' {
    return this.passwordVisible ? 'text' : 'password';
  }

  togglePasswordVisibility(): void {
    this.passwordVisible = !this.passwordVisible;
  }

  onSubmit(): void {
    // Clear any previous invalidCredentials flags so a new attempt can be made
    const emailCtrl = this.loginForm.get('email');
    const passwordCtrl = this.loginForm.get('password');
    if (emailCtrl?.hasError('invalidCredentials')) {
      const { invalidCredentials, ...rest } = emailCtrl.errors || {};
      emailCtrl.setErrors(Object.keys(rest).length ? rest : null);
    }
    if (passwordCtrl?.hasError('invalidCredentials')) {
      const { invalidCredentials, ...rest } = passwordCtrl.errors || {};
      passwordCtrl.setErrors(Object.keys(rest).length ? rest : null);
    }

    if (this.loginForm.invalid) {
      this.errorMessage = 'Please fill in a valid email and password.';
      this.loginForm.markAllAsTouched();
      return;
    }

    const { email, password } = this.loginForm.getRawValue() as { email: string; password: string };

    this.isLoading = true;
    this.errorMessage = '';

    console.log('Login submit', { email });

    this.auth.login(email, password)
      .then((result: { success: boolean; needsVerification?: boolean }) => {
        if (result.needsVerification) {
          this.auth.showVerifyEmailModal();
        }
      })
      .catch((error: Error & { message?: string }) => {
        console.error('Login error:', error);
        this.errorMessage = error?.message || 'Invalid email or password';
        // Mark controls so the user sees which fields need attention
        this.loginForm.get('email')?.setErrors({ ...(this.loginForm.get('email')?.errors || {}), invalidCredentials: true });
        this.loginForm.get('password')?.setErrors({ ...(this.loginForm.get('password')?.errors || {}), invalidCredentials: true });
      })
      .finally(() => {
        this.isLoading = false;
      });
  }

  onGoogleSignIn(): void {
    console.log('Google sign in clicked');
  }

  onForgotPassword(event: Event): void {
    event.preventDefault();
    console.log('Forgot password clicked');
    // Navigate to forgot password page or show modal
  }

  onSignUp(event: Event): void {
    event.preventDefault();
    console.log('Sign up clicked');
    // Navigate to sign up page
    this.router.navigate(['/signup']);
  }

  onClose(): void {
    this.router.navigate(['/']);
  }
}
