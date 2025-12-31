import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Login } from './login';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

describe('Login', () => {
  let component: Login;
  let fixture: ComponentFixture<Login>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Login],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([])
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(Login);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have login form initialized', () => {
    expect(component.loginForm).toBeTruthy();
  });

  it('should have email and password controls', () => {
    expect(component.loginForm.get('email')).toBeTruthy();
    expect(component.loginForm.get('password')).toBeTruthy();
  });

  it('should mark form invalid when empty', () => {
    expect(component.loginForm.valid).toBeFalse();
  });

  it('should mark form valid with proper values', () => {
    component.loginForm.patchValue({
      email: 'test@example.com',
      password: 'password123'
    });
    expect(component.loginForm.valid).toBeTrue();
  });

  it('should toggle password visibility', () => {
    expect(component.passwordVisible).toBeFalse();
    component.togglePasswordVisibility();
    expect(component.passwordVisible).toBeTrue();
  });

  it('should return correct password input type', () => {
    expect(component.passwordInputType).toBe('password');
    component.togglePasswordVisibility();
    expect(component.passwordInputType).toBe('text');
  });

  it('should not be loading initially', () => {
    expect(component.isLoading).toBeFalse();
  });

  it('should have empty error message initially', () => {
    expect(component.errorMessage).toBe('');
  });

  it('should validate email format', () => {
    component.loginForm.patchValue({ email: 'invalid-email' });
    expect(component.loginForm.get('email')?.valid).toBeFalse();
  });
});
