import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpEvent } from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable, of } from 'rxjs';
import { switchMap, catchError } from 'rxjs/operators';
import { HttpClient } from '@angular/common/http';
import { API } from '../config/api.config';

/**
 * Attaches Authorization bearer token from localStorage to API requests.
 * Excludes auth endpoints (login, register) but includes refresh endpoint.
 */
export const authTokenInterceptor: HttpInterceptorFn = (
  request: HttpRequest<unknown>,
  next: HttpHandlerFn
): Observable<HttpEvent<unknown>> => {
  const http = inject(HttpClient);
  // Only apply to API routes
  const isApiRequest = request.url.includes('/api/v2/');
  
  if (!isApiRequest) {
    return next(request);
  }

  // Don't add token to login and register endpoints
  const isLoginEndpoint = request.url.includes('/api/v2/auth/login');
  const isRegisterEndpoint = request.url.includes('/api/v2/auth/register');
  
  if (isLoginEndpoint || isRegisterEndpoint) {
    return next(request);
  }

  // Add token to all other API requests (including refresh)
  try {
    const token = localStorage.getItem('accessToken');
    const refreshToken = localStorage.getItem('refreshToken');

    if (token) {
      // If token is about to expire within threshold, proactively refresh
      const exp = getJwtExpiry(token);
      const nowSec = Math.floor(Date.now() / 1000);
      const thresholdSec = 60; // refresh 60s before expiry

      if (exp && exp - nowSec <= thresholdSec && refreshToken) {
        // Avoid refreshing the refresh endpoint itself
        const isRefreshEndpoint = request.url.includes('/api/v2/auth/refresh');
        if (!isRefreshEndpoint) {
          return http.post<{ accessToken: string; refreshToken?: string }>(API.AUTH.REFRESH, { refreshToken }).pipe(
            switchMap((resp) => {
              // Save new tokens
              if (resp?.accessToken) {
                localStorage.setItem('accessToken', resp.accessToken);
              }
              if (resp?.refreshToken) {
                localStorage.setItem('refreshToken', resp.refreshToken);
              }
              // Attach refreshed token and forward the original request
              const refreshedReq = request.clone({
                setHeaders: {
                  Authorization: `Bearer ${resp.accessToken}`,
                },
              });
              return next(refreshedReq);
            }),
            catchError(() => {
              // If proactive refresh fails, proceed with the original token.
              const reqWithToken = request.clone({
                setHeaders: {
                  Authorization: `Bearer ${token}`,
                },
              });
              return next(reqWithToken);
            })
          );
        }
      }

      // Normal path: attach current token
      request = request.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`,
        },
      });
    }
  } catch {
    // ignore storage access issues
  }

  return next(request);
};

function getJwtExpiry(token: string): number | null {
  try {
    const [, payloadB64] = token.split('.');
    if (!payloadB64) return null;
    const payloadJson = JSON.parse(atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/')));
    const exp = payloadJson?.exp;
    return typeof exp === 'number' ? exp : null;
  } catch {
    return null;
  }
}
