import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpEvent } from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable, from } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { Auth } from '../services/auth';

/**
 * Attaches Authorization bearer token from localStorage to API requests.
 * Excludes auth endpoints (login, register) but includes refresh endpoint.
 */
export const authTokenInterceptor: HttpInterceptorFn = (
  request: HttpRequest<unknown>,
  next: HttpHandlerFn
): Observable<HttpEvent<unknown>> => {
  const authService = inject(Auth);
  
  // Only apply to API routes
  const isApiRequest = request.url.includes('/api/v2/');
  
  if (!isApiRequest) {
    return next(request);
  }

  // Don't check refresh for auth endpoints (login, register, refresh, etc.)
  // This prevents circular dependencies and unnecessary checks
  const isAuthEndpoint = request.url.includes('/api/v2/auth/');
  
  if (isAuthEndpoint) {
    return next(request);
  }

  // Check if token needs refresh before proceeding
  return from(authService.ensureTokenValidity()).pipe(
    switchMap(() => {
      // All tokens are managed by cookies. Just forward the request with credentials.
      return next(request.clone({ withCredentials: true }));
    })
  );
};

