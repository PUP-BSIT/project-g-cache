import { Injectable, inject } from '@angular/core';
import { Router, CanActivateFn, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { HistoryService } from '../services/history.service';

@Injectable({
  providedIn: 'root',
})
export class AuthGuardService {
  private router = inject(Router);
  private historyService = inject(HistoryService);

  canActivate(): boolean {
    const token = localStorage.getItem('accessToken');

    if (!token) {
      // No token found, redirect to login
      console.warn('[AuthGuard] No access token found, redirecting to login');
      this.router.navigate(['/login']);
      return false;
    }

    // Basic validation: check if token is a non-empty string
    if (typeof token !== 'string' || token.trim().length === 0) {
      console.warn('[AuthGuard] Invalid token format, redirecting to login');
      this.clearAuthData();
      this.router.navigate(['/login']);
      return false;
    }

    // Token exists and has basic validity
    // The auth-error interceptor will handle expired/invalid tokens on API calls
    return true;
  }

  private clearAuthData(): void {
    try {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('currentUser');
    } catch (e) {
      console.warn('[AuthGuard] Unable to clear auth data', e);
    }
  }
}

/**
 * Protects authenticated routes - requires valid auth token
 */
export const authGuard: CanActivateFn = (route, state) => {
  return inject(AuthGuardService).canActivate();
};

/**
 * Prevents authenticated users from accessing public pages (login, signup)
 * Redirects them to dashboard instead
 */
export const publicPageGuard: CanActivateFn = (route: ActivatedRouteSnapshot, state: RouterStateSnapshot) => {
  const router = inject(Router);
  const token = localStorage.getItem('accessToken');

  if (token) {
    // User is logged in, redirect to dashboard
    router.navigate(['/dashboard']);
    return false;
  }

  // User is not logged in, allow access to public page
  return true;
};
