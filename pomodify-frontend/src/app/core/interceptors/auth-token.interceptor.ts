import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpEvent } from '@angular/common/http';
import { Observable } from 'rxjs';

/**
 * Attaches Authorization bearer token from localStorage to API requests.
 * Excludes auth endpoints (login, register) but includes refresh endpoint.
 */
export const authTokenInterceptor: HttpInterceptorFn = (
  request: HttpRequest<unknown>,
  next: HttpHandlerFn
): Observable<HttpEvent<unknown>> => {
  // Only apply to API routes
  const isApiRequest = request.url.includes('/api/v1/');
  
  if (!isApiRequest) {
    return next(request);
  }

  // Don't add token to login and register endpoints
  const isLoginEndpoint = request.url.includes('/api/v1/auth/login');
  const isRegisterEndpoint = request.url.includes('/api/v1/auth/register');
  
  if (isLoginEndpoint || isRegisterEndpoint) {
    return next(request);
  }

  // Add token to all other API requests (including refresh)
  try {
    const token = localStorage.getItem('accessToken');
    if (token) {
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
