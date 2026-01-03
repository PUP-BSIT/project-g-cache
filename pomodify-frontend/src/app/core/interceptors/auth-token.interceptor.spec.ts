import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { authTokenInterceptor } from './auth-token.interceptor';
import { Auth } from '../services/auth';

describe('AuthTokenInterceptor', () => {
  let httpClient: HttpClient;
  let httpMock: HttpTestingController;
  let mockAuth: jasmine.SpyObj<Auth>;

  beforeEach(() => {
    mockAuth = jasmine.createSpyObj('Auth', ['ensureTokenValidity']);
    mockAuth.ensureTokenValidity.and.returnValue(Promise.resolve());

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authTokenInterceptor])),
        provideHttpClientTesting(),
        { provide: Auth, useValue: mockAuth }
      ]
    });

    httpClient = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should add withCredentials to API requests', (done) => {
    httpClient.get('/api/v2/dashboard').subscribe({
      next: () => done(),
      error: () => done()
    });

    // Wait for async ensureTokenValidity to complete
    setTimeout(() => {
      const req = httpMock.expectOne('/api/v2/dashboard');
      expect(req.request.withCredentials).toBeTrue();
      req.flush({});
    }, 0);
  });

  it('should not modify non-API requests', () => {
    httpClient.get('/assets/config.json').subscribe();

    const req = httpMock.expectOne('/assets/config.json');
    expect(req.request.withCredentials).toBeFalse();
    req.flush({});
  });

  it('should not add credentials to login endpoint', () => {
    httpClient.post('/api/v2/auth/login', {}).subscribe();

    const req = httpMock.expectOne('/api/v2/auth/login');
    // Login endpoint should still work without credentials (auth endpoints are excluded)
    expect(req.request.withCredentials).toBeFalse();
    req.flush({});
  });
});
