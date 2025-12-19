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
    console.log('[AuthGuard] Checking authentication, profileChecked:', AuthGuardService.profileChecked);
    if (AuthGuardService.profileChecked) {
      // Prevent infinite loop
      console.log('[AuthGuard] Already checking profile, preventing infinite loop');
      return false;
    }
    AuthGuardService.profileChecked = true;
    try {
      console.log('[AuthGuard] Attempting to fetch user profile');
      await this.auth.fetchAndStoreUserProfile();
      console.log('[AuthGuard] Profile fetched successfully, granting access');
      AuthGuardService.profileChecked = false;
      return true;
    } catch (e) {
      console.error('[AuthGuard] Profile fetch failed:', e);
      AuthGuardService.profileChecked = false;
      // Redirect to login page if not authenticated
      console.log('[AuthGuard] Redirecting to login');
      this.router.navigate(['/login']);
      return false;
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
  // Do not check profile or call any API on public pages (e.g., login, signup)
  // If you want to redirect authenticated users away from login, you can check a local signal/flag if available
  return true;
};
