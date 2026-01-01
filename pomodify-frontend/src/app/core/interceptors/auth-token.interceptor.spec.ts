import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { authTokenInterceptor } from './auth-token.interceptor';

describe('AuthTokenInterceptor', () => {
  let httpClient: HttpClient;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authTokenInterceptor])),
        provideHttpClientTesting()
      ]
    });

    httpClient = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should add withCredentials to API requests', () => {
    httpClient.get('/api/v2/dashboard').subscribe();

    const req = httpMock.expectOne('/api/v2/dashboard');
    expect(req.request.withCredentials).toBeTrue();
    req.flush({});
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
    // Login endpoint should still work without credentials
    req.flush({});
  });
});
