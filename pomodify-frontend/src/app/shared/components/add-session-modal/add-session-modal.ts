import { Component, OnInit, inject } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';

export interface SessionData {
  focusTimeMinutes: number;
  breakTimeMinutes: number;
  note?: string;
}

@Component({
  selector: 'app-add-session-modal',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatInputModule,
    MatFormFieldModule
  ],
  templateUrl: './add-session-modal.html',
  styleUrls: ['./add-session-modal.scss']
})
export class AddSessionModal implements OnInit {
  private dialogRef = inject(MatDialogRef<AddSessionModal>);
  private fb = inject(FormBuilder);

  sessionForm!: FormGroup;

  // Common time presets (in minutes)
  focusTimePresets = [25, 30, 45, 60, 90];
  breakTimePresets = [5, 10, 15, 20, 30];

  ngOnInit(): void {
    this.sessionForm = this.fb.group({
      focusTimeMinutes: [25, [Validators.required, Validators.min(25), Validators.max(120)]],
      breakTimeMinutes: [5, [Validators.required, Validators.min(5), Validators.max(60)]],
      note: ['']
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

  onAddSession(): void {
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

