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
  credentialsRejected = false; // Track if last login attempt failed

  get passwordInputType(): 'password' | 'text' {
    return this.passwordVisible ? 'text' : 'password';
  }

  togglePasswordVisibility(): void {
    this.passwordVisible = !this.passwordVisible;
  }

  onSubmit(): void {
    // Clear previous rejection flag on new submission attempt
    this.credentialsRejected = false;
    this.errorMessage = '';

    // Validate form structure (required fields, format, etc)
    if (this.loginForm.invalid) {
      this.errorMessage = 'Please fill in a valid email and password.';
      this.loginForm.markAllAsTouched();
      return;
    }

    const { email, password } = this.loginForm.getRawValue() as { email: string; password: string };

    this.isLoading = true;

    console.log('Login submit', { email });

    this.auth.login(email, password)
      .then((result: { success: boolean; needsVerification?: boolean }) => {
        if (result.needsVerification) {
          this.auth.showVerifyEmailModal();
        }
      })
      .catch((error: Error & { message?: string }) => {
        console.error('Login error:', error);
        this.credentialsRejected = true;
        this.errorMessage = error?.message || 'Invalid email or password';
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
