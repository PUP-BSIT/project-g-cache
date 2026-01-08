import { Component, OnInit, inject, ElementRef, ViewChild, HostListener } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MatDialogModule, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatAutocompleteModule, MatAutocompleteTrigger } from '@angular/material/autocomplete';
import { AsyncPipe } from '@angular/common';
import { Observable, startWith, map } from 'rxjs';
import { Logger } from '../../../core/services/logger.service';

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

  @ViewChild('colorTrack') colorTrack!: ElementRef<HTMLDivElement>;

  activityForm!: FormGroup;
  selectedColor: string = 'teal';
  selectedColorHex: string = '#5FA9A4';
  sliderPosition: number = 50; // percentage position on slider
  categories: string[] = [];
  filteredCategories$!: Observable<string[]>;
  
  private isDragging = false;
  
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

  // Slider color picker methods
  onSliderClick(event: MouseEvent): void {
    this.updateColorFromEvent(event);
  }

  onThumbMouseDown(event: MouseEvent): void {
    event.preventDefault();
    this.isDragging = true;
  }

  // Touch events for mobile
  onThumbTouchStart(event: TouchEvent): void {
    event.preventDefault();
    this.isDragging = true;
    this.updateColorFromTouchEvent(event);
  }

  onSliderTouchMove(event: TouchEvent): void {
    if (this.isDragging) {
      event.preventDefault();
      this.updateColorFromTouchEvent(event);
    }
  }

  @HostListener('document:touchend')
  onTouchEnd(): void {
    this.isDragging = false;
  }

  @HostListener('document:mousemove', ['$event'])
  onMouseMove(event: MouseEvent): void {
    if (this.isDragging) {
      this.updateColorFromEvent(event);
    }
  }

  @HostListener('document:mouseup')
  onMouseUp(): void {
    this.isDragging = false;
  }

  private updateColorFromTouchEvent(event: TouchEvent): void {
    if (!this.colorTrack || !event.touches.length) return;
    
    const touch = event.touches[0];
    const track = this.colorTrack.nativeElement;
    const rect = track.getBoundingClientRect();
    let position = ((touch.clientX - rect.left) / rect.width) * 100;
    
    // Clamp position between 0 and 100
    position = Math.max(0, Math.min(100, position));
    
    this.sliderPosition = position;
    this.selectedColorHex = this.hueToHex(position / 100 * 360);
    this.selectedColor = this.selectedColorHex;
    this.activityForm.patchValue({ colorTag: this.selectedColorHex });
  }

  private updateColorFromEvent(event: MouseEvent): void {
    if (!this.colorTrack) return;
    
    const track = this.colorTrack.nativeElement;
    const rect = track.getBoundingClientRect();
    let position = ((event.clientX - rect.left) / rect.width) * 100;
    
    // Clamp position between 0 and 100
    position = Math.max(0, Math.min(100, position));
    
    this.sliderPosition = position;
    this.selectedColorHex = this.hueToHex(position / 100 * 360);
    this.selectedColor = this.selectedColorHex;
    this.activityForm.patchValue({ colorTag: this.selectedColorHex });
  }

  private hueToHex(hue: number): string {
    // Convert hue (0-360) to RGB then to hex
    const s = 1; // Full saturation
    const l = 0.5; // 50% lightness for vibrant colors
    
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs((hue / 60) % 2 - 1));
    const m = l - c / 2;
    
    let r = 0, g = 0, b = 0;
    
    if (hue >= 0 && hue < 60) {
      r = c; g = x; b = 0;
    } else if (hue >= 60 && hue < 120) {
      r = x; g = c; b = 0;
    } else if (hue >= 120 && hue < 180) {
      r = 0; g = c; b = x;
    } else if (hue >= 180 && hue < 240) {
      r = 0; g = x; b = c;
    } else if (hue >= 240 && hue < 300) {
      r = x; g = 0; b = c;
    } else {
      r = c; g = 0; b = x;
    }
    
    const toHex = (n: number) => {
      const hex = Math.round((n + m) * 255).toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    };
    
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
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
      Logger.log('[CreateActivityModal] Closing with data:', activityData);
      this.dialogRef.close(activityData);
    } else {
      console.error('[CreateActivityModal] Form is invalid');
      this.activityForm.markAllAsTouched();
    }
  }
}
