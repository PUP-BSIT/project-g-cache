import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { ContactPage } from './contact';

describe('ContactPage', () => {
  let component: ContactPage;
  let fixture: ComponentFixture<ContactPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ContactPage],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([])
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ContactPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have empty form initially', () => {
    expect(component.contactData.name).toBe('');
    expect(component.contactData.email).toBe('');
    expect(component.contactData.reason).toBe('');
    expect(component.contactData.message).toBe('');
  });

  it('should validate required fields', () => {
    const isValid = component.validateForm();
    expect(isValid).toBeFalse();
    const errors = component.formErrors();
    expect(errors['name']).toBe('Name is required');
    expect(errors['email']).toBe('Email is required');
    expect(errors['reason']).toBe('Please select a reason');
    expect(errors['message']).toBe('Message is required');
  });

  it('should validate email format', () => {
    component.contactData.name = 'Test User';
    component.contactData.email = 'invalid-email';
    component.contactData.reason = 'support';
    component.contactData.message = 'Test message';

    const isValid = component.validateForm();
    expect(isValid).toBeFalse();
    expect(component.formErrors()['email']).toBe('Please enter a valid email address');
  });

  it('should pass validation with valid data', () => {
    component.contactData.name = 'Test User';
    component.contactData.email = 'test@example.com';
    component.contactData.reason = 'support';
    component.contactData.message = 'Test message';

    const isValid = component.validateForm();
    expect(isValid).toBeTrue();
    expect(Object.keys(component.formErrors()).length).toBe(0);
  });

  it('should clear field error when clearFieldError is called', () => {
    component.formErrors.set({ name: 'Name is required', email: 'Email is required' });
    component.clearFieldError('name');
    expect(component.formErrors()['name']).toBeUndefined();
    expect(component.formErrors()['email']).toBe('Email is required');
  });

  it('should have reason options', () => {
    expect(component.reasonOptions.length).toBeGreaterThan(0);
    expect(component.reasonOptions.some(o => o.value === 'support')).toBeTrue();
    expect(component.reasonOptions.some(o => o.value === 'bug')).toBeTrue();
    expect(component.reasonOptions.some(o => o.value === 'feedback')).toBeTrue();
  });
});
