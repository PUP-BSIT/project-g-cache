import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { AuthGuardService, authGuard, publicPageGuard } from './auth.guard';
import { Auth } from '../services/auth';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

describe('AuthGuard', () => {
  let service: AuthGuardService;
  let mockRouter: jasmine.SpyObj<Router>;
  let mockAuth: jasmine.SpyObj<Auth>;

  beforeEach(() => {
    mockRouter = jasmine.createSpyObj('Router', ['navigate']);
    mockAuth = jasmine.createSpyObj('Auth', ['fetchAndStoreUserProfile']);

    TestBed.configureTestingModule({
      providers: [
        AuthGuardService,
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: Router, useValue: mockRouter },
        { provide: Auth, useValue: mockAuth }
      ]
    });

    service = TestBed.inject(AuthGuardService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should allow access when profile fetch succeeds', async () => {
    mockAuth.fetchAndStoreUserProfile.and.returnValue(Promise.resolve());
    const result = await service.canActivate();
    expect(result).toBeTrue();
  });

  it('should redirect to login when profile fetch fails', async () => {
    mockAuth.fetchAndStoreUserProfile.and.returnValue(Promise.reject(new Error('Unauthorized')));
    const result = await service.canActivate();
    expect(result).toBeFalse();
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/login']);
  });
});

describe('publicPageGuard', () => {
  it('should always return true', async () => {
    const result = await publicPageGuard({} as any, {} as any);
    expect(result).toBeTrue();
  });
});
