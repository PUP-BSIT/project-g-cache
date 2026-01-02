import { HttpInterceptorFn, HttpErrorResponse, HttpRequest, HttpHandlerFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError, Observable, BehaviorSubject, filter, take, timer } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { API } from '../config/api.config';

let isRefreshing = false;
let refreshTokenSubject: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
let lastRefreshAttempt = 0;
const REFRESH_COOLDOWN = 5000; // 5 seconds cooldown between refresh attempts

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
        
        // Don't try to refresh if this is already a refresh request or auth request
        if (request.url.includes('/auth/refresh') || 
            request.url.includes('/auth/login') || 
            request.url.includes('/auth/register')) {
          console.log('[AuthErrorInterceptor] Auth request failed, redirecting to login');
          clearAuthData();
          router.navigate(['/login']);
          return throwError(() => error);
        }

        // Check if we recently tried to refresh - don't spam refresh attempts
        const now = Date.now();
        if (now - lastRefreshAttempt < REFRESH_COOLDOWN && !isRefreshing) {
          console.log('[AuthErrorInterceptor] Recent refresh attempt, skipping retry');
          // If we are in cooldown but not actively refreshing, it means the last refresh failed or we are in a loop.
          // However, if we just refreshed successfully, we might want to retry the request instead of erroring.
          // For now, let's allow the retry logic to handle it via the subject if it was a parallel request.
          if (refreshTokenSubject.value === true) {
               return next(request.clone({ withCredentials: true }));
          }
          return throwError(() => error);
        }

        // Try to refresh the token
        return handleTokenRefresh(http, router, request, next, error);
      }
      
      // Handle 403 Forbidden (user doesn't have permission)
      if (error.status === 403) {
        console.error('[AuthErrorInterceptor] Access forbidden:', error);
      }
      return throwError(() => error);
    })
  );
};

function handleTokenRefresh(
  http: HttpClient,
  router: Router,
  request: HttpRequest<unknown>,
  next: HttpHandlerFn,
  originalError: HttpErrorResponse
): Observable<any> {
  if (!isRefreshing) {
    isRefreshing = true;
    lastRefreshAttempt = Date.now();
    refreshTokenSubject.next(false);

    console.log('[AuthErrorInterceptor] Attempting token refresh...');

    return http.post(API.AUTH.REFRESH, {}, { withCredentials: true }).pipe(
      switchMap((response: any) => {
        console.log('[AuthErrorInterceptor] Token refresh successful');
        isRefreshing = false;
        refreshTokenSubject.next(true);
        
        // Wait a bit for cookies to be set, then retry
        return timer(150).pipe(
          switchMap(() => {
            console.log('[AuthErrorInterceptor] Retrying request:', request.url);
            return next(request.clone({ withCredentials: true })).pipe(
              catchError((retryError: HttpErrorResponse) => {
                if (retryError.status === 401) {
                  console.log('[AuthErrorInterceptor] Retry still failed with 401');
                  // For session-related requests, don't redirect - let the app handle it gracefully
                  if (request.url.includes('/sessions/')) {
                    console.log('[AuthErrorInterceptor] Session request failed, continuing without redirect');
                    return throwError(() => retryError);
                  }
                  clearAuthData();
                  router.navigate(['/login']);
                }
                return throwError(() => retryError);
              })
            );
          })
        );
      }),
      catchError((refreshError) => {
        console.log('[AuthErrorInterceptor] Token refresh failed:', refreshError);
        isRefreshing = false;
        refreshTokenSubject.next(false);
        
        // For session-related requests, don't redirect immediately
        if (request.url.includes('/sessions/')) {
          console.log('[AuthErrorInterceptor] Session request, not redirecting');
          return throwError(() => originalError);
        }
        
        clearAuthData();
        router.navigate(['/login']);
        return throwError(() => originalError);
      })
    );
  } else {
    // If already refreshing, wait for the refresh to complete
    console.log('[AuthErrorInterceptor] Already refreshing, waiting...');
    return refreshTokenSubject.pipe(
      filter(refreshed => refreshed === true),
      take(1),
      switchMap(() => {
        return timer(150).pipe(
          switchMap(() => {
            console.log('[AuthErrorInterceptor] Refresh completed, retrying queued request:', request.url);
            return next(request.clone({ withCredentials: true }));
          })
        );
      })
    );
  }
}

function clearAuthData(): void {
  try {
    console.log('[AuthErrorInterceptor] Auth data cleared');
  } catch (e) {
    console.warn('[AuthErrorInterceptor] Unable to clear auth data', e);
  }
}
