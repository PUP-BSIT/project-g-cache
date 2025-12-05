import { Component, signal, inject, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';

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
export class Profile {
  private dialogRef = inject(MatDialogRef<Profile>);
  private fb = inject(FormBuilder);

  @ViewChild('profileImageInput') private profileImageInput?: ElementRef<HTMLInputElement>;
  
  // Form states
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
  
  // Profile data
  protected profileImage = signal<string>('assets/images/default-avatar.svg');
  protected userName = signal('John Doe');
  protected userEmail = signal('johndoe@gmail.com');
  protected backupEmail = signal<string | null>(null);
  
  private timerInterval?: ReturnType<typeof setInterval>;
  
  ngOnInit(): void {
    // Load user data from localStorage
    this.loadUserData();
    
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
   * Load user data from localStorage and update the component state
   */
  private loadUserData(): void {
    try {
      const currentUserStr = localStorage.getItem('currentUser');
      if (currentUserStr) {
        const currentUser = JSON.parse(currentUserStr);
        
        // Update user name and email from stored data
        if (currentUser.firstName && currentUser.lastName) {
          this.userName.set(`${currentUser.firstName} ${currentUser.lastName}`);
        }
        if (currentUser.email) {
          this.userEmail.set(currentUser.email);
        }
        
        console.log('[Profile] User data loaded:', currentUser.email);
      } else {
        console.warn('[Profile] No user data found in localStorage');
      }
    } catch (error) {
      console.error('[Profile] Error loading user data:', error);
    }
  }
  
  ngOnDestroy(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
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
