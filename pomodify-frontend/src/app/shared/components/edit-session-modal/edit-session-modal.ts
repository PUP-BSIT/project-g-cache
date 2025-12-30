import { Component, OnInit, inject } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MatDialogModule, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { SessionData as BaseSessionData } from '../add-session-modal/add-session-modal';
import { CommonModule } from '@angular/common';
import { AiService, AiSuggestionResponse } from '../../../core/services/ai.service';

type SessionFormValue = {
  focusTimeMinutes: number;
  breakTimeMinutes: number;
  note: string;
};

type SessionData = BaseSessionData & { activityId?: number };

@Component({
  selector: 'app-edit-session-modal',
  standalone: true,
  imports: [
    CommonModule,
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
  private aiService = inject(AiService);

  sessionForm!: FormGroup;
  aiLoading = false;
  aiError: string | null = null;
  aiSuggestion: AiSuggestionResponse | null = null;

  // Common time presets (in minutes)
  focusTimePresets = [25, 30, 45, 60, 90];
  breakTimePresets = [5, 10, 15, 20, 30];

  ngOnInit(): void {
    const session = this.data?.session || { focusTimeMinutes: 25, breakTimeMinutes: 5, note: '' };
    this.sessionForm = this.fb.group({
      focusTimeMinutes: [
        session.focusTimeMinutes,
        {
          validators: [Validators.required, Validators.min(25), Validators.max(120)],
        },
      ],
      breakTimeMinutes: [
        session.breakTimeMinutes,
        {
          validators: [Validators.required, Validators.min(5), Validators.max(60)],
        },
      ],
      note: [
        session.note || '',
        {
          validators: [],
        },
      ],
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
      const { focusTimeMinutes, breakTimeMinutes, note } = this.sessionForm.getRawValue() as SessionFormValue;
      const updatedSession: SessionData = {
        focusTimeMinutes,
        breakTimeMinutes,
        note: note.trim() || undefined,
      };
      this.dialogRef.close(updatedSession);
    }
  }

  onSuggestNote(): void {
    this.aiLoading = true;
    this.aiError = null;
    this.aiSuggestion = null;
    const activityId = this.data?.session?.activityId;
    if (!activityId) {
      this.aiLoading = false;
      this.aiError = 'No activity context for AI suggestion.';
      return;
    }
    this.aiService.suggestNextStep({ activityId }).subscribe({
      next: (res) => {
        this.aiSuggestion = res;
        this.sessionForm.patchValue({ note: res.suggestedNote });
        this.aiLoading = false;
      },
      error: (err) => {
        this.aiError = 'AI suggestion failed.';
        this.aiLoading = false;
      }
    });
  }
}

