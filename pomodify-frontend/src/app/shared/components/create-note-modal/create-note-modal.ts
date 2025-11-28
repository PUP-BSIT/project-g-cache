import { Component, OnInit, inject } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';

export type NoteData = {
  title: string;
  category?: string;
  content: string;
  colorTag: string;
};

type NoteFormValue = {
  title: string;
  category: string;
  content: string;
  colorTag: string;
};

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
      title: [
        '',
        {
          validators: [Validators.required, Validators.minLength(1)],
        },
      ],
      category: [
        '',
        {
          validators: [],
        },
      ],
      content: [
        '',
        {
          validators: [Validators.required, Validators.minLength(1)],
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
    this.noteForm.patchValue({ colorTag: colorName });
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onCreateNote(): void {
    if (this.noteForm.valid) {
      const { title, category, content } = this.noteForm.getRawValue() as NoteFormValue;
      const noteData: NoteData = {
        title,
        category: category || undefined,
        content,
        colorTag: this.selectedColor,
      };
      this.dialogRef.close(noteData);
    }
  }
}
