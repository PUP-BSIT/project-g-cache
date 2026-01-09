import { Injectable, inject } from '@angular/core';
import { Location } from '@angular/common';
import { Router, NavigationEnd, NavigationStart } from '@angular/router';
import { filter } from 'rxjs/operators';
import { Logger } from './logger.service';

@Injectable({
  providedIn: 'root',
})
export class HistoryService {
  private router = inject(Router);
  private location = inject(Location);
  private navigationHistory: string[] = [];
  private isNavigatingBack = false;

  constructor() {
    this.initializeHistoryTracking();
  }

  private initializeHistoryTracking(): void {
    // Track all successful navigations
    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        const url = event.urlAfterRedirects;

        // Don't add consecutive duplicate URLs
        if (this.navigationHistory[this.navigationHistory.length - 1] !== url) {
          this.navigationHistory.push(url);
        }
      });

    // Detect browser back button
    this.router.events
      .pipe(filter((event) => event instanceof NavigationStart))
      .subscribe((event: NavigationStart) => {
        this.isNavigatingBack = event.navigationTrigger === 'imperative' ? false : true;
      });
  }

  isAttemptingToGoBackToPublicPage(): boolean {
    if (this.navigationHistory.length < 2) {
      return false;
    }

    const currentUrl = this.navigationHistory[this.navigationHistory.length - 1];
    const previousUrl = this.navigationHistory[this.navigationHistory.length - 2];

    const publicPages = ['/login', '/signup', '/landing', '/'];
    const protectedPages = ['/dashboard', '/activities', '/settings', '/report'];

    const isCurrentlyOnProtected = protectedPages.some((page) => currentUrl.includes(page));
    const wasOnPublicPage = publicPages.some((page) => previousUrl === page || previousUrl.includes(page));

    return isCurrentlyOnProtected && wasOnPublicPage && this.isNavigatingBack;
  }

  clearHistory(): void {
    this.navigationHistory = [];
  }

  getHistory(): string[] {
    return [...this.navigationHistory];
  }

  preventBack(): void {
    // Remove the current URL from history
    if (this.navigationHistory.length > 0) {
      this.navigationHistory.pop();
    }
    Logger.warn('User attempted to navigate back to a public page from protected area');
  }
}
