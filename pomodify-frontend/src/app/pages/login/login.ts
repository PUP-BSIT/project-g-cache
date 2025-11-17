import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  imports: [FormsModule],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
  email: string = '';
  password: string = '';

  constructor(private router: Router) {}

  onSubmit() {
    console.log('Login submitted:', {
      email: this.email,
      password: this.password,
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
