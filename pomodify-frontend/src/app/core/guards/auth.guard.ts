import { Injectable, inject } from '@angular/core';
import { API } from '../config/api.config';
import { Router, CanActivateFn, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { Auth } from '../services/auth';

@Injectable({
  providedIn: 'root',
})
export class AuthGuardService {
  private router = inject(Router);
  private auth = inject(Auth);
  private static profileChecked = false;

  async canActivate(): Promise<boolean> {
    if (AuthGuardService.profileChecked) {
      // Prevent infinite loop
      return false;
    }
    AuthGuardService.profileChecked = true;
    try {
      await this.auth.fetchAndStoreUserProfile();
      AuthGuardService.profileChecked = false;
      return true;
    } catch (e) {
      console.error('[AuthGuard] Profile fetch failed:', e);
      AuthGuardService.profileChecked = false;
      // Redirect to login page if not authenticated
      this.router.navigate(['/login']);
      return false;
    }
  }

  async canActivatePublic(state: RouterStateSnapshot): Promise<boolean> {
    // If we've already checked the profile recently, don't check again to avoid loops
    if (AuthGuardService.profileChecked) {
      return true;
    }

    try {
      AuthGuardService.profileChecked = true;
      await this.auth.fetchAndStoreUserProfile();
      AuthGuardService.profileChecked = false;
      this.router.navigate(['/dashboard']);
      return false;
    } catch (e) {
      // User is not logged in
      AuthGuardService.profileChecked = false;
      
      // "The Permanent Flag" Logic
      const hasLoggedInBefore = localStorage.getItem('has_logged_in_before') === 'true';
      const targetUrl = state.url;
      const navigation = this.router.getCurrentNavigation();
      const skipRedirect = navigation?.extras?.state?.['skipRedirect'] === true;
      
      // If user has logged in before, and is visiting Landing ('/')
      // Redirect to Login instead of showing Landing
      // UNLESS we explicitly skipped the redirect (e.g. clicking "Back" from Login)
      if (hasLoggedInBefore && targetUrl === '/' && !skipRedirect) {
        this.router.navigate(['/login']);
        return false;
      }

      return true;
    }
  }
}

/**
 * Protects authenticated routes - requires valid auth token
 */
export const authGuard: CanActivateFn = async (route, state) => {
  return await inject(AuthGuardService).canActivate();
};

/**
 * Prevents authenticated users from accessing public pages (login, signup)
 * Redirects them to dashboard instead
 */
export const publicPageGuard: CanActivateFn = async (route: ActivatedRouteSnapshot, state: RouterStateSnapshot) => {
  return await inject(AuthGuardService).canActivatePublic(state);
};
