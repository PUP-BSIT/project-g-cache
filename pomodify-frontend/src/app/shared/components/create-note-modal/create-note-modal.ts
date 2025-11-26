import { Component, OnInit, inject } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';

export interface NoteData {
  title: string;
  category?: string;
  content: string;
  colorTag: string;
}

@Component({
  selector: 'app-create-note-modal',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatInputModule,
    MatFormFieldModule
  ],
  templateUrl: './create-note-modal.html',
  styleUrls: ['./create-note-modal.scss']
})
export class CreateNoteModal implements OnInit {
  private dialogRef = inject(MatDialogRef<CreateNoteModal>);
  private fb = inject(FormBuilder);

  noteForm!: FormGroup;
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
    this.noteForm = this.fb.group({
      title: ['', [Validators.required, Validators.minLength(1)]],
      category: [''],
      content: ['', [Validators.required, Validators.minLength(1)]],
      colorTag: [this.selectedColor]
    });
  }

  selectColor(colorName: string): void {
    this.selectedColor = colorName;
    this.noteForm.patchValue({ colorTag: colorName });
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onCreateNote(): void {
    if (this.noteForm.valid) {
      const noteData: NoteData = {
        title: this.noteForm.get('title')?.value,
        category: this.noteForm.get('category')?.value || undefined,
        content: this.noteForm.get('content')?.value,
        colorTag: this.selectedColor
      };
      this.dialogRef.close(noteData);
    }
  }
}
