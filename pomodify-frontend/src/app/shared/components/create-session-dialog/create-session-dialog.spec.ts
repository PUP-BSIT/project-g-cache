import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CreateSessionDialogComponent } from './create-session-dialog';
import { MatDialogRef } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

describe('CreateSessionDialogComponent', () => {
  let component: CreateSessionDialogComponent;
  let fixture: ComponentFixture<CreateSessionDialogComponent>;
  let mockDialogRef: jasmine.SpyObj<MatDialogRef<CreateSessionDialogComponent>>;

  beforeEach(async () => {
    mockDialogRef = jasmine.createSpyObj('MatDialogRef', ['close']);

    await TestBed.configureTestingModule({
      imports: [CreateSessionDialogComponent, NoopAnimationsModule],
      providers: [
        { provide: MatDialogRef, useValue: mockDialogRef }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(CreateSessionDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have default form data', () => {
    expect(component.form.get('sessionType')?.value).toBe('CLASSIC');
    expect(component.form.get('focusTimeInMinutes')?.value).toBe(25);
    expect(component.form.get('breakTimeInMinutes')?.value).toBe(5);
    expect(component.form.get('cycles')?.value).toBe(4);
  });

  it('should close dialog on cancel', () => {
    component.onCancel();
    expect(mockDialogRef.close).toHaveBeenCalledWith();
  });

  it('should close dialog with form data on confirm', () => {
    component.form.patchValue({ focusTimeInMinutes: 30 });
    component.onConfirm();
    expect(mockDialogRef.close).toHaveBeenCalled();
  });
});
