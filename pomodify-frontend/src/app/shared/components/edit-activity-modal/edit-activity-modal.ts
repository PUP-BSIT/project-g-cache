import { Component, OnInit, inject, ElementRef, ViewChild, HostListener } from '@angular/core';
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

  @ViewChild('colorTrack') colorTrack!: ElementRef<HTMLDivElement>;

  activityForm!: FormGroup;
  selectedColor: string = 'teal';
  selectedColorHex: string = '#5FA9A4';
  sliderPosition: number = 50;
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
    // Convert hex color to color name if needed
    const colorTag = this.data?.colorTag;
    if (colorTag) {
      // If it's a hex color, use it directly
      if (colorTag.startsWith('#')) {
        this.selectedColorHex = colorTag;
        this.selectedColor = colorTag;
        this.sliderPosition = this.hexToSliderPosition(colorTag);
      } else {
        // Convert color name to hex
        this.selectedColor = this.hexToColorName(colorTag);
        this.selectedColorHex = this.colorNameToHex(this.selectedColor);
        this.sliderPosition = this.hexToSliderPosition(this.selectedColorHex);
      }
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

  private colorNameToHex(colorName: string): string {
    const color = this.colors.find(c => c.name === colorName);
    return color?.hex || '#5FA9A4';
  }

  private hexToSliderPosition(hex: string): number {
    // Convert hex to HSL and get hue
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;
    
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0;
    
    if (max !== min) {
      const d = max - min;
      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
        case g: h = ((b - r) / d + 2) / 6; break;
        case b: h = ((r - g) / d + 4) / 6; break;
      }
    }
    
    return h * 100;
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
    
    position = Math.max(0, Math.min(100, position));
    
    this.sliderPosition = position;
    this.selectedColorHex = this.hueToHex(position / 100 * 360);
    this.selectedColor = this.selectedColorHex;
    this.activityForm.patchValue({ colorTag: this.selectedColorHex });
  }

  private hueToHex(hue: number): string {
    const s = 1;
    const l = 0.5;
    
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
