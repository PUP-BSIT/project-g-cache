import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Auth } from '../../core/services/auth';

@Component({
  selector: 'app-login',
  imports: [FormsModule],
  templateUrl: './login.html',
  styleUrl: './login.scss',
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

    this.auth.login(this.email, this.password)
      .then(result => {
        if (result.needsVerification) {
          this.auth.showVerifyEmailModal();
        }
      })
      .catch(error => {
        console.error('Login error:', error);
        this.errorMessage = 'Invalid email or password';
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
