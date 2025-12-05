import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpEvent, HttpResponse, HttpErrorResponse } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { delay, catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

// Mock credentials database for testing
type AuthRequestBody = {
  email?: string;
  password?: string;
  firstName?: string;
  lastName?: string;
};

const MOCK_CREDENTIALS: Array<{ email: string; password: string }> = [
  { email: 'asd', password: 'asd' },
  { email: 'test@test.com', password: 'password' },
  { email: 'demo@example.com', password: 'demo123' },
  { email: 'johndoe@gmail.com', password: 'JohnDoe@123' },
];

// Global flag to track backend availability
let backendAvailable: boolean | null = null;

export const smartAuthInterceptor: HttpInterceptorFn = (
  request: HttpRequest<unknown>,
  next: HttpHandlerFn
): Observable<HttpEvent<unknown>> => {
  // Only intercept auth endpoints
  const isLoginRequest = request.url.includes('/api/v1/auth/login') && request.method === 'POST';
  const isRegisterRequest = request.url.includes('/api/v1/auth/register') && request.method === 'POST';

  if (!isLoginRequest && !isRegisterRequest) {
    return next(request);
  }

  // Check if mock backend is enabled in environment
  if (!environment.useMockBackend) {
    // Mock is disabled - always use real backend
    return next(request);
  }

  // If backend is known to be unavailable, use mock
  if (backendAvailable === false) {
    return handleMockAuth(request, next);
  }

  // Try real backend first
  return next(request).pipe(
    catchError((error: HttpErrorResponse) => {
      // Only switch to mock if explicitly enabled AND backend is unreachable
      if (!environment.useMockBackend) {
        // Mock disabled - return real error
        return throwError(() => error);
      }

      // If backend is unreachable or returning server errors, switch to mock mode
      const isNetworkError = error.status === 0 || (error instanceof HttpErrorResponse && !error.status);
      const isServerError = error.status >= 500;
      
      if ((isNetworkError || isServerError) && backendAvailable !== true) {
        console.warn('[Auth Interceptor] Backend unreachable or erroring, switching to mock mode', { status: error.status });
        backendAvailable = false;
        return handleMockAuth(request, next);
      }

      // Real backend error - propagate it
      if (error.status > 0) {
        backendAvailable = true;
        return throwError(() => error);
      }

      return throwError(() => error);
    })
  );
};

function handleMockAuth(request: HttpRequest<unknown>, next: HttpHandlerFn): Observable<HttpEvent<unknown>> {
  const body = (request.body ?? {}) as AuthRequestBody;

  if (request.url.includes('/api/v1/auth/login')) {
    // Validate against mock credentials
    const isValidCredential = MOCK_CREDENTIALS.some(
      (cred) => cred.email === body?.email && cred.password === body?.password
    );

    if (!isValidCredential) {
      console.warn('[Mock Auth] Invalid credentials');
      return throwError(() => new HttpErrorResponse({
        error: { message: 'Invalid email or password' },
        headers: undefined,
        status: 401,
        statusText: 'Unauthorized',
        url: request.url,
      }));
    }

    const mockResponse = {
      user: {
        firstName: 'Mock User',
        lastName: 'Dev',
        email: body?.email || 'user@example.com',
      },
      accessToken: `mock-access-token-${Date.now()}`,
      refreshToken: `mock-refresh-token-${Date.now()}`,
    };
    console.log('[Mock Auth] Login successful for:', body?.email);
    return of(new HttpResponse({ status: 200, body: mockResponse })).pipe(delay(300));
  }

  if (request.url.includes('/api/v1/auth/register')) {
    // Mock registration always succeeds
    const mockResponse = {
      firstName: body?.firstName || 'Jane',
      lastName: body?.lastName || 'Doe',
      email: body?.email || 'user@example.com',
    };
    console.log('[Mock Auth] Registration successful for:', body?.email);
    return of(new HttpResponse({ status: 201, body: mockResponse })).pipe(delay(300));
  }

  return next(request);
}
