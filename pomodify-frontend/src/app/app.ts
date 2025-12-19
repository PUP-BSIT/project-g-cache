import { Component, signal, inject } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly title = signal('pomodify-frontend');

  private router = inject(Router);

  constructor() {
    this.handleOAuthRedirect();
  }

  private handleOAuthRedirect() {
    // Check if we are on the OAuth2 redirect page
    if (window.location.pathname === '/oauth2/redirect') {
      // No need to store tokens; backend sets httpOnly cookies
      // Optionally, fetch user info here or just redirect to dashboard
      this.router.navigate(['/dashboard']);
    }
  }
}
