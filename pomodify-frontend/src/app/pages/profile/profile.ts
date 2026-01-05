import { Component, signal, inject, ViewChild, ElementRef, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { API } from '../../core/config/api.config';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';
import { BadgeService, Badge } from '../../core/services/badge.service';
import { Auth } from '../../core/services/auth';
import { UserProfileService } from '../../core/services/user-profile.service';
import { SuccessNotificationService } from '../../core/services/success-notification.service';

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
  private auth = inject(Auth);
  private userProfileService = inject(UserProfileService);
  private notificationService = inject(SuccessNotificationService);

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
  protected isSavingBackupEmail = signal(false);
  protected isSavingName = signal(false);
  protected isChangingPassword = signal(false);
  protected passwordChangeError = signal<string | null>(null);
  protected passwordChangeSuccess = signal(false);
  protected isUploadingImage = signal(false);
  protected imageUploadError = signal<string | null>(null);
  protected hasCustomProfilePicture = signal(false);
  
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
        if (user.backupEmail) {
          this.backupEmail.set(user.backupEmail);
          if (this.backupEmailForm) {
            this.backupEmailForm.patchValue({ backupEmail: user.backupEmail });
          }
        }
        if (user.profilePictureUrl) {
          // Construct full URL for profile picture
          const baseUrl = API.ROOT.replace('/api/v2', '');
          this.profileImage.set(baseUrl + user.profilePictureUrl);
          this.hasCustomProfilePicture.set(true);
        } else {
          this.profileImage.set('assets/images/default-avatar.svg');
          this.hasCustomProfilePicture.set(false);
        }
        
        // Sync with shared UserProfileService so header icons update across all pages
        this.userProfileService.updateUserProfile({
          firstName: user.firstName || '',
          lastName: user.lastName || '',
          email: user.email || '',
          profilePictureUrl: user.profilePictureUrl || null,
          backupEmail: user.backupEmail || null,
          isEmailVerified: user.isEmailVerified || false
        });
        
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
      
      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        this.imageUploadError.set('File size exceeds 5MB limit');
        return;
      }
      
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        this.imageUploadError.set('Invalid file type. Allowed: JPG, PNG, GIF, WebP');
        return;
      }
      
      this.isUploadingImage.set(true);
      this.imageUploadError.set(null);
      
      this.auth.uploadProfilePicture(file).then((response: any) => {
        if (response.profilePictureUrl) {
          const baseUrl = API.ROOT.replace('/api/v2', '');
          const fullUrl = baseUrl + response.profilePictureUrl;
          this.profileImage.set(fullUrl);
          this.hasCustomProfilePicture.set(true);
          // Update shared profile service so all components reflect the change
          this.userProfileService.updateProfilePicture(response.profilePictureUrl);
          this.notificationService.showSuccess('Profile Updated', 'Your profile picture has been updated successfully.');
        }
        this.isUploadingImage.set(false);
      }).catch((error) => {
        console.error('Failed to upload profile picture:', error);
        this.imageUploadError.set('Failed to upload image. Please try again.');
        this.isUploadingImage.set(false);
      });
    }
  }
  
  protected triggerImageUpload(): void {
    this.profileImageInput?.nativeElement.click();
  }
  
  protected deleteProfilePicture(): void {
    if (!this.hasCustomProfilePicture()) return;
    
    this.isUploadingImage.set(true);
    this.auth.deleteProfilePicture().then(() => {
      this.profileImage.set('assets/images/default-avatar.svg');
      this.hasCustomProfilePicture.set(false);
      this.isUploadingImage.set(false);
      // Update shared profile service so all components reflect the change
      this.userProfileService.resetProfilePicture();
      this.notificationService.showSuccess('Profile Updated', 'Your profile picture has been removed.');
    }).catch((error) => {
      console.error('Failed to delete profile picture:', error);
      this.imageUploadError.set('Failed to delete image. Please try again.');
      this.isUploadingImage.set(false);
    });
  }
  
  // Name update
  protected updateName(): void {
    if (this.profileForm.valid) {
      const fullName = this.profileForm.get('name')?.value;
      const nameParts = fullName.trim().split(/\s+/);
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || nameParts[0] || '';
      
      this.isSavingName.set(true);
      
      this.auth.updateProfile(firstName, lastName).then(() => {
        this.userName.set(fullName);
        this.isSavingName.set(false);
        // Update shared profile service so all components reflect the change
        this.userProfileService.updateUserName(firstName, lastName);
        this.notificationService.showSuccess('Profile Updated', 'Your name has been updated successfully.');
      }).catch((error) => {
        console.error('Failed to update name:', error);
        this.notificationService.showError('Error', 'Failed to update name. Please try again.');
        this.isSavingName.set(false);
      });
    }
  }
  
  // Password change flow
  protected requestPasswordChange(): void {
    this.showPasswordVerification.set(true);
    this.passwordChangeError.set(null);
    this.passwordChangeSuccess.set(false);
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
    if (this.passwordForm.valid) {
      const currentPassword = this.passwordForm.get('currentPassword')?.value;
      const newPassword = this.passwordForm.get('newPassword')?.value;
      const confirmPassword = this.passwordForm.get('confirmPassword')?.value;
      
      if (newPassword !== confirmPassword) {
        this.passwordChangeError.set('Passwords do not match');
        return;
      }
      
      this.isChangingPassword.set(true);
      this.passwordChangeError.set(null);
      
      this.auth.changePassword(currentPassword, newPassword).then(() => {
        this.passwordChangeSuccess.set(true);
        this.isChangingPassword.set(false);
        // Reset form after short delay
        setTimeout(() => {
          this.cancelPasswordChange();
        }, 2000);
      }).catch((error) => {
        console.error('Failed to change password:', error);
        this.passwordChangeError.set('Current password is incorrect or failed to update.');
        this.isChangingPassword.set(false);
      });
    }
  }
  
  protected cancelPasswordChange(): void {
    this.showPasswordVerification.set(false);
    this.isVerificationValid.set(false);
    this.passwordChangeError.set(null);
    this.passwordChangeSuccess.set(false);
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
      this.isSavingBackupEmail.set(true);
      
      this.auth.updateBackupEmail(email).then(() => {
        this.backupEmail.set(email);
        this.showBackupEmailForm.set(false);
        this.isSavingBackupEmail.set(false);
      }).catch((error) => {
        console.error('Failed to save backup email:', error);
        alert('Failed to save backup email. Please try again.');
        this.isSavingBackupEmail.set(false);
      });
    }
  }
  
  protected updateBackupEmail(): void {
    if (this.backupEmailForm.valid) {
      const email = this.backupEmailForm.get('backupEmail')?.value;
      this.isSavingBackupEmail.set(true);
      
      this.auth.updateBackupEmail(email).then(() => {
        this.backupEmail.set(email);
        this.isSavingBackupEmail.set(false);
      }).catch((error) => {
        console.error('Failed to update backup email:', error);
        alert('Failed to update backup email. Please try again.');
        this.isSavingBackupEmail.set(false);
      });
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
