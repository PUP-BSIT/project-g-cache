import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { AuthGuardService } from './auth.guard';
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
  let service: AuthGuardService;
  let mockRouter: jasmine.SpyObj<Router>;
  let mockAuth: jasmine.SpyObj<Auth>;

  beforeEach(() => {
    mockRouter = jasmine.createSpyObj('Router', ['navigate', 'getCurrentNavigation']);
    mockRouter.getCurrentNavigation.and.returnValue(null);
    mockAuth = jasmine.createSpyObj('Auth', ['fetchAndStoreUserProfile']);
    // Simulate user not logged in
    mockAuth.fetchAndStoreUserProfile.and.returnValue(Promise.reject(new Error('Unauthorized')));

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

  it('should allow access to public pages when user is not logged in', async () => {
    const mockState = { url: '/login' } as any;
    const result = await service.canActivatePublic(mockState);
    expect(result).toBeTrue();
  });
});
