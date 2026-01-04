import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CreateActivityModal } from './create-activity-modal';
import { MatDialogRef } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

describe('CreateActivityModal', () => {
  let component: CreateActivityModal;
  let fixture: ComponentFixture<CreateActivityModal>;
  let mockDialogRef: jasmine.SpyObj<MatDialogRef<CreateActivityModal>>;

  beforeEach(async () => {
    mockDialogRef = jasmine.createSpyObj('MatDialogRef', ['close']);

    await TestBed.configureTestingModule({
      imports: [CreateActivityModal, NoopAnimationsModule],
      providers: [
        { provide: MatDialogRef, useValue: mockDialogRef }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(CreateActivityModal);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize form', () => {
    expect(component.activityForm).toBeTruthy();
  });

  it('should have default color as teal', () => {
    expect(component.selectedColor).toBe('teal');
  });

  it('should have color options', () => {
    expect(component.colors.length).toBe(7);
  });

  it('should select color', () => {
    component.selectColor('blue');
    expect(component.selectedColor).toBe('blue');
    expect(component.activityForm.get('colorTag')?.value).toBe('blue');
  });

  it('should close dialog on cancel', () => {
    component.onCancel();
    expect(mockDialogRef.close).toHaveBeenCalledWith();
  });

  it('should not create activity with empty name', () => {
    component.activityForm.patchValue({ name: '' });
    component.onCreateActivity();
    expect(mockDialogRef.close).not.toHaveBeenCalled();
  });

  it('should create activity with valid data', () => {
    component.activityForm.patchValue({ name: 'Test Activity' });
    component.onCreateActivity();
    expect(mockDialogRef.close).toHaveBeenCalled();
  });

  it('should validate name is required', () => {
    expect(component.activityForm.get('name')?.valid).toBeFalse();
    component.activityForm.patchValue({ name: 'Test' });
    expect(component.activityForm.get('name')?.valid).toBeTrue();
  });
});
