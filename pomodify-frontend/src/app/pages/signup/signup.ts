import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Auth } from '../../core/services/auth';

@Component({
  standalone: true,
  selector: 'app-signup',
  imports: [CommonModule, FormsModule],
  templateUrl: './signup.html',
  styleUrl: './signup.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Signup {
  email: string = '';
  password: string = '';
  confirmPassword: string = '';

  isLoading = false;
  errorMessage = '';

  private router = inject(Router);
  private auth = inject(Auth);

  onSubmit() {
    if (!this.email || !this.password || !this.confirmPassword) {
      this.errorMessage = 'Please fill in all fields';
      return;
    }

    if (this.password !== this.confirmPassword) {
      this.errorMessage = 'Passwords do not match';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    // In a real app, you would call your signup API here
    // For now, we'll simulate a successful signup that requires email verification
    this.auth.signup(this.email, this.password)
      .then(() => {
        // Show verify email modal
        this.auth.showVerifyEmailModal();
      })
      .catch(error => {
        console.error('Signup error:', error);
        this.errorMessage = 'Failed to create account. Please try again.';
      })
      .finally(() => {
        this.isLoading = false;
      });
  }

  onGoogleSignIn() {
    console.log('Google sign in clicked');
  }

  onLogin(event: Event) {
    event.preventDefault();
    console.log('Log in clicked');
    // Navigate to login page
    this.router.navigate(['/login']);
  }

  onClose() {
    this.router.navigate(['/']);
  }
}
