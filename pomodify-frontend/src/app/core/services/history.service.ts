import { Injectable, inject } from '@angular/core';
import { Location } from '@angular/common';
import { Router, NavigationEnd, NavigationStart } from '@angular/router';
import { filter } from 'rxjs/operators';

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

  /**
   * Check if the user is trying to navigate back to a public page (login/signup)
   * from an authenticated page (dashboard, activities, etc.)
   */
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

  /**
   * Clear history when user logs out
   */
  clearHistory(): void {
    this.navigationHistory = [];
  }

  /**
   * Get navigation history for debugging
   */
  getHistory(): string[] {
    return [...this.navigationHistory];
  }

  /**
   * Prevent back navigation by replacing history
   */
  preventBack(): void {
    // Remove the current URL from history
    if (this.navigationHistory.length > 0) {
      this.navigationHistory.pop();
    }
    // This doesn't prevent back button but logs the attempt
    console.warn('User attempted to navigate back to a public page from protected area');
  }
}
