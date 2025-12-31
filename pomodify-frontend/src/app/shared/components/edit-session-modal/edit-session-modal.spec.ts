import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EditSessionModal } from './edit-session-modal';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

describe('EditSessionModal', () => {
  let component: EditSessionModal;
  let fixture: ComponentFixture<EditSessionModal>;
  let mockDialogRef: jasmine.SpyObj<MatDialogRef<EditSessionModal>>;

  const mockData = {
    session: {
      focusTimeMinutes: 30,
      breakTimeMinutes: 10,
      note: 'Test note',
      activityId: 1
    }
  };

  beforeEach(async () => {
    mockDialogRef = jasmine.createSpyObj('MatDialogRef', ['close']);

    await TestBed.configureTestingModule({
      imports: [EditSessionModal, NoopAnimationsModule],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: MatDialogRef, useValue: mockDialogRef },
        { provide: MAT_DIALOG_DATA, useValue: mockData }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(EditSessionModal);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with provided session data', () => {
    expect(component.sessionForm.get('focusTimeMinutes')?.value).toBe(30);
    expect(component.sessionForm.get('breakTimeMinutes')?.value).toBe(10);
    expect(component.sessionForm.get('note')?.value).toBe('Test note');
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

  it('should update session with valid data', () => {
    component.onUpdateSession();
    expect(mockDialogRef.close).toHaveBeenCalled();
  });

  it('should not be loading AI initially', () => {
    expect(component.aiLoading).toBeFalse();
  });
});
