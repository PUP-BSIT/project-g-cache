import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EditActivityModal } from './edit-activity-modal';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

describe('EditActivityModal', () => {
  let component: EditActivityModal;
  let fixture: ComponentFixture<EditActivityModal>;
  let mockDialogRef: jasmine.SpyObj<MatDialogRef<EditActivityModal>>;

  const mockData = {
    name: 'Test Activity',
    category: 'Work',
    colorTag: 'blue',
    estimatedHoursPerWeek: 10
  };

  beforeEach(async () => {
    mockDialogRef = jasmine.createSpyObj('MatDialogRef', ['close']);

    await TestBed.configureTestingModule({
      imports: [EditActivityModal, NoopAnimationsModule],
      providers: [
        { provide: MatDialogRef, useValue: mockDialogRef },
        { provide: MAT_DIALOG_DATA, useValue: mockData }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(EditActivityModal);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with provided data', () => {
    expect(component.activityForm.get('name')?.value).toBe('Test Activity');
    expect(component.activityForm.get('category')?.value).toBe('Work');
    expect(component.selectedColor).toBe('blue');
  });

  it('should select color', () => {
    component.selectColor('green');
    expect(component.selectedColor).toBe('green');
  });

  it('should close dialog on cancel', () => {
    component.onCancel();
    expect(mockDialogRef.close).toHaveBeenCalledWith();
  });

  it('should save changes with valid data', () => {
    component.activityForm.patchValue({ name: 'Updated Activity' });
    component.onSaveChanges();
    expect(mockDialogRef.close).toHaveBeenCalled();
  });
});
