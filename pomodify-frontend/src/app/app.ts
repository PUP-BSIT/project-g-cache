import { Component, signal, OnInit, inject } from '@angular/core';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { ensurePublicPageLightTheme } from './shared/theme';
import { SuccessNotificationComponent } from './shared/components/success-notification/success-notification.component';
import { ErrorNotificationComponent } from './shared/components/error-notification/error-notification.component';
import { SuccessNotificationService } from './core/services/success-notification.service';
import { NotificationService } from './core/services/notification.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, SuccessNotificationComponent, ErrorNotificationComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnInit {
  protected readonly title = signal('pomodify-frontend');
  private readonly router = inject(Router);
  protected readonly notificationService = inject(SuccessNotificationService);
  private readonly pushNotificationService = inject(NotificationService);

  ngOnInit(): void {
    // Listen for navigation events to ensure public pages are always light theme
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        // Force public pages to light theme after navigation
        setTimeout(() => {
          ensurePublicPageLightTheme();
        }, 0);
      });

    // Also ensure current page is handled on app init
    setTimeout(() => {
      ensurePublicPageLightTheme();
    }, 0);

    // Handle OAuth2 redirect page
    if (window.location.pathname === '/oauth2/redirect') {
      this.router.navigate(['/dashboard']);
    }
  }
}
