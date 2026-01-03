import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { VerifyEmailModal, VerifyEmailModalData } from '../../shared/components/verify-email-modal/verify-email-modal';
import { HttpClient, HttpContext } from '@angular/common/http';
import { lastValueFrom } from 'rxjs';
import { API } from '../config/api.config';
import { HistoryService } from './history.service';
import { FcmService } from './fcm.service';
import { SKIP_REDIRECT } from '../interceptors/auth-error.interceptor';

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
  private tokenExpirationTime: number = 0;
  private readonly TOKEN_LIFETIME = 60000; // 60 seconds
  private refreshPromise: Promise<void> | null = null;

  constructor(
    private router: Router,
    private dialog: MatDialog,
    private http: HttpClient,
    private historyService: HistoryService,
    private fcmService: FcmService
  ) {}
  // Removed duplicate inject(HttpClient); using constructor injection only
  
  resendVerification(email: string): Promise<void> {
    return lastValueFrom(
      this.http.post<void>(API.AUTH.RESEND_VERIFICATION, { email })
    );
  }

  /**
   * Fetch the current user profile from the backend (cookie-based auth)
   */
  fetchAndStoreUserProfile(): Promise<any> {
    // Add Accept: application/json to ensure backend returns 401 for XHR/fetch
    return this.http.get(API.USER.PROFILE, {
      withCredentials: true,
      headers: { 'Accept': 'application/json' },
      context: new HttpContext().set(SKIP_REDIRECT, true)
    }).toPromise().then((user: any) => {
      // Assume token is valid now
      this.updateTokenExpiration();
      
      // Initialize FCM if user is logged in
      this.initializeFCMAfterLogin();
      
      return user;
    });
  }

  private clearAuthData(): void {
    this.tokenExpirationTime = 0;
    // Only clear in-memory state and history; tokens are managed by cookies
    try {
      this.historyService.clearHistory();
    } catch (e) {
      console.warn('Unable to clear auth data', e);
    }
  }

  /**
   * Updates the local token expiration time.
   */
  private updateTokenExpiration(): void {
    this.tokenExpirationTime = Date.now() + this.TOKEN_LIFETIME;
  }

  /**
   * Checks if the token is about to expire and refreshes it if necessary.
   * Returns a promise that resolves when the token is valid.
   */
  ensureTokenValidity(): Promise<void> {
    // If no expiration time is set (e.g. not logged in), assume valid or let it fail
    if (this.tokenExpirationTime === 0) {
      return Promise.resolve();
    }

    // Check if token expires in less than 10 seconds
    if (Date.now() > this.tokenExpirationTime - 10000) {
      if (this.refreshPromise) {
        return this.refreshPromise;
      }

      console.log('[Auth] Token expiring soon, refreshing...');
      this.refreshPromise = this.refreshToken()
        .finally(() => {
          this.refreshPromise = null;
        });
      return this.refreshPromise;
    }

    return Promise.resolve();
  }

  /**
   * Manually refresh the access token.
   */
  refreshToken(): Promise<void> {
    return lastValueFrom(
      this.http.post<void>(API.AUTH.REFRESH, {}, { withCredentials: true })
    ).then(() => {
      console.log('[Auth] Token refreshed successfully');
      this.updateTokenExpiration();
    });
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
    // Use withCredentials to allow backend to set httpOnly cookies
    return lastValueFrom(this.http.post<LoginResponse>(url, { email, password }, { withCredentials: true }))
      .then((response) => {
        // No need to store tokens in localStorage; backend sets cookies
        // Optionally, update in-memory user state here
        
        // Set the permanent flag
        localStorage.setItem('has_logged_in_before', 'true');

        this.updateTokenExpiration();

        // Initialize FCM after successful login (if needed, pass user info or fetch JWT from backend)
        this.initializeFCMAfterLogin();
        // Fetch user profile after login
        this.fetchAndStoreUserProfile().finally(() => {
          this.router.navigate(['/dashboard']);
        });
        return { success: true };
      })
      .catch((err: Error & { error?: { message?: string }; status?: number }) => {
        console.error('[Auth] Login failed:', err);
        // Extract error message from backend response
        const errorMessage = err?.error?.message || err?.message || 'Login failed';
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
          // Initialize FCM (uses cookies for auth)
          await this.fcmService.initializeFCM();
          console.log('[Auth] (FCM) Initialization complete.');
        } catch (error) {
          console.log('[Auth] ⚠️ FCM initialization failed, but continuing with app:', error);
        }
      }, 2000);
    } catch (error) {
      console.error('[Auth] ❌ FCM initialization failed:', error);
    }
  }

  showVerifyEmailModal(source: 'signup' | 'login' = 'signup', email: string = ''): void {
    const dialogRef = this.dialog.open(VerifyEmailModal, {
      width: '400px',
      disableClose: true,
      panelClass: 'verify-email-dialog',
      data: { source, email }
    });

    dialogRef.afterClosed().subscribe((result: string | undefined) => {
      if (result === 'goToLogin') {
        this.router.navigate(['/login']);
      }
    });
  }

  /**
   * Requests a password reset email.
   * @param email - User's email address
   */
  forgotPassword(email: string): Promise<void> {
    const url = API.AUTH.FORGOT_PASSWORD;
    return lastValueFrom(this.http.post<void>(url, { email }));
  }

  /**
   * Resets the user's password using the token from the email.
   * @param token - Reset token
   * @param newPassword - New password
   */
  resetPassword(token: string, newPassword: string): Promise<void> {
    const url = API.AUTH.RESET_PASSWORD;
    return lastValueFrom(this.http.post<void>(url, { token, newPassword }));
  }
}
