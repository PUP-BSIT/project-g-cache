import { Component, OnInit, inject } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MatDialogModule, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { ActivityData } from '../create-activity-modal/create-activity-modal';

@Component({
  selector: 'app-edit-activity-modal',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatInputModule,
    MatFormFieldModule
  ],
  templateUrl: './edit-activity-modal.html',
  styleUrls: ['./edit-activity-modal.scss']
})
export class EditActivityModal implements OnInit {
  private dialogRef = inject(MatDialogRef<EditActivityModal>);
  private fb = inject(FormBuilder);
  private data = inject(MAT_DIALOG_DATA) as ActivityData | undefined;

  activityForm!: FormGroup;
  selectedColor: string = 'red';

  colors = [
    { name: 'red', hex: '#EF4444' },
    { name: 'orange', hex: '#F97316' },
    { name: 'yellow', hex: '#FBBF24' },
    { name: 'green', hex: '#10B981' },
    { name: 'blue', hex: '#3B82F6' },
    { name: 'purple', hex: '#8B5CF6' }
  ];

  ngOnInit(): void {
    this.selectedColor = this.data?.colorTag ?? this.selectedColor;

    this.activityForm = this.fb.group({
      name: [this.data?.name ?? '', [Validators.required, Validators.minLength(1)]],
      category: [this.data?.category ?? ''],
      colorTag: [this.selectedColor],
      estimatedHoursPerWeek: [this.data?.estimatedHoursPerWeek ?? 1, [Validators.min(0), Validators.max(168)]]
    });
  }

  selectColor(colorName: string): void {
    this.selectedColor = colorName;
    this.activityForm.patchValue({ colorTag: colorName });
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onSaveChanges(): void {
    if (this.activityForm.valid) {
      const updated: ActivityData = {
        name: this.activityForm.get('name')?.value,
        category: this.activityForm.get('category')?.value || undefined,
        colorTag: this.selectedColor,
        estimatedHoursPerWeek: this.activityForm.get('estimatedHoursPerWeek')?.value || 0
      };
      this.dialogRef.close(updated);
    }
  }
}
