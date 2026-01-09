import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API } from '../config/api.config';
import { Logger } from './logger.service';

export interface SoundSettings {
  enabled: boolean;
  type: 'bell' | 'chime' | 'digital' | 'soft';
  volume: number; // 0-100
}

export interface AutoStartSettings {
  autoStartBreaks: boolean;
  autoStartPomodoros: boolean;
  countdownSeconds: number; // 3-5 seconds
}

export interface AppSettings {
  sound: SoundSettings;
  autoStart: AutoStartSettings;
  notifications: boolean;
}

// Backend settings request format
interface BackendSettingsRequest {
  soundType?: 'BELL' | 'CHIME' | 'DIGITAL_BEEP' | 'SOFT_DING';
  notificationSound?: boolean;
  volume?: number;
  autoStartBreaks?: boolean;
  autoStartPomodoros?: boolean;
  notificationsEnabled?: boolean;
}

const DEFAULT_SETTINGS: AppSettings = {
  sound: {
    enabled: true,
    type: 'bell',
    volume: 70
  },
  autoStart: {
    autoStartBreaks: false,
    autoStartPomodoros: false,
    countdownSeconds: 3
  },
  notifications: true
};

// Map frontend sound type to backend enum
function toBackendSoundType(type: 'bell' | 'chime' | 'digital' | 'soft'): 'BELL' | 'CHIME' | 'DIGITAL_BEEP' | 'SOFT_DING' {
  const map: Record<string, 'BELL' | 'CHIME' | 'DIGITAL_BEEP' | 'SOFT_DING'> = {
    'bell': 'BELL',
    'chime': 'CHIME',
    'digital': 'DIGITAL_BEEP',
    'soft': 'SOFT_DING'
  };
  return map[type] || 'BELL';
}

@Injectable({
  providedIn: 'root'
})
export class SettingsService {
  private http = inject(HttpClient);
  
  // Only app settings (not tokens) are stored in localStorage
  private readonly STORAGE_KEY = 'pomodify_settings';
  
  // Signals for reactive state
  private settingsSignal = signal<AppSettings>(this.loadSettings());
  private isSavingSignal = signal<boolean>(false);
  
  constructor() {
    // Load settings from localStorage on init (only in browser)
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      this.settingsSignal.set(this.loadSettings());
    }
  }
  
  // Get current settings
  getSettings() {
    return this.settingsSignal();
  }
  
  // Get settings as signal (for reactive components)
  getSettingsSignal() {
    return this.settingsSignal.asReadonly();
  }
  
  // Get saving status signal
  getIsSavingSignal() {
    return this.isSavingSignal.asReadonly();
  }
  
  // Update sound settings
  updateSoundSettings(settings: Partial<SoundSettings>) {
    const current = this.settingsSignal();
    const updated = {
      ...current,
      sound: { ...current.sound, ...settings }
    };
    this.settingsSignal.set(updated);
    this.saveSettings(updated);
    
    // Sync with backend
    const backendPayload: BackendSettingsRequest = {};
    if (settings.type !== undefined) {
      backendPayload.soundType = toBackendSoundType(settings.type);
    }
    if (settings.enabled !== undefined) {
      backendPayload.notificationSound = settings.enabled;
    }
    if (settings.volume !== undefined) {
      backendPayload.volume = settings.volume;
    }
    this.syncWithBackend(backendPayload);
  }
  
  // Update auto-start settings
  updateAutoStartSettings(settings: Partial<AutoStartSettings>) {
    const current = this.settingsSignal();
    const updated = {
      ...current,
      autoStart: { ...current.autoStart, ...settings }
    };
    this.settingsSignal.set(updated);
    this.saveSettings(updated);
    
    // Sync with backend
    const backendPayload: BackendSettingsRequest = {};
    if (settings.autoStartBreaks !== undefined) {
      backendPayload.autoStartBreaks = settings.autoStartBreaks;
    }
    if (settings.autoStartPomodoros !== undefined) {
      backendPayload.autoStartPomodoros = settings.autoStartPomodoros;
    }
    this.syncWithBackend(backendPayload);
  }
  
  // Update general settings
  updateSettings(settings: Partial<AppSettings>) {
    const current = this.settingsSignal();
    const updated = { ...current, ...settings };
    this.settingsSignal.set(updated);
    this.saveSettings(updated);
    
    // Sync with backend
    const backendPayload: BackendSettingsRequest = {};
    if (settings.notifications !== undefined) {
      backendPayload.notificationsEnabled = settings.notifications;
    }
    if (settings.sound !== undefined) {
      if (settings.sound.type !== undefined) {
        backendPayload.soundType = toBackendSoundType(settings.sound.type);
      }
      if (settings.sound.enabled !== undefined) {
        backendPayload.notificationSound = settings.sound.enabled;
      }
      if (settings.sound.volume !== undefined) {
        backendPayload.volume = settings.sound.volume;
      }
    }
    if (settings.autoStart !== undefined) {
      if (settings.autoStart.autoStartBreaks !== undefined) {
        backendPayload.autoStartBreaks = settings.autoStart.autoStartBreaks;
      }
      if (settings.autoStart.autoStartPomodoros !== undefined) {
        backendPayload.autoStartPomodoros = settings.autoStart.autoStartPomodoros;
      }
    }
    this.syncWithBackend(backendPayload);
  }
  
  // Play notification sound
  // Keep a reference to prevent garbage collection during playback
  private currentAudio: HTMLAudioElement | null = null;
  
  playSound(type?: 'bell' | 'chime' | 'digital' | 'soft') {
    const settings = this.settingsSignal();
    if (!settings.sound.enabled) {
      Logger.log('Sound disabled in settings, skipping playback');
      return;
    }
    
    const soundType = type || settings.sound.type;
    const soundPath = `assets/sounds/${soundType}.wav`;
    
    Logger.log('🔊 Attempting to play sound:', soundType, 'from path:', soundPath);
    
    // Stop any currently playing sound
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio = null;
    }
    
    const audio = new Audio(soundPath);
    this.currentAudio = audio;
    audio.volume = settings.sound.volume / 100;
    
    Logger.log('🔊 Playing sound:', soundType, 'at volume:', audio.volume, '(', settings.sound.volume, '%)');
    
    audio.play()
      .then(() => {
        Logger.log('🔊 Sound started playing successfully:', soundType);
      })
      .catch(err => {
        Logger.warn('🔇 Could not play sound:', err);
        Logger.warn('🔇 This may be due to browser autoplay restrictions. User interaction may be required first.');
      });
    
    // Clean up reference after playback
    audio.onended = () => {
      Logger.log('🔊 Sound finished playing:', soundType);
      if (this.currentAudio === audio) {
        this.currentAudio = null;
      }
    };
  }
  

  
  // Reset to defaults
  resetToDefaults() {
    this.settingsSignal.set(DEFAULT_SETTINGS);
    this.saveSettings(DEFAULT_SETTINGS);
  }

  // Clear all session history
  clearSessionHistory(): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(API.SETTINGS.CLEAR_SESSIONS, { withCredentials: true });
  }

  // Clear all activity data
  clearActivityData(): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(API.SETTINGS.CLEAR_ACTIVITIES, { withCredentials: true });
  }
  
  // Private methods
  private loadSettings(): AppSettings {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      return DEFAULT_SETTINGS;
    }
    
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      
      if (stored) {
        const parsed = JSON.parse(stored);
        
        // Deep merge with defaults to handle new settings and nested objects
        const merged = {
          sound: { 
            enabled: parsed.sound?.enabled !== undefined ? parsed.sound.enabled : DEFAULT_SETTINGS.sound.enabled,
            type: parsed.sound?.type || DEFAULT_SETTINGS.sound.type,
            volume: parsed.sound?.volume !== undefined ? parsed.sound.volume : DEFAULT_SETTINGS.sound.volume
          },
          autoStart: { ...DEFAULT_SETTINGS.autoStart, ...parsed.autoStart },
          notifications: parsed.notifications !== undefined ? parsed.notifications : DEFAULT_SETTINGS.notifications
        };
        
        return merged;
      }
    } catch (error) {
      // Error loading settings - use defaults
    }
    
    return DEFAULT_SETTINGS;
  }
  
  private saveSettings(settings: AppSettings) {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      return;
    }
    
    this.isSavingSignal.set(true);
    
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(settings));
      Logger.log('Settings saved successfully:', settings);
    } catch (error) {
      // Error saving settings - silently handle
    } finally {
      // Simulate a brief saving delay for better UX
      setTimeout(() => {
        this.isSavingSignal.set(false);
      }, 200);
    }
  }
  
  /**
   * Sync settings with backend for push notification sound preferences
   * This ensures the backend knows the user's sound type for FCM notifications
   */
  private syncWithBackend(payload: BackendSettingsRequest): void {
    if (Object.keys(payload).length === 0) {
      return;
    }
    
    Logger.log('Syncing settings with backend:', payload);
    
    this.http.patch(API.SETTINGS.UPDATE, payload, { withCredentials: true }).subscribe({
      next: (response) => {
        Logger.log('Settings synced with backend:', response);
      },
      error: (error) => {
        Logger.warn('Failed to sync settings with backend:', error);
        // Don't show error to user - local settings still work
      }
    });
  }
}
