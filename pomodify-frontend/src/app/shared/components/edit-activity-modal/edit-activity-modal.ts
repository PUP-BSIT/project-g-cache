import { Component, OnInit, inject } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MatDialogModule, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatAutocompleteModule, MatAutocompleteTrigger } from '@angular/material/autocomplete';
import { AsyncPipe } from '@angular/common';
import { Observable, startWith, map } from 'rxjs';
import { ActivityData } from '../create-activity-modal/create-activity-modal';

type ActivityFormValue = {
  name: string;
  category: string;
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
    MatFormFieldModule,
    MatAutocompleteModule,
    AsyncPipe
  ],
  templateUrl: './edit-activity-modal.html',
  styleUrls: ['./edit-activity-modal.scss']
})
export class EditActivityModal implements OnInit {
  private dialogRef = inject(MatDialogRef<EditActivityModal>);
  private fb = inject(FormBuilder);
  private data = inject(MAT_DIALOG_DATA) as (ActivityData & { categories?: string[] }) | undefined;

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
    // Convert hex color to color name if needed
    const colorTag = this.data?.colorTag;
    if (colorTag) {
      this.selectedColor = this.hexToColorName(colorTag);
    }
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
      startWith(this.data?.category ?? ''),
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

  onSaveChanges(): void {
    if (this.activityForm.valid) {
      const { name, category } = this.activityForm.getRawValue() as ActivityFormValue;
      
      const updated: ActivityData = {
        name,
        category: category?.trim() || undefined,
        colorTag: this.selectedColor,
      };
      this.dialogRef.close(updated);
    }
  }

  // Convert hex color to color name
  private hexToColorName(colorOrHex: string): string {
    // If it's already a color name, return it
    const colorNames = this.colors.map(c => c.name);
    if (colorNames.includes(colorOrHex.toLowerCase())) {
      return colorOrHex.toLowerCase();
    }
    
    // Convert hex to color name
    const hexMap: Record<string, string> = {
      '#ef4444': 'red',
      '#f97316': 'orange',
      '#fbbf24': 'yellow',
      '#10b981': 'green',
      '#3b82f6': 'blue',
      '#8b5cf6': 'purple',
      '#5fa9a4': 'teal',
      '#4da1a9': 'teal',
    };
    return hexMap[colorOrHex.toLowerCase()] || 'teal';
  }
}
