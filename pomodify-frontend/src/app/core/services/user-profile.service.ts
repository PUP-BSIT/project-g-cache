import { Injectable, signal, computed } from '@angular/core';
import { API } from '../config/api.config';
import { Logger } from './logger.service';

export interface UserProfile {
  firstName: string;
  lastName: string;
  email: string;
  profilePictureUrl: string | null;
  backupEmail: string | null;
  isEmailVerified: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class UserProfileService {
  private readonly DEFAULT_AVATAR = 'assets/images/default-avatar.svg';
  
  // User profile data signals
  private readonly userProfileSignal = signal<UserProfile | null>(null);
  private readonly profilePictureUrlSignal = signal<string>(this.DEFAULT_AVATAR);
  
  // Public readonly signals for components to subscribe to
  readonly userProfile = this.userProfileSignal.asReadonly();
  readonly profilePictureUrl = this.profilePictureUrlSignal.asReadonly();
  
  // Computed signal for checking if user has custom profile picture
  readonly hasCustomProfilePicture = computed(() => {
    return this.profilePictureUrlSignal() !== this.DEFAULT_AVATAR;
  });
  
  // Computed signal for full name
  readonly fullName = computed(() => {
    const profile = this.userProfileSignal();
    if (profile?.firstName && profile?.lastName) {
      return `${profile.firstName} ${profile.lastName}`;
    }
    return '';
  });

  /**
   * Updates the user profile data
   */
  updateUserProfile(profile: UserProfile): void {
    Logger.log('[UserProfileService] Updating user profile:', profile);
    Logger.log('[UserProfileService] Profile picture URL from API:', profile.profilePictureUrl);
    this.userProfileSignal.set(profile);
    this.updateProfilePictureFromUrl(profile.profilePictureUrl);
  }

  /**
   * Updates only the profile picture URL
   */
  updateProfilePicture(pictureUrl: string | null): void {
    this.updateProfilePictureFromUrl(pictureUrl);
    
    // Also update the profile signal if it exists
    const currentProfile = this.userProfileSignal();
    if (currentProfile) {
      this.userProfileSignal.set({
        ...currentProfile,
        profilePictureUrl: pictureUrl
      });
    }
  }

  /**
   * Resets the profile picture to default
   */
  resetProfilePicture(): void {
    this.profilePictureUrlSignal.set(this.DEFAULT_AVATAR);
    
    // Also update the profile signal if it exists
    const currentProfile = this.userProfileSignal();
    if (currentProfile) {
      this.userProfileSignal.set({
        ...currentProfile,
        profilePictureUrl: null
      });
    }
  }

  /**
   * Updates the user's name
   */
  updateUserName(firstName: string, lastName: string): void {
    const currentProfile = this.userProfileSignal();
    if (currentProfile) {
      this.userProfileSignal.set({
        ...currentProfile,
        firstName,
        lastName
      });
    }
  }

  /**
   * Clears all user profile data (on logout)
   */
  clearUserProfile(): void {
    this.userProfileSignal.set(null);
    this.profilePictureUrlSignal.set(this.DEFAULT_AVATAR);
  }

  /**
   * Helper to convert backend URL to full URL
   */
  private updateProfilePictureFromUrl(url: string | null): void {
    if (url) {
      const baseUrl = API.ROOT.replace('/api/v2', '');
      const fullUrl = baseUrl + url;
      Logger.log('[UserProfileService] Setting profile picture URL to:', fullUrl);
      this.profilePictureUrlSignal.set(fullUrl);
    } else {
      Logger.log('[UserProfileService] No profile picture URL, using default avatar');
      this.profilePictureUrlSignal.set(this.DEFAULT_AVATAR);
    }
  }
}
