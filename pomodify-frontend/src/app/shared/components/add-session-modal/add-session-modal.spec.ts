import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AddSessionModal } from './add-session-modal';
import { MatDialogRef } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

describe('AddSessionModal', () => {
  let component: AddSessionModal;
  let fixture: ComponentFixture<AddSessionModal>;
  let mockDialogRef: jasmine.SpyObj<MatDialogRef<AddSessionModal>>;

  beforeEach(async () => {
    mockDialogRef = jasmine.createSpyObj('MatDialogRef', ['close']);

    await TestBed.configureTestingModule({
      imports: [AddSessionModal, NoopAnimationsModule],
      providers: [
        { provide: MatDialogRef, useValue: mockDialogRef }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AddSessionModal);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize form with default values', () => {
    expect(component.sessionForm.get('focusTimeMinutes')?.value).toBe(25);
    expect(component.sessionForm.get('breakTimeMinutes')?.value).toBe(5);
    expect(component.sessionForm.get('note')?.value).toBe('');
  });

  it('should have focus time presets', () => {
    expect(component.focusTimePresets).toEqual([25, 30, 45, 60, 90]);
  });

  it('should have break time presets', () => {
    expect(component.breakTimePresets).toEqual([5, 10, 15, 20, 30]);
  });

  it('should select focus time', () => {
    component.selectFocusTime(45);
    expect(component.sessionForm.get('focusTimeMinutes')?.value).toBe(45);
  });

  it('should select break time', () => {
    component.selectBreakTime(15);
    expect(component.sessionForm.get('breakTimeMinutes')?.value).toBe(15);
  });

  it('should close dialog on cancel', () => {
    component.onCancel();
    expect(mockDialogRef.close).toHaveBeenCalledWith();
  });

  it('should close dialog with data on add session', () => {
    component.sessionForm.patchValue({
      focusTimeMinutes: 30,
      breakTimeMinutes: 10,
      note: 'Test note'
    });
    component.onAddSession();
    expect(mockDialogRef.close).toHaveBeenCalledWith({
      focusTimeMinutes: 30,
      breakTimeMinutes: 10,
      note: 'Test note'
    });
  });

  it('should validate minimum focus time', () => {
    component.sessionForm.patchValue({ focusTimeMinutes: 10 });
    expect(component.sessionForm.get('focusTimeMinutes')?.valid).toBeFalse();
  });

  it('should validate minimum break time', () => {
    component.sessionForm.patchValue({ breakTimeMinutes: 2 });
    expect(component.sessionForm.get('breakTimeMinutes')?.valid).toBeFalse();
  });
});
