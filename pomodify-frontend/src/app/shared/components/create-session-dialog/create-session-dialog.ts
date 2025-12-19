import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { SessionType } from '../../../core/services/session.service';

export interface CreateSessionDialogData {
  sessionType: SessionType;
  focusTimeInMinutes: number;
  breakTimeInMinutes: number;
  cycles: number;
}

@Component({
  selector: 'app-create-session-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule
  ],
  templateUrl: './create-session-dialog.html',
  styleUrls: ['./create-session-dialog.scss']
})
export class CreateSessionDialogComponent {
  private dialogRef = inject(MatDialogRef<CreateSessionDialogComponent>);

  // Use regular properties for form binding, not signals
  formData: CreateSessionDialogData = {
    sessionType: 'CLASSIC',
    focusTimeInMinutes: 25,
    breakTimeInMinutes: 5,
    cycles: 4
  };

  onCancel(): void {
    this.dialogRef.close();
  }

  onConfirm(): void {
    this.dialogRef.close(this.formData);
  }
}