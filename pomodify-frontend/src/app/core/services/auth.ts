import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { VerifyEmailModal } from '../../shared/components/verify-email-modal/verify-email-modal';
import { HttpClient } from '@angular/common/http';
import { lastValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class Auth {
  constructor(
    private router: Router,
    private dialog: MatDialog,
    private http: HttpClient
  ) {}

  login(email: string, password: string): Promise<{ success: boolean; needsVerification?: boolean }> {
    const url = `${environment.apiUrl}/api/v1/auth/login`;
    return lastValueFrom(this.http.post<any>(url, { email, password }))
      .then(response => {
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
      .catch(err => {
        // Extract error message from backend/mock response
        const errorMessage = err?.error?.message || err?.message || 'Login failed';
        return Promise.reject(new Error(errorMessage));
      });
  }

  signup(firstName: string, lastName: string, email: string, password: string): Promise<void> {
    const url = `${environment.apiUrl}/api/v1/auth/register`;
    return lastValueFrom(this.http.post<any>(url, { firstName, lastName, email, password }))
      .then(() => Promise.resolve())
      .catch(err => {
        // Extract error message from backend/mock response
        const errorMessage = err?.error?.message || err?.message || 'Registration failed';
        return Promise.reject(new Error(errorMessage));
      });
  }

  showVerifyEmailModal() {
    const dialogRef = this.dialog.open(VerifyEmailModal, {
      width: '400px',
      disableClose: true,
      panelClass: 'verify-email-dialog'
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result === 'backToSignUp') {
        this.router.navigate(['/signup']);
      }
    });
  }
}
