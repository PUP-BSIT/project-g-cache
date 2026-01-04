import { Component, OnInit, inject } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MatDialogModule, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatAutocompleteModule, MatAutocompleteTrigger } from '@angular/material/autocomplete';
import { AsyncPipe } from '@angular/common';
import { Observable, startWith, map } from 'rxjs';

export type ActivityData = {
  name: string;
  category?: string;
  colorTag: string;
};

type ActivityFormValue = {
  name: string;
  category: string;
  colorTag: string;
};

@Component({
  selector: 'app-create-activity-modal',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatInputModule,
    MatFormFieldModule,
    MatAutocompleteModule,
    AsyncPipe
  ],
  templateUrl: './create-activity-modal.html',
  styleUrls: ['./create-activity-modal.scss']
})
export class CreateActivityModal implements OnInit {
  private dialogRef = inject(MatDialogRef<CreateActivityModal>);
  private fb = inject(FormBuilder);
  private data = inject(MAT_DIALOG_DATA, { optional: true }) as { categories?: string[] } | null;

  activityForm!: FormGroup;
  selectedColor: string = 'teal';
  categories: string[] = [];
  filteredCategories$!: Observable<string[]>;
  
  colors = [
    { name: 'teal', hex: '#5FA9A4' },
    { name: 'red', hex: '#EF4444' },
    { name: 'orange', hex: '#F97316' },
    { name: 'yellow', hex: '#FBBF24' },
    { name: 'green', hex: '#10B981' },
    { name: 'blue', hex: '#3B82F6' },
    { name: 'purple', hex: '#8B5CF6' }
  ];

  ngOnInit(): void {
    // Get categories from data if provided
    this.categories = this.data?.categories || [];
    
    this.activityForm = this.fb.group({
      name: [
        '',
        {
          validators: [Validators.required, Validators.minLength(1), Validators.maxLength(40)],
        },
      ],
      category: [
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

    // Set up autocomplete filtering
    this.filteredCategories$ = this.activityForm.get('category')!.valueChanges.pipe(
      startWith(''),
      map(value => this._filterCategories(value || ''))
    );
  }

  private _filterCategories(value: string): string[] {
    const filterValue = value.toLowerCase();
    return this.categories.filter(category => 
      category.toLowerCase().includes(filterValue)
    );
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
      const { name, category } = this.activityForm.getRawValue() as ActivityFormValue;
      
      if (!name || name.trim() === '') {
        console.error('[CreateActivityModal] Activity name is required');
        this.activityForm.get('name')?.markAsTouched();
        return;
      }
      
      const activityData: ActivityData = {
        name: name.trim(),
        category: category?.trim() || undefined,
        colorTag: this.selectedColor,
      };
      console.log('[CreateActivityModal] Closing with data:', activityData);
      this.dialogRef.close(activityData);
    } else {
      console.error('[CreateActivityModal] Form is invalid');
      this.activityForm.markAllAsTouched();
    }
  }
}
