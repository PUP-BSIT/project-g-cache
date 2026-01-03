import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';

export interface SessionNoteDialogData {
  title: string;
  note: string;
}

@Component({
  selector: 'app-session-note-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule],
  templateUrl: './session-note-dialog.component.html',
  styleUrls: ['./session-note-dialog.component.scss']
})
export class SessionNoteDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<SessionNoteDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: SessionNoteDialogData
  ) {}

  close(): void {
    this.dialogRef.close();
  }
}
