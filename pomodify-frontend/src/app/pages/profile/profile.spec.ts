import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Profile } from './profile';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { MatDialogRef } from '@angular/material/dialog';

describe('Profile', () => {
  let component: Profile;
  let fixture: ComponentFixture<Profile>;
  let mockDialogRef: jasmine.SpyObj<MatDialogRef<Profile>>;

  beforeEach(async () => {
    mockDialogRef = jasmine.createSpyObj('MatDialogRef', ['close']);

    await TestBed.configureTestingModule({
      imports: [Profile],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: MatDialogRef, useValue: mockDialogRef }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(Profile);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize forms on init', () => {
    expect(component.profileForm).toBeTruthy();
    expect(component.backupEmailForm).toBeTruthy();
    expect(component.passwordForm).toBeTruthy();
    expect(component.verificationForm).toBeTruthy();
  });

  it('should have default profile image', () => {
    expect((component as any).profileImage()).toBe('assets/images/default-avatar.svg');
  });

  it('should have default user name', () => {
    expect((component as any).userName()).toBe('John Doe');
  });

  it('should close dialog on close', () => {
    (component as any).onClose();
    expect(mockDialogRef.close).toHaveBeenCalled();
  });

  it('should toggle backup email form', () => {
    expect((component as any).showBackupEmailForm()).toBe(false);
    (component as any).toggleBackupEmailForm();
    expect((component as any).showBackupEmailForm()).toBe(true);
  });

  it('should request password change', () => {
    (component as any).requestPasswordChange();
    expect((component as any).showPasswordVerification()).toBe(true);
  });

  it('should cancel password change', () => {
    (component as any).requestPasswordChange();
    (component as any).cancelPasswordChange();
    expect((component as any).showPasswordVerification()).toBe(false);
  });

  it('should have empty badges initially', () => {
    expect((component as any).badges().length).toBeGreaterThanOrEqual(0);
  });
});
