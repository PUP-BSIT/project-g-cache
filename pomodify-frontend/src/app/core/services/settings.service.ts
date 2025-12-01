import { Injectable, signal } from '@angular/core';

export interface SoundSettings {
  enabled: boolean;
  type: 'bell' | 'chime' | 'digital' | 'soft';
  volume: number; // 0-100
  tickSound: boolean;
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
    volume: 70,
    tickSound: false
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
  private readonly STORAGE_KEY = 'pomodify_settings';
  
  // Signals for reactive state
  private settingsSignal = signal<AppSettings>(this.loadSettings());
  
  constructor() {
    // Load settings from localStorage on init (only in browser)
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      this.settingsSignal.set(this.loadSettings());
    }
  }
  
  getSettings() {
    return this.settingsSignal();
  }
  
  // Get settings as signal (for reactive components)
  getSettingsSignal() {
    return this.settingsSignal.asReadonly();
  }
  
  updateSoundSettings(settings: Partial<SoundSettings>) {
    const current = this.settingsSignal();
    const updated = {
      ...current,
      sound: { ...current.sound, ...settings }
    };
    this.settingsSignal.set(updated);
    this.saveSettings(updated);
  }
  
  updateAutoStartSettings(settings: Partial<AutoStartSettings>) {
    const current = this.settingsSignal();
    const updated = {
      ...current,
      autoStart: { ...current.autoStart, ...settings }
    };
    this.settingsSignal.set(updated);
    this.saveSettings(updated);
  }

  updateSettings(settings: Partial<AppSettings>) {
    const current = this.settingsSignal();
    const updated = { ...current, ...settings };
    this.settingsSignal.set(updated);
    this.saveSettings(updated);
  }
  
  playSound(type?: 'bell' | 'chime' | 'digital' | 'soft') {
    const settings = this.settingsSignal();
    if (!settings.sound.enabled) return;
    
    const soundType = type || settings.sound.type;
    const audio = new Audio(`assets/sounds/${soundType}.wav`);
    audio.volume = settings.sound.volume / 100;
    console.log('Playing sound:', soundType, 'at volume:', audio.volume, '(', settings.sound.volume, '%)');
    audio.play().catch(err => console.warn('Could not play sound:', err));
  }
  
  playTickSound() {
    const settings = this.settingsSignal();
    if (!settings.sound.enabled || !settings.sound.tickSound) return;
    
    const audio = new Audio('assets/sounds/tick.wav');
    audio.volume = (settings.sound.volume / 100) * 0.3; // Quieter than notification
    audio.play().catch(err => console.warn('Could not play tick:', err));
  }
  
  // Reset to defaults
  resetToDefaults() {
    this.settingsSignal.set(DEFAULT_SETTINGS);
    this.saveSettings(DEFAULT_SETTINGS);
  }
  
  private loadSettings(): AppSettings {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      return DEFAULT_SETTINGS;
    }
    
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Merge with defaults to handle new settings
        return { ...DEFAULT_SETTINGS, ...parsed };
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
    
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(settings));
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  }
}
