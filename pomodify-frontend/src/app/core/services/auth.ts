import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { VerifyEmailModal } from '../../shared/components/verify-email-modal/verify-email-modal';
import { HttpClient } from '@angular/common/http';
import { lastValueFrom } from 'rxjs';
import { API } from '../config/api.config';
import { HistoryService } from './history.service';
import { FcmService } from './fcm.service';

type LoginResponse = {
  user?: {
    firstName: string;
    lastName: string;
    email: string;
  };
  accessToken: string;
  refreshToken?: string;
  needsVerification?: boolean;
};

type SignupResponse = {
  firstName: string;
  lastName: string;
  email: string;
};

@Injectable({
  providedIn: 'root',
})
export class Auth {
  constructor(
    private router: Router,
    private dialog: MatDialog,
    private http: HttpClient,
    private historyService: HistoryService,
    private fcmService: FcmService
  ) {}
  // Removed duplicate inject(HttpClient); using constructor injection only
  
  /**
   * Fetch the current user profile from the backend (cookie-based auth)
   */
  fetchAndStoreUserProfile(): Promise<any> {
    // Add Accept: application/json to ensure backend returns 401 for XHR/fetch
    return this.http.get(API.USER.PROFILE, {
      withCredentials: true,
      headers: { 'Accept': 'application/json' }
    }).toPromise().then((user: any) => {
      // Optionally update in-memory state or signals here if needed
      return user;
    });
  }

  private clearAuthData(): void {
    // Only clear in-memory state and history; tokens are managed by cookies
    try {
      this.historyService.clearHistory();
    } catch (e) {
      console.warn('Unable to clear auth data', e);
    }
  }

  /**
   * Logs out the user by calling the backend logout endpoint
   * and clearing local authentication data.
   * Redirects to landing page regardless of API response.
   */
  logout(): Promise<void> {
    const url = API.AUTH.LOGOUT;
    // Always clear local data and navigate, even if API call fails
    const clearAndNavigate = () => {
      this.clearAuthData();
      this.router.navigate(['/']);
    };
    // Call backend logout endpoint (cookie-based)
    return lastValueFrom(
      this.http.post<{ message?: string }>(url, {}, { withCredentials: true })
    )
      .then(() => {
        console.log('[Auth] Logout successful');
        clearAndNavigate();
      })
      .catch((error) => {
        console.warn('[Auth] Logout API failed, clearing client auth data anyway', error);
        clearAndNavigate();
      });
  }

  /**
   * Logs in a user with email and password.
   * Stores tokens and user data on successful authentication.
   * Navigates to dashboard on success.
   * 
   * @param email - User's email address
   * @param password - User's password
   * @returns Promise with success status and optional verification flag
   */
  login(email: string, password: string): Promise<{ success: boolean; needsVerification?: boolean }> {
    const url = API.AUTH.LOGIN;
    console.log('[Auth] ========== LOGIN ATTEMPT ==========');
    console.log('[Auth] Email:', email);
    console.log('[Auth] Login URL:', url);
    console.log('[Auth] Sending request...');
    // Use withCredentials to allow backend to set httpOnly cookies
    return lastValueFrom(this.http.post<LoginResponse>(url, { email, password }, { withCredentials: true }))
      .then((response) => {
        console.log('[Auth] ========== LOGIN SUCCESS ==========');
        console.log('[Auth] Full response:', response);
        // No need to store tokens in localStorage; backend sets cookies
        // Optionally, update in-memory user state here
        // Initialize FCM after successful login (if needed, pass user info or fetch JWT from backend)
        this.initializeFCMAfterLogin();
        // Fetch user profile after login
        this.fetchAndStoreUserProfile().finally(() => {
          console.log('[Auth] ========== NAVIGATING TO DASHBOARD ==========');
          this.router.navigate(['/dashboard']);
        });
        return { success: true };
      })
      .catch((err: Error & { error?: { message?: string }; status?: number }) => {
        console.log('[Auth] ========== LOGIN FAILED ==========');
        console.error('[Auth] Error object:', err);
        // Extract error message from backend response
        const errorMessage = err?.error?.message || err?.message || 'Login failed';
        const statusCode = err?.status || 0;
        console.error('[Auth] Final error:', { status: statusCode, message: errorMessage });
        console.log('[Auth] ==========================================');
        return Promise.reject(new Error(errorMessage));
      });
  }

  /**
   * Registers a new user account.
   * 
   * @param firstName - User's first name
   * @param lastName - User's last name
   * @param email - User's email address
   * @param password - User's password
   * @returns Promise that resolves on successful registration
   */
  signup(firstName: string, lastName: string, email: string, password: string): Promise<void> {
    const url = API.AUTH.REGISTER;
    
    console.log('[Auth] Attempting signup for:', email);
    
    return lastValueFrom(this.http.post<SignupResponse>(url, { firstName, lastName, email, password }))
      .then((response) => {
        console.log('[Auth] Signup successful for:', response.email);
        return Promise.resolve();
      })
      .catch((err: Error & { error?: { message?: string }; status?: number }) => {
        // Extract error message from backend response
        const errorMessage = err?.error?.message || err?.message || 'Registration failed';
        const statusCode = err?.status || 0;
        
        console.error('[Auth] Signup failed:', { status: statusCode, message: errorMessage });
        return Promise.reject(new Error(errorMessage));
      });
  }

  /**
   * Get the current access token from localStorage
   */
  // getAccessToken is deprecated; tokens are managed by cookies
  getAccessToken(): null { return null; }

  /**
   * Initialize FCM after successful login with proper error handling
   */
  private async initializeFCMAfterLogin(): Promise<void> {
    try {
      console.log('[Auth] 🔔 Initializing FCM after login...');
      // Use a timeout to ensure the app is fully loaded
      setTimeout(async () => {
        try {
          // Fetch JWT for FCM from backend if needed, or skip if not required
          // await this.fcmService.initializeFCM(jwtFromBackend);
          // For now, skip FCM JWT since tokens are not in localStorage
          console.log('[Auth] (FCM) Skipped: JWT should be fetched from backend if needed.');
        } catch (error) {
          console.log('[Auth] ⚠️ FCM initialization failed, but continuing with app:', error);
        }
      }, 2000);
    } catch (error) {
      console.error('[Auth] ❌ FCM initialization failed:', error);
    }
  }

  showVerifyEmailModal(): void {
    const dialogRef = this.dialog.open(VerifyEmailModal, {
      width: '400px',
      disableClose: true,
      panelClass: 'verify-email-dialog'
    });

    dialogRef.afterClosed().subscribe((result: string | undefined) => {
      if (result === 'backToSignUp') {
        this.router.navigate(['/signup']);
      }
    });
  }
}
