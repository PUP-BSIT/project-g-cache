import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { VerifyEmailModal } from '../../shared/components/verify-email-modal/verify-email-modal';
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
  private readonly TOKEN_LIFETIME = 900000; // 15 minutes
  private refreshPromise: Promise<void> | null = null;

  constructor(
    private router: Router,
    private dialog: MatDialog,
    private http: HttpClient,
    private historyService: HistoryService,
    private fcmService: FcmService
  ) {}
  // Removed duplicate inject(HttpClient); using constructor injection only
  
  /**
   * Sync login state with the service worker for background notifications
   */
  private syncLoginStateWithServiceWorker(isLoggedIn: boolean): void {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'SET_LOGIN_STATE',
        isLoggedIn
      });
      console.log('[Auth] Synced login state with service worker:', isLoggedIn);
    }
  }
  
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
    // Clear login state for FCM/PWA notifications
    localStorage.setItem('isLoggedIn', 'false');
    // Sync with service worker
    this.syncLoginStateWithServiceWorker(false);
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
   * Only refreshes proactively when token is about to expire (within 30 seconds).
   */
  ensureTokenValidity(): Promise<void> {
    // If token expiration is not set, don't proactively refresh
    // Let the interceptor handle 401s and refresh on-demand
    if (this.tokenExpirationTime === 0) {
      return Promise.resolve();
    }

    // Check if token expires in less than 30 seconds
    if (Date.now() > this.tokenExpirationTime - 30000) {
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
        
        // Set the permanent flag and login state for FCM/PWA
        localStorage.setItem('has_logged_in_before', 'true');
        localStorage.setItem('isLoggedIn', 'true');
        // Sync with service worker for background notifications
        this.syncLoginStateWithServiceWorker(true);

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
      .then(async (response) => {
        console.log('[Auth] Signup successful for:', response.email);
        
        // Auto-login after successful signup
        console.log('[Auth] Auto-logging in user after signup...');
        return lastValueFrom(this.http.post<LoginResponse>(API.AUTH.LOGIN, { email, password }, { withCredentials: true }))
          .then(() => {
            // Set the permanent flag and login state for FCM/PWA
            localStorage.setItem('has_logged_in_before', 'true');
            localStorage.setItem('isLoggedIn', 'true');
            // Sync with service worker for background notifications
            this.syncLoginStateWithServiceWorker(true);
            this.updateTokenExpiration();
            // Initialize FCM after successful login
            this.initializeFCMAfterLogin();
            // Fetch user profile after login
            this.fetchAndStoreUserProfile();
            console.log('[Auth] Auto-login after signup successful');
          });
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
   * Check if user is currently logged in (has active session)
   * Uses the isLoggedIn flag in localStorage which is only cleared on explicit logout
   */
  isLoggedIn(): boolean {
    // Check the explicit isLoggedIn flag - only set to false on logout
    return localStorage.getItem('isLoggedIn') === 'true';
  }

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

  showVerifyEmailModal(source: 'signup' | 'login' = 'signup'): void {
    const dialogRef = this.dialog.open(VerifyEmailModal, {
      width: '400px',
      disableClose: false,
      panelClass: 'verify-email-dialog',
      data: { source }
    });

    // Navigation is handled in the modal component itself
    // No need to subscribe to afterClosed here
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
   * Requests a password reset email via backup email.
   * @param email - User's primary email address
   * @param backupEmail - User's backup email address
   */
  forgotPasswordViaBackupEmail(email: string, backupEmail: string): Promise<void> {
    const url = API.AUTH.FORGOT_PASSWORD_BACKUP;
    return lastValueFrom(this.http.post<void>(url, { email, backupEmail }));
  }

  /**
   * Checks if user has a backup email configured.
   * @param email - User's email address
   * @returns Promise with hasBackupEmail flag and masked backup email
   */
  checkBackupEmail(email: string): Promise<{ hasBackupEmail: boolean; maskedBackupEmail: string | null }> {
    const url = `${API.AUTH.CHECK_BACKUP_EMAIL}?email=${encodeURIComponent(email)}`;
    return lastValueFrom(this.http.get<{ hasBackupEmail: boolean; maskedBackupEmail: string | null }>(url));
  }

  /**
   * Updates the backup email for the authenticated user.
   * @param backupEmail - New backup email address
   */
  updateBackupEmail(backupEmail: string): Promise<void> {
    const url = API.USER.UPDATE_BACKUP_EMAIL;
    return lastValueFrom(this.http.post<void>(url, { backupEmail }, { withCredentials: true }));
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

  /**
   * Changes the password for the authenticated user.
   * @param currentPassword - Current password
   * @param newPassword - New password
   */
  changePassword(currentPassword: string, newPassword: string): Promise<void> {
    const url = API.USER.CHANGE_PASSWORD;
    return lastValueFrom(this.http.post<void>(url, { currentPassword, newPassword }, { withCredentials: true }));
  }

  /**
   * Updates the user's profile (name).
   * @param firstName - New first name
   * @param lastName - New last name
   */
  updateProfile(firstName: string, lastName: string): Promise<any> {
    const url = API.USER.UPDATE_PROFILE;
    return lastValueFrom(this.http.put<any>(url, { firstName, lastName }, { withCredentials: true }));
  }
}
