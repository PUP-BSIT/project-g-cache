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
    expect(component.sessionForm.get('cycles')?.value).toBe(4);
    expect(component.sessionForm.get('enableLongBreak')?.value).toBe(true);
    expect(component.sessionForm.get('longBreakTimeInMinutes')?.value).toBe(15);
    expect(component.sessionForm.get('longBreakIntervalCycles')?.value).toBe(4);
  });

  it('should have focus time presets', () => {
    expect(component.focusTimePresets).toEqual([25, 30, 45, 60, 90]);
  });

  it('should have break time presets', () => {
    // Updated for freestyle mode constraints (2-10 minutes)
    expect(component.breakTimePresets).toEqual([2, 5, 10]);
  });

  it('should select focus time', () => {
    component.selectFocusTime(45);
    expect(component.sessionForm.get('focusTimeMinutes')?.value).toBe(45);
  });

  it('should select break time', () => {
    component.selectBreakTime(10);
    expect(component.sessionForm.get('breakTimeMinutes')?.value).toBe(10);
  });

  it('should close dialog on cancel', () => {
    component.onCancel();
    expect(mockDialogRef.close).toHaveBeenCalledWith();
  });

  it('should close dialog with session data on add session', () => {
    component.sessionForm.patchValue({
      focusTimeMinutes: 30,
      breakTimeMinutes: 10,
      cycles: 4,
      enableLongBreak: true,
      longBreakTimeInMinutes: 15,
      longBreakIntervalCycles: 4
    });
    component.onAddSession();
    expect(mockDialogRef.close).toHaveBeenCalledWith({
      sessionType: 'CLASSIC',
      focusTimeMinutes: 30,
      breakTimeMinutes: 10,
      cycles: 4,
      enableLongBreak: true,
      longBreakTimeInMinutes: 15,
      longBreakIntervalCycles: 4
    });
  });

  it('should validate minimum focus time (5 minutes)', () => {
    component.selectSessionType('FREESTYLE');
    component.sessionForm.patchValue({ focusTimeMinutes: 4 });
    expect(component.sessionForm.get('focusTimeMinutes')?.valid).toBeFalse();
  });

  it('should validate minimum break time (2 minutes)', () => {
    component.selectSessionType('FREESTYLE');
    component.sessionForm.patchValue({ breakTimeMinutes: 1 });
    expect(component.sessionForm.get('breakTimeMinutes')?.valid).toBeFalse();
  });

  it('should validate maximum focus time (90 minutes)', () => {
    component.selectSessionType('FREESTYLE');
    component.sessionForm.patchValue({ focusTimeMinutes: 91 });
    expect(component.sessionForm.get('focusTimeMinutes')?.valid).toBeFalse();
  });

  it('should validate maximum break time (10 minutes)', () => {
    component.selectSessionType('FREESTYLE');
    component.sessionForm.patchValue({ breakTimeMinutes: 11 });
    expect(component.sessionForm.get('breakTimeMinutes')?.valid).toBeFalse();
  });

  it('should accept valid focus time within range', () => {
    component.selectSessionType('FREESTYLE');
    component.sessionForm.patchValue({ focusTimeMinutes: 45 });
    expect(component.sessionForm.get('focusTimeMinutes')?.valid).toBeTrue();
  });

  it('should accept valid break time within range', () => {
    component.selectSessionType('FREESTYLE');
    component.sessionForm.patchValue({ breakTimeMinutes: 5 });
    expect(component.sessionForm.get('breakTimeMinutes')?.valid).toBeTrue();
  });

  it('should switch to freestyle mode', () => {
    component.selectSessionType('FREESTYLE');
    expect(component.sessionType).toBe('FREESTYLE');
  });

  it('should switch to classic mode', () => {
    component.selectSessionType('FREESTYLE');
    component.selectSessionType('CLASSIC');
    expect(component.sessionType).toBe('CLASSIC');
    expect(component.sessionForm.get('focusTimeMinutes')?.value).toBe(25);
    expect(component.sessionForm.get('breakTimeMinutes')?.value).toBe(5);
  });
});
