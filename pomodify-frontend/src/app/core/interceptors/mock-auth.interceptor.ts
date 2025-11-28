import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpEvent, HttpResponse } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';

type AuthRequestBody = {
  email?: string;
  password?: string;
  firstName?: string;
  lastName?: string;
};

export const mockAuthInterceptor: HttpInterceptorFn = (
  request: HttpRequest<unknown>,
  next: HttpHandlerFn
): Observable<HttpEvent<unknown>> => {
  // Mock login endpoint
  if (request.url.includes('/api/v1/auth/login') && request.method === 'POST') {
    const body = (request.body ?? {}) as AuthRequestBody;
    const mockResponse = {
      user: {
        firstName: 'John',
        lastName: 'Doe',
        email: body?.email || 'user@example.com',
      },
      accessToken: 'dev-mock-access-token',
      refreshToken: 'dev-mock-refresh-token',
    };
    return of(new HttpResponse({ status: 200, body: mockResponse })).pipe(delay(300));
  }

  // Mock register endpoint
  if (request.url.includes('/api/v1/auth/register') && request.method === 'POST') {
    const body = (request.body ?? {}) as AuthRequestBody;
    const mockResponse = {
      firstName: body?.firstName || 'Jane',
      lastName: body?.lastName || 'Doe',
      email: body?.email || 'user@example.com',
    };
    return of(new HttpResponse({ status: 201, body: mockResponse })).pipe(delay(300));
  }

  // Pass-through for other requests
  return next(request);
};
