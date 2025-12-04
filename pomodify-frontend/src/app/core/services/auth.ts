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

  logout(): void {
    const accessToken = localStorage.getItem('accessToken');
    const url = `${environment.apiUrl}/auth/logout`;

    if (accessToken) {
      this.http
        .post<{ message?: string }>(
          url,
          {},
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        )
        .subscribe({
          next: () => {
            this.clearAuthData();
            this.router.navigate(['/']);
          },
          error: (error) => {
            console.warn('Logout API failed, clearing client auth data anyway', error);
            this.clearAuthData();
            this.router.navigate(['/']);
          },
        });
    } else {
      // No token stored – just clear any stale data and navigate
      this.clearAuthData();
      this.router.navigate(['/']);
    }
  }

  login(email: string, password: string): Promise<{ success: boolean; needsVerification?: boolean }> {
    const url = `${environment.apiUrl}/auth/login`;
    return lastValueFrom(this.http.post<LoginResponse>(url, { email, password }))
      .then((response) => {
        // Expected response: { user, accessToken, refreshToken }
        if (response && response.accessToken) {
          try {
            localStorage.setItem('accessToken', response.accessToken);
            if (response.refreshToken) {
              localStorage.setItem('refreshToken', response.refreshToken);
            }
            if (response.user) {
              localStorage.setItem('currentUser', JSON.stringify(response.user));
            }
          } catch (e) {
            console.warn('Unable to save tokens to localStorage', e);
          }

          // Navigate to dashboard on successful login
          this.router.navigate(['/dashboard']);
          return { success: true };
        }

        // If API indicates email verification required, backend would respond accordingly
        return { success: false };
      })
      .catch((err: Error & { error?: { message?: string } }) => {
        // Extract error message from backend/mock response
        const errorMessage = err?.error?.message || err?.message || 'Login failed';
        return Promise.reject(new Error(errorMessage));
      });
  }

  signup(firstName: string, lastName: string, email: string, password: string): Promise<void> {
    const url = `${environment.apiUrl}/auth/register`;
    return lastValueFrom(this.http.post<SignupResponse>(url, { firstName, lastName, email, password }))
      .then(() => Promise.resolve())
      .catch((err: Error & { error?: { message?: string } }) => {
        // Extract error message from backend/mock response
        const errorMessage = err?.error?.message || err?.message || 'Registration failed';
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
