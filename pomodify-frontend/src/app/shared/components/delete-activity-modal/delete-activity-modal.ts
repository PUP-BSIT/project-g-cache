import { Component, inject } from '@angular/core';
import { MatDialogRef, MatDialogModule, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { CommonModule } from '@angular/common';

export interface DeleteActivityData {
  id?: string;
  name?: string;
}

@Component({
  selector: 'app-delete-activity-modal',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule],
  templateUrl: './delete-activity-modal.html',
  styleUrl: './delete-activity-modal.scss'
})
export class DeleteActivityModal {
  private dialogRef = inject(MatDialogRef<DeleteActivityModal>);
  private data = inject(MAT_DIALOG_DATA) as DeleteActivityData | undefined;

  activityName = this.data?.name ?? '';

  onCancel(): void {
    this.dialogRef.close(false);
  }

  onDelete(): void {
    // Close with confirmation true
    this.dialogRef.close(true);
  }
}
