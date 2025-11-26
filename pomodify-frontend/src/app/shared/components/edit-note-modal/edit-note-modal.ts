import { Component, OnInit, inject } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MatDialogModule, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { CommonModule } from '@angular/common';

export interface NoteData {
  id?: string;
  title: string;
  category?: string;
  content: string;
  colorTag: string;
}

@Component({
  selector: 'app-edit-note-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatDialogModule, MatButtonModule, MatInputModule, MatFormFieldModule],
  templateUrl: './edit-note-modal.html',
  styleUrl: './edit-note-modal.scss'
})
export class EditNoteModal implements OnInit {
  private dialogRef = inject(MatDialogRef<EditNoteModal>);
  private fb = inject(FormBuilder);
  private data = inject(MAT_DIALOG_DATA) as NoteData | undefined;

  noteForm!: FormGroup;
  selectedColor: string = this.data?.colorTag ?? 'red';

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
      title: [this.data?.title ?? '', [Validators.required, Validators.minLength(1)]],
      category: [this.data?.category ?? ''],
      content: [this.data?.content ?? '', [Validators.required, Validators.minLength(1)]],
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

  onSaveNote(): void {
    if (this.noteForm.valid) {
      const noteData: NoteData = {
        id: this.data?.id,
        title: this.noteForm.get('title')?.value,
        category: this.noteForm.get('category')?.value || undefined,
        content: this.noteForm.get('content')?.value,
        colorTag: this.selectedColor
      };
      this.dialogRef.close(noteData);
    }
  }
}
