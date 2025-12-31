import { Component, ChangeDetectionStrategy, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Auth } from '../../core/services/auth';
import { ensurePublicPageLightTheme } from '../../shared/theme';

@Component({
  standalone: true,
  selector: 'app-signup',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './signup.html',
  styleUrls: ['./signup.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Signup implements OnInit {
  private router = inject(Router);
  private auth = inject(Auth);
  private fb = inject(FormBuilder);

  signupForm: FormGroup = this.fb.group({
    firstName: [
      '',
      {
        validators: [Validators.required, Validators.minLength(2)],
      },
    ],
    lastName: [
      '',
      {
        validators: [Validators.required, Validators.minLength(2)],
      },
    ],
    email: [
      '',
      {
        validators: [Validators.required, Validators.email],
      },
    ],
    password: [
      '',
      {
        validators: [Validators.required, Validators.minLength(8)],
      },
    ],
    confirmPassword: [
      '',
      {
        validators: [Validators.required, Validators.minLength(8)],
      },
    ],
  });

  // UI state
  isLoading = false;
  errorMessage = '';
  passwordVisible = false;
  confirmPasswordVisible = false;

  ngOnInit(): void {
    // Force light theme on signup page
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
      this.errorMessage = 'Please fill in all fields with valid information.';
      this.signupForm.markAllAsTouched();
      return;
    }

    const { firstName, lastName, email, password, confirmPassword } = this.signupForm.getRawValue() as {
      firstName: string;
      lastName: string;
      email: string;
      password: string;
      confirmPassword: string;
    };

    if (password !== confirmPassword) {
      this.errorMessage = 'Passwords do not match';
      this.signupForm.get('confirmPassword')?.setErrors({ ...(this.signupForm.get('confirmPassword')?.errors || {}), mismatch: true });
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    console.log('Signup submit', { firstName, lastName, email });

    // Call the signup API
    this.auth.signup(firstName, lastName, email, password)
      .then(() => {
        // Show verify email modal
        this.auth.showVerifyEmailModal();
      })
      .catch((error: Error & { message?: string }) => {
        console.error('Signup error:', error);
        this.errorMessage = error?.message || 'Failed to create account. Please try again.';
      })
      .finally(() => {
        this.isLoading = false;
      });
  }

  onGoogleSignIn(): void {
    console.log('Google sign in clicked');
  }

  onLogin(event: Event): void {
    event.preventDefault();
    console.log('Log in clicked');
    // Navigate to login page
    this.router.navigate(['/login']);
  }

  onNavigate(page: string, event: Event): void {
    event.preventDefault();
    console.log(`Navigating to ${page}`);
    // Handle navigation for Home, Contact Us, Privacy Policy
    switch (page) {
      case 'home':
        this.router.navigate(['/']);
        break;
      case 'contact':
        // Navigate to contact page or scroll to contact section
        console.log('Contact us page');
        break;
      case 'privacy':
        // Navigate to privacy policy page or open in new tab
        console.log('Privacy policy page');
        break;
    }
  }

  onClose(): void {
    this.router.navigate(['/']);
  }
}
