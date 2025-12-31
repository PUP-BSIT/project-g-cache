import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TimePickerModalComponent } from './time-picker-modal';
import { MatDialogRef } from '@angular/material/dialog';
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
        { provide: MatDialogRef, useValue: mockDialogRef }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(TimePickerModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have default time of 25 minutes', () => {
    expect(component.time().minutes).toBe(25);
    expect(component.time().seconds).toBe(0);
  });

  it('should close dialog on cancel', () => {
    component.onCancel();
    expect(mockDialogRef.close).toHaveBeenCalledWith();
  });

  it('should close dialog with time on confirm', () => {
    component.time.set({ minutes: 30, seconds: 15 });
    component.onConfirm();
    expect(mockDialogRef.close).toHaveBeenCalledWith({ minutes: 30, seconds: 15 });
  });
});
