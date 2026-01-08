import { TestBed, ComponentFixture } from '@angular/core/testing';
import { TimePickerModalComponent } from './time-picker-modal';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

describe('TimePickerModalComponent', () => {
  let component: TimePickerModalComponent;
  let fixture: ComponentFixture<TimePickerModalComponent>;
  let mockDialogRef: jasmine.SpyObj<MatDialogRef<TimePickerModalComponent>>;

  beforeEach(async () => {
    mockDialogRef = jasmine.createSpyObj('MatDialogRef', ['close']);

    await TestBed.configureTestingModule({
      imports: [TimePickerModalComponent, NoopAnimationsModule],
      providers: [
        { provide: MatDialogRef, useValue: mockDialogRef },
        { provide: MAT_DIALOG_DATA, useValue: {} }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(TimePickerModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have time signal defined', () => {
    expect(component.time).toBeDefined();
    // The time signal should be a function (signal)
    expect(typeof component.time).toBe('function');
  });

  it('should close dialog on cancel', () => {
    component.onCancel();
    expect(mockDialogRef.close).toHaveBeenCalledWith();
  });

  it('should close dialog with time on confirm', () => {
    // Set a known value before confirming
    component.time.set({ minutes: 30, seconds: 15 });
    fixture.detectChanges();
    component.onConfirm();
    // Use jasmine.objectContaining to match the expected properties
    // The actual object may contain additional properties from the signal
    expect(mockDialogRef.close).toHaveBeenCalledWith(
      jasmine.objectContaining({ minutes: 30, seconds: 15 })
    );
  });
});
