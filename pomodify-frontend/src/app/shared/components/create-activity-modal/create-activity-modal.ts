import { Component, OnInit, inject } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';

export interface ActivityData {
  name: string;
  category?: string;
  colorTag: string;
  estimatedHoursPerWeek?: number;
}

@Component({
  selector: 'app-create-activity-modal',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatInputModule,
    MatFormFieldModule
  ],
  templateUrl: './create-activity-modal.html',
  styleUrls: ['./create-activity-modal.scss']
})
export class CreateActivityModal implements OnInit {
  private dialogRef = inject(MatDialogRef<CreateActivityModal>);
  private fb = inject(FormBuilder);

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
    this.activityForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(1)]],
      category: [''],
      colorTag: [this.selectedColor],
      estimatedHoursPerWeek: [1, [Validators.min(0), Validators.max(168)]]
    });
  }

  selectColor(colorName: string): void {
    this.selectedColor = colorName;
    this.activityForm.patchValue({ colorTag: colorName });
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onCreateActivity(): void {
    if (this.activityForm.valid) {
      const activityData: ActivityData = {
        name: this.activityForm.get('name')?.value,
        category: this.activityForm.get('category')?.value || undefined,
        colorTag: this.selectedColor,
        estimatedHoursPerWeek: this.activityForm.get('estimatedHoursPerWeek')?.value || 0
      };
      this.dialogRef.close(activityData);
    }
  }
}
