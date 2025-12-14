import { Injectable, signal } from '@angular/core';

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
  calendarSync: boolean;
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
  notifications: true,
  calendarSync: false
};

@Injectable({
  providedIn: 'root'
})
export class SettingsService {
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
  playSound(type?: 'bell' | 'chime' | 'digital' | 'soft') {
    const settings = this.settingsSignal();
    if (!settings.sound.enabled) return;
    
    const soundType = type || settings.sound.type;
    const audio = new Audio(`assets/sounds/${soundType}.wav`);
    audio.volume = settings.sound.volume / 100;
    console.log('Playing sound:', soundType, 'at volume:', audio.volume, '(', settings.sound.volume, '%)');
    audio.play().catch(err => console.warn('Could not play sound:', err));
  }
  

  
  // Reset to defaults
  resetToDefaults() {
    this.settingsSignal.set(DEFAULT_SETTINGS);
    this.saveSettings(DEFAULT_SETTINGS);
  }
  
  // Private methods
  private loadSettings(): AppSettings {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      console.log('Window or localStorage not available, using defaults');
      return DEFAULT_SETTINGS;
    }
    
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      console.log('Raw stored settings:', stored);
      
      if (stored) {
        const parsed = JSON.parse(stored);
        console.log('Parsed stored settings:', parsed);
        
        // Deep merge with defaults to handle new settings and nested objects
        const merged = {
          sound: { 
            enabled: parsed.sound?.enabled !== undefined ? parsed.sound.enabled : DEFAULT_SETTINGS.sound.enabled,
            type: parsed.sound?.type || DEFAULT_SETTINGS.sound.type,
            volume: parsed.sound?.volume !== undefined ? parsed.sound.volume : DEFAULT_SETTINGS.sound.volume
          },
          autoStart: { ...DEFAULT_SETTINGS.autoStart, ...parsed.autoStart },
          notifications: parsed.notifications !== undefined ? parsed.notifications : DEFAULT_SETTINGS.notifications,
          calendarSync: parsed.calendarSync !== undefined ? parsed.calendarSync : DEFAULT_SETTINGS.calendarSync
        };
        
        console.log('Merged settings result:', merged);
        return merged;
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
    
    console.log('No stored settings found, using defaults');
    return DEFAULT_SETTINGS;
  }
  
  private saveSettings(settings: AppSettings) {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      return;
    }
    
    this.isSavingSignal.set(true);
    
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(settings));
      console.log('Settings saved successfully:', settings);
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
