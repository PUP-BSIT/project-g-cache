import { Component, OnInit, inject } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MatDialogModule, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { ActivityData } from '../create-activity-modal/create-activity-modal';

type ActivityFormValue = {
  name: string;
  category: string;
  customCategory: string;
  colorTag: string;
};

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
  private data = inject(MAT_DIALOG_DATA) as (ActivityData & { categories?: string[] }) | undefined;

  activityForm!: FormGroup;
  selectedColor: string = 'red';
  categories: string[] = [];

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
    // Get categories from data if provided
    this.categories = this.data?.categories || [];

    this.activityForm = this.fb.group({
      name: [
        this.data?.name ?? '',
        {
          validators: [Validators.required, Validators.minLength(1), Validators.maxLength(40)],
        },
      ],
      category: [
        this.data?.category ?? '',
        {
          validators: [],
        },
      ],
      customCategory: [
        '',
        {
          validators: [Validators.maxLength(40)],
        },
      ],
      colorTag: [
        this.selectedColor,
        {
          validators: [Validators.required],
        },
      ],
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
      const { name, category, customCategory } = this.activityForm.getRawValue() as ActivityFormValue;
      
      // Use custom category if provided, otherwise use dropdown selection
      const finalCategory = customCategory?.trim() || category || undefined;
      
      const updated: ActivityData = {
        name,
        category: finalCategory,
        colorTag: this.selectedColor,
      };
      this.dialogRef.close(updated);
    }
  }
}
