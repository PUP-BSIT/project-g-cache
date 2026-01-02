import { Component, inject } from '@angular/core';
import { MatDialogRef, MatDialogModule, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';

export interface DeleteUserData {
  user: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
  };
}

@Component({
  selector: 'app-delete-user-modal',
  standalone: true,
  imports: [CommonModule, MatDialogModule],
  templateUrl: './delete-user-modal.html',
  styleUrls: ['./delete-user-modal.scss']
})
export class DeleteUserModal {
  private dialogRef = inject(MatDialogRef<DeleteUserModal>);
  private data = inject(MAT_DIALOG_DATA) as DeleteUserData;

  get userName(): string {
    return `${this.data.user.firstName} ${this.data.user.lastName}`;
  }

  get userEmail(): string {
    return this.data.user.email;
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }

  onDelete(): void {
    this.dialogRef.close(true);
  }
}
