import { Component, OnInit, inject } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MatDialogModule, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { SessionData } from '../add-session-modal/add-session-modal';

@Component({
  selector: 'app-edit-session-modal',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatInputModule,
    MatFormFieldModule
  ],
  templateUrl: './edit-session-modal.html',
  styleUrls: ['./edit-session-modal.scss']
})
export class EditSessionModal implements OnInit {
  private dialogRef = inject(MatDialogRef<EditSessionModal>);
  private fb = inject(FormBuilder);
  private data = inject(MAT_DIALOG_DATA) as { session: SessionData } | undefined;

  sessionForm!: FormGroup;

  // Common time presets (in minutes)
  focusTimePresets = [25, 30, 45, 60, 90];
  breakTimePresets = [5, 10, 15, 20, 30];

  ngOnInit(): void {
    const session = this.data?.session || { focusTimeMinutes: 25, breakTimeMinutes: 5, note: '' };
    this.sessionForm = this.fb.group({
      focusTimeMinutes: [session.focusTimeMinutes, [Validators.required, Validators.min(25), Validators.max(120)]],
      breakTimeMinutes: [session.breakTimeMinutes, [Validators.required, Validators.min(5), Validators.max(60)]],
      note: [session.note || '']
    });
  }

  selectFocusTime(minutes: number): void {
    this.sessionForm.patchValue({ focusTimeMinutes: minutes });
  }

  selectBreakTime(minutes: number): void {
    this.sessionForm.patchValue({ breakTimeMinutes: minutes });
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onUpdateSession(): void {
    if (this.sessionForm.valid) {
      const sessionData: SessionData = {
        focusTimeMinutes: this.sessionForm.get('focusTimeMinutes')?.value,
        breakTimeMinutes: this.sessionForm.get('breakTimeMinutes')?.value,
        note: this.sessionForm.get('note')?.value?.trim() || undefined
      };
      this.dialogRef.close(sessionData);
    }
  }
}

