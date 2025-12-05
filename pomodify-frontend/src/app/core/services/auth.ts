import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { VerifyEmailModal } from '../../shared/components/verify-email-modal/verify-email-modal';
import { HttpClient } from '@angular/common/http';
import { lastValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { HistoryService } from './history.service';

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
    private historyService: HistoryService
  ) {}

  private clearAuthData(): void {
    try {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('currentUser');
      this.historyService.clearHistory();
    } catch (e) {
      console.warn('Unable to clear auth data from localStorage', e);
    }
  }

  /**
   * Logs out the user by calling the backend logout endpoint
   * and clearing local authentication data.
   * Redirects to landing page regardless of API response.
   */
  logout(): Promise<void> {
    const accessToken = localStorage.getItem('accessToken');
    const url = `${environment.apiUrl}/auth/logout`;

    // Always clear local data and navigate, even if API call fails
    const clearAndNavigate = () => {
      this.clearAuthData();
      this.router.navigate(['/']);
    };

    if (!accessToken) {
      // No token stored – just clear any stale data and navigate
      console.log('[Auth] No access token found during logout');
      clearAndNavigate();
      return Promise.resolve();
    }

    // Call backend logout endpoint
    return lastValueFrom(
      this.http.post<{ message?: string }>(
        url,
        {},
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      )
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
    const url = `${environment.apiUrl}/auth/login`;
    
    console.log('[Auth] ========== LOGIN ATTEMPT ==========');
    console.log('[Auth] Email:', email);
    console.log('[Auth] Login URL:', url);
    console.log('[Auth] Sending request...');
    
    return lastValueFrom(this.http.post<LoginResponse>(url, { email, password }))
      .then((response) => {
        console.log('[Auth] ========== LOGIN SUCCESS ==========');
        console.log('[Auth] Full response:', response);
        console.log('[Auth] Response details:', {
          hasUser: !!response.user,
          hasAccessToken: !!response.accessToken,
          hasRefreshToken: !!response.refreshToken,
          accessTokenLength: response.accessToken?.length || 0,
          refreshTokenLength: response.refreshToken?.length || 0
        });
        
        // Expected response: { user, accessToken, refreshToken }
        if (response && response.accessToken) {
          try {
            localStorage.setItem('accessToken', response.accessToken);
            console.log('[Auth] ✓ Access token saved (length:', response.accessToken.length, ')');
            
            if (response.refreshToken) {
              localStorage.setItem('refreshToken', response.refreshToken);
              console.log('[Auth] ✓ Refresh token saved (length:', response.refreshToken.length, ')');
            } else {
              console.warn('[Auth] ⚠ No refresh token in response');
            }
            
            if (response.user) {
              localStorage.setItem('currentUser', JSON.stringify(response.user));
              console.log('[Auth] ✓ User data saved:', response.user.email);
            } else {
              console.warn('[Auth] ⚠ No user data in response');
            }
          } catch (e) {
            console.error('[Auth] ✗ Unable to save tokens to localStorage:', e);
          }

          // Navigate to dashboard on successful login
          console.log('[Auth] ========== NAVIGATING TO DASHBOARD ==========');
          this.router.navigate(['/dashboard']);
          return { success: true };
        }

        // If API indicates email verification required, backend would respond accordingly
        console.error('[Auth] ✗ Login response missing accessToken:', response);
        return { success: false };
      })
      .catch((err: Error & { error?: { message?: string }; status?: number }) => {
        console.log('[Auth] ========== LOGIN FAILED ==========');
        console.error('[Auth] Error object:', err);
        console.error('[Auth] Status code:', err?.status);
        console.error('[Auth] Error body:', err?.error);
        console.error('[Auth] Error message:', err?.message);
        
        // Extract error message from backend/mock response
        const errorMessage = err?.error?.message || err?.message || 'Login failed';
        const statusCode = err?.status || 0;
        
        console.error('[Auth] Final error:', { 
          status: statusCode, 
          message: errorMessage
        });
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
    const url = `${environment.apiUrl}/auth/register`;
    
    console.log('[Auth] Attempting signup for:', email);
    
    return lastValueFrom(this.http.post<SignupResponse>(url, { firstName, lastName, email, password }))
      .then((response) => {
        console.log('[Auth] Signup successful for:', response.email);
        return Promise.resolve();
      })
      .catch((err: Error & { error?: { message?: string }; status?: number }) => {
        // Extract error message from backend/mock response
        const errorMessage = err?.error?.message || err?.message || 'Registration failed';
        const statusCode = err?.status || 0;
        
        console.error('[Auth] Signup failed:', { status: statusCode, message: errorMessage });
        return Promise.reject(new Error(errorMessage));
      });
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
