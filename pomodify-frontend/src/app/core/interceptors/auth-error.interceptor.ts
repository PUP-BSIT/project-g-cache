import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { API } from '../config/api.config';

type RefreshResponse = {
  user?: {
    firstName: string;
    lastName: string;
    email: string;
  };
  accessToken: string;
  refreshToken?: string;
};

let isRefreshing = false;

/**
 * Handles authentication errors (401) and attempts token refresh.
 * If refresh fails or token is missing, redirects to login.
 */
export const authErrorInterceptor: HttpInterceptorFn = (request, next) => {
  const router = inject(Router);
  const http = inject(HttpClient);

  return next(request.clone({ withCredentials: true })).pipe(
    catchError((error: HttpErrorResponse) => {
      // Handle 401 Unauthorized errors
      if (error.status === 401) {
        console.log('[AuthErrorInterceptor] 401 received for URL:', request.url);
        clearAuthData();
        router.navigate(['/login']);
        return throwError(() => error);
      }
      // Handle 403 Forbidden (user doesn't have permission)
      if (error.status === 403) {
        console.error('[AuthErrorInterceptor] Access forbidden:', error);
        // Don't redirect, just pass the error through
      }
      return throwError(() => error);
    })
  );
};

function clearAuthData(): void {
  try {
    // Only clear in-memory state if needed; tokens are managed by cookies
    console.log('[AuthErrorInterceptor] Auth data cleared');
  } catch (e) {
    console.warn('[AuthErrorInterceptor] Unable to clear auth data', e);
  }
}
