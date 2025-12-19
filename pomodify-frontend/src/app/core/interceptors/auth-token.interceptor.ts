import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpEvent } from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable } from 'rxjs';
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

  // All tokens are managed by cookies. Just forward the request with credentials.
  return next(request.clone({ withCredentials: true }));
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
