import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpEvent } from '@angular/common/http';
import { Observable } from 'rxjs';

// Attaches Authorization bearer token from localStorage to API requests
export const authTokenInterceptor: HttpInterceptorFn = (
  request: HttpRequest<unknown>,
  next: HttpHandlerFn
): Observable<HttpEvent<unknown>> => {
  // Only apply to API routes
  const isApiRequest = request.url.includes('/api/v1/');
  const isAuthEndpoint = request.url.includes('/api/v1/auth/');

  if (isApiRequest && !isAuthEndpoint) {
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
  }

  return next(request);
};
