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
  }
  
  // Update general settings
  updateSettings(settings: Partial<AppSettings>) {
    const current = this.settingsSignal();
    const updated = { ...current, ...settings };
    this.settingsSignal.set(updated);
    this.saveSettings(updated);
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
      console.error('Error loading settings:', error);
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
      console.error('Error saving settings:', error);
    } finally {
      // Simulate a brief saving delay for better UX
      setTimeout(() => {
        this.isSavingSignal.set(false);
      }, 200);
    }
  }
}
