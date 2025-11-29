import { Component, inject } from '@angular/core';
import { MatDialogRef, MatDialogModule, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { CommonModule } from '@angular/common';

export type DeleteNoteData = {
  id?: string;
  title?: string;
};

@Component({
  selector: 'app-delete-note-modal',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule],
  templateUrl: './delete-note-modal.html',
  styleUrls: ['./delete-note-modal.scss']
})
export class DeleteNoteModal {
  private dialogRef = inject(MatDialogRef<DeleteNoteModal>);
  private data = inject(MAT_DIALOG_DATA) as DeleteNoteData | undefined;

  noteTitle = this.data?.title ?? '';

  onCancel(): void {
    this.dialogRef.close(false);
  }

  onDelete(): void {
    this.dialogRef.close(true);
  }
}
