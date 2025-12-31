import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DeleteActivityModal } from './delete-activity-modal';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

describe('DeleteActivityModal', () => {
  let component: DeleteActivityModal;
  let fixture: ComponentFixture<DeleteActivityModal>;
  let mockDialogRef: jasmine.SpyObj<MatDialogRef<DeleteActivityModal>>;

  beforeEach(async () => {
    mockDialogRef = jasmine.createSpyObj('MatDialogRef', ['close']);

    await TestBed.configureTestingModule({
      imports: [DeleteActivityModal, NoopAnimationsModule],
      providers: [
        { provide: MatDialogRef, useValue: mockDialogRef },
        { provide: MAT_DIALOG_DATA, useValue: { id: '1', name: 'Test Activity' } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(DeleteActivityModal);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have activity name from data', () => {
    expect(component.activityName).toBe('Test Activity');
  });

  it('should close with false on cancel', () => {
    component.onCancel();
    expect(mockDialogRef.close).toHaveBeenCalledWith(false);
  });

  it('should close with true on delete', () => {
    component.onDelete();
    expect(mockDialogRef.close).toHaveBeenCalledWith(true);
  });
});
