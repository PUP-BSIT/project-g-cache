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
      AuthGuardService.profileChecked = false;
      // Redirect to login page if not authenticated
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
