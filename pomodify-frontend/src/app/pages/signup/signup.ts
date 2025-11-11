import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

@Component({
  selector: 'app-signup',
  imports: [FormsModule],
  templateUrl: './signup.html',
  styleUrl: './signup.scss',
})
export class Signup {
  email: string = '';
  password: string = '';
  confirmPassword: string = '';

  constructor(private router: Router) {}

  onSubmit() {
    console.log('Signup submitted:', { email: this.email, password: this.password });
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
