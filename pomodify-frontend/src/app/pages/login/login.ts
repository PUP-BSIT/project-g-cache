import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Auth } from '../../core/services/auth';

@Component({
  standalone: true,
  selector: 'app-login',
  imports: [CommonModule, FormsModule],
  templateUrl: './login.html',
  styleUrls: ['./login.scss'],
})
export class Login {
  email: string = '';
  password: string = '';

  isLoading = false;
  errorMessage = '';

  constructor(
    private router: Router,
    private auth: Auth
  ) {}

  onSubmit() {
    if (!this.email || !this.password) {
      this.errorMessage = 'Please enter both email and password';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    console.log('Login submit', { email: this.email });

    this.auth.login(this.email, this.password)
      .then(result => {
        if (result.needsVerification) {
          this.auth.showVerifyEmailModal();
        }
      })
      .catch(error => {
        console.error('Login error:', error);
        this.errorMessage = error?.message || 'Invalid email or password';
      })
      .finally(() => {
        this.isLoading = false;
      });
  }

  onGoogleSignIn() {
    console.log('Google sign in clicked');
  }

  onForgotPassword(event: Event) {
    event.preventDefault();
    console.log('Forgot password clicked');
    // Navigate to forgot password page or show modal
  }

  onSignUp(event: Event) {
    event.preventDefault();
    console.log('Sign up clicked');
    // Navigate to sign up page
    this.router.navigate(['/signup']);
  }

  onClose() {
    this.router.navigate(['/']);
  }
}
