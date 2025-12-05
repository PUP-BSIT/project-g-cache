import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

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

  return next(request).pipe(
    catchError((error: HttpErrorResponse) => {
      // Check for token expired in error message or code
      const isTokenExpired = 
        error.status === 401 || 
        error.error?.code === 'TOKEN_EXPIRED' ||
        error.error?.message?.includes('TOKEN_EXPIRED') ||
        error.error?.message?.includes('authentication is required');

      if (isTokenExpired) {
        console.log('[AuthErrorInterceptor] 401 received for URL:', request.url);
      }

      // Handle 401 Unauthorized errors or token expiration
      if (isTokenExpired) {
        const isAuthEndpoint = request.url.includes('/api/v1/auth/');
        
        // Don't retry auth endpoints (login, register, refresh)
        // If auth endpoint fails with 401, tokens are invalid
        if (isAuthEndpoint) {
          console.log('[AuthErrorInterceptor] Auth endpoint failed with 401, clearing tokens');
          isRefreshing = false;
          clearAuthData();
          router.navigate(['/login']);
          return throwError(() => error);
        }

        // Try to refresh the token
        const refreshToken = localStorage.getItem('refreshToken');
        
        if (!refreshToken) {
          console.log('[AuthErrorInterceptor] No refresh token available');
          isRefreshing = false;
          clearAuthData();
          router.navigate(['/login']);
          return throwError(() => error);
        }

        if (isRefreshing) {
          // Already attempting refresh, don't start another
          console.log('[AuthErrorInterceptor] Refresh already in progress');
          return throwError(() => error);
        }

        // Attempt token refresh
        console.log('[AuthErrorInterceptor] Attempting token refresh...');
        isRefreshing = true;
        const refreshUrl = `${environment.apiUrl}/auth/refresh`;

        return http.post<RefreshResponse>(refreshUrl, { refreshToken }).pipe(
          switchMap((response) => {
            console.log('[AuthErrorInterceptor] Token refresh successful');
            isRefreshing = false;
            
            // Save new tokens
            if (response && response.accessToken) {
              try {
                localStorage.setItem('accessToken', response.accessToken);
                if (response.refreshToken) {
                  localStorage.setItem('refreshToken', response.refreshToken);
                }
                if (response.user) {
                  localStorage.setItem('currentUser', JSON.stringify(response.user));
                }
                console.log('[AuthErrorInterceptor] New tokens saved, retrying original request');
              } catch (e) {
                console.warn('[AuthErrorInterceptor] Unable to save refreshed tokens', e);
              }

              // Retry the original request with new token
              const clonedRequest = request.clone({
                setHeaders: {
                  Authorization: `Bearer ${response.accessToken}`,
                },
              });

              return next(clonedRequest);
            }

            // Refresh response was invalid
            console.warn('[AuthErrorInterceptor] Refresh response missing accessToken');
            clearAuthData();
            router.navigate(['/login']);
            return throwError(() => error);
          }),
          catchError((refreshError) => {
            console.error('[AuthErrorInterceptor] Token refresh failed:', refreshError);
            isRefreshing = false;
            
            // Refresh failed - clear auth and redirect
            clearAuthData();
            router.navigate(['/login']);
            return throwError(() => refreshError);
          })
        );
      }

      // Handle 403 Forbidden (user doesn't have permission)
      if (error.status === 403) {
        console.error('[AuthErrorInterceptor] Access forbidden:', error);
        // Don't redirect, just pass the error through
        // The component can handle this appropriately
      }

      return throwError(() => error);
    })
  );
};

function clearAuthData(): void {
  try {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('currentUser');
    console.log('[AuthErrorInterceptor] Auth data cleared');
  } catch (e) {
    console.warn('[AuthErrorInterceptor] Unable to clear auth data', e);
  }
}
