import { Component, signal, inject, ViewChild, ElementRef, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { API } from '../../core/config/api.config';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';
import { BadgeService, Badge } from '../../core/services/badge.service';

export type ProfileData = {
  name: string;
  email: string;
  backupEmail?: string;
  profileImage?: string;
};

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './profile.html',
  styleUrls: ['./profile.scss']
})
export class Profile implements OnInit {
  private dialogRef = inject(MatDialogRef<Profile>);
  private fb = inject(FormBuilder);
  private badgeService = inject(BadgeService);

  @ViewChild('profileImageInput') private profileImageInput?: ElementRef<HTMLInputElement>;
  
  // Form states
  private http = inject(HttpClient);
  profileForm!: FormGroup;
  backupEmailForm!: FormGroup;
  passwordForm!: FormGroup;
  verificationForm!: FormGroup;
  
  // UI States
  protected showPasswordVerification = signal(false);
  protected showBackupEmailForm = signal(false);
  protected verificationTimer = signal(60);
  protected verificationCode = signal('');
  protected isVerificationValid = signal(false);
  protected isLoadingProfile = signal(true);
  
  // Profile data
  protected profileImage = signal<string>('assets/images/default-avatar.svg');
  protected userName = signal('');
  protected userEmail = signal('');
  protected backupEmail = signal<string | null>(null);
  protected badges = signal<Badge[]>([]);
  protected badgesLoading = signal(false);
  
  private timerInterval?: ReturnType<typeof setInterval>;
  
  ngOnInit(): void {
    // Fetch user data from backend and update UI
    this.fetchUserProfile();
    this.fetchUserBadges();

    // Initialize profile form
    this.profileForm = this.fb.group({
      name: [
        this.userName(),
        {
          validators: [Validators.required, Validators.minLength(2)],
        },
      ],
    });
    
    // Initialize backup email form
    this.backupEmailForm = this.fb.group({
      backupEmail: [
        '',
        {
          validators: [Validators.required, Validators.email],
        },
      ],
    });
    
    // Initialize password form (for verification)
    this.passwordForm = this.fb.group({
      currentPassword: [
        '',
        {
          validators: [Validators.required],
        },
      ],
      newPassword: [
        '',
        {
          validators: [Validators.required, Validators.minLength(8)],
        },
      ],
      confirmPassword: [
        '',
        {
          validators: [Validators.required],
        },
      ],
    });
    
    // Initialize verification form
    this.verificationForm = this.fb.group({
      code: [
        '',
        {
          validators: [Validators.required, Validators.minLength(6), Validators.maxLength(6)],
        },
      ],
    });
  }
  
  /**
   * Fetch user profile from backend and update UI (cookie-based auth)
   */
  private fetchUserProfile(): void {
    this.isLoadingProfile.set(true);
    this.http.get(API.USER.PROFILE, { withCredentials: true }).subscribe({
      next: (user: any) => {
        if (user.firstName && user.lastName) {
          const fullName = `${user.firstName} ${user.lastName}`;
          this.userName.set(fullName);
          if (this.profileForm) {
            this.profileForm.patchValue({ name: fullName });
          }
        }
        if (user.email) {
          this.userEmail.set(user.email);
        }
        this.isLoadingProfile.set(false);
      },
      error: () => {
        // Optionally clear UI or show error
        this.userName.set('');
        this.userEmail.set('');
        this.isLoadingProfile.set(false);
      }
    });
  }

  /**
   * Fetch user badges from backend
   */
  private fetchUserBadges(): void {
    this.badgesLoading.set(true);
    this.badgeService.getUserBadges().subscribe({
      next: (badges) => {
        this.badges.set(badges ?? []);
        this.badgesLoading.set(false);
      },
      error: () => {
        this.badges.set([]);
        this.badgesLoading.set(false);
      }
    });
  }

  // Profile image handling
  protected onImageUpload(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      const reader = new FileReader();
      reader.onload = (e: ProgressEvent<FileReader>) => {
        if (e.target?.result) {
          this.profileImage.set(e.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  }
  
  protected triggerImageUpload(): void {
    this.profileImageInput?.nativeElement.click();
  }
  
  // Name update
  protected updateName(): void {
    if (this.profileForm.valid) {
      const newName = this.profileForm.get('name')?.value;
      this.userName.set(newName);
      // TODO(Delumen, Ivan): Call API to update name
    }
  }
  
  // Password change flow
  protected requestPasswordChange(): void {
    this.showPasswordVerification.set(true);
    this.startVerificationTimer();
    // TODO(Delumen, Ivan): Call API to send verification code to email
  }
  
  protected startVerificationTimer(): void {
    this.verificationTimer.set(60);
    
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
    
    this.timerInterval = setInterval(() => {
      const current = this.verificationTimer();
      if (current > 0) {
        this.verificationTimer.set(current - 1);
      } else {
        clearInterval(this.timerInterval);
      }
    }, 1000);
  }
  
  protected verifyCode(): void {
    if (this.verificationForm.valid) {
      const code = this.verificationForm.get('code')?.value;
      // Static verification for demonstration: code is "123456"
      if (code === '123456') {
        this.isVerificationValid.set(true);
        clearInterval(this.timerInterval);
      } else {
        alert('Invalid verification code. For demo, use: 123456');
      }
    }
  }
  
  protected submitPasswordChange(): void {
    if (this.passwordForm.valid && this.isVerificationValid()) {
      const newPassword = this.passwordForm.get('newPassword')?.value;
      const confirmPassword = this.passwordForm.get('confirmPassword')?.value;
      
      if (newPassword !== confirmPassword) {
        alert('Passwords do not match');
        return;
      }
      
      // TODO(Delumen, Ivan): Call API to update password
      alert('Password updated successfully!');
      this.cancelPasswordChange();
    }
  }
  
  protected cancelPasswordChange(): void {
    this.showPasswordVerification.set(false);
    this.isVerificationValid.set(false);
    this.passwordForm.reset();
    this.verificationForm.reset();
    
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
  }
  
  // Backup email handling
  protected toggleBackupEmailForm(): void {
    this.showBackupEmailForm.update((show: boolean) => !show);
  }
  
  protected saveBackupEmail(): void {
    if (this.backupEmailForm.valid) {
      const email = this.backupEmailForm.get('backupEmail')?.value;
      this.backupEmail.set(email);
      this.showBackupEmailForm.set(false);
      // TODO(Delumen, Ivan): Call API to save backup email
    }
  }
  
  protected updateBackupEmail(): void {
    if (this.backupEmailForm.valid) {
      const email = this.backupEmailForm.get('backupEmail')?.value;
      this.backupEmail.set(email);
      // TODO(Delumen, Ivan): Call API to update backup email
    }
  }
  
  // Close modal
  protected onClose(): void {
    this.dialogRef.close();
  }
  
  // Save all changes
  protected onSaveChanges(): void {
    this.updateName();
    
    const profileData: ProfileData = {
      name: this.userName(),
      email: this.userEmail(),
      backupEmail: this.backupEmail() || undefined,
      profileImage: this.profileImage()
    };
    
    this.dialogRef.close(profileData);
  }
}
