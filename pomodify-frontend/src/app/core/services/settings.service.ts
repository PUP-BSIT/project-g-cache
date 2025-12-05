import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { catchError, tap, of, firstValueFrom } from 'rxjs';

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
  calendarSync: boolean;
  theme?: 'LIGHT' | 'DARK';
}

// Backend API response structure
interface UserSettingsResponse {
  userId: number;
  soundType: string;
  notificationSound: boolean;
  volume: number;
  tickSound: boolean;
  autoStartBreaks: boolean;
  autoStartPomodoros: boolean;
  theme: string;
  notificationsEnabled: boolean;
  googleCalendarSync: boolean;
}

// Backend API request structure
interface UpdateSettingsRequest {
  soundType?: string;
  notificationSound?: boolean;
  volume?: number;
  tickSound?: boolean;
  autoStartBreaks?: boolean;
  autoStartPomodoros?: boolean;
  theme?: string;
  notificationsEnabled?: boolean;
  googleCalendarSync?: boolean;
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
  notifications: true,
  calendarSync: false,
  theme: 'LIGHT'
};

@Injectable({
  providedIn: 'root'
})
export class SettingsService {
  private readonly API_URL = `${environment.apiUrl}/settings`;
  private http = inject(HttpClient);
  
  // Signals for reactive state
  private settingsSignal = signal<AppSettings>(DEFAULT_SETTINGS);
  private isLoadingSignal = signal<boolean>(false);
  private errorSignal = signal<string | null>(null);
  
  constructor() {
    // Load settings from API on init
    this.loadSettingsFromAPI();
  }
  
  // Get current settings
  getSettings() {
    return this.settingsSignal();
  }
  
  // Get settings as signal (for reactive components)
  getSettingsSignal() {
    return this.settingsSignal.asReadonly();
  }

  // Get loading state
  isLoading() {
    return this.isLoadingSignal();
  }

  // Get error state
  getError() {
    return this.errorSignal();
  }

  // Load settings from API
  async loadSettingsFromAPI(): Promise<void> {
    this.isLoadingSignal.set(true);
    this.errorSignal.set(null);

    try {
      await firstValueFrom(
        this.http.get<UserSettingsResponse>(this.API_URL).pipe(
          tap(apiSettings => {
            const appSettings = this.mapApiToAppSettings(apiSettings);
            this.settingsSignal.set(appSettings);
          }),
          catchError(error => {
            console.warn('Failed to load settings from API, using defaults:', error);
            this.errorSignal.set('Failed to load settings from server');
            return of(null);
          })
        )
      );
    } finally {
      this.isLoadingSignal.set(false);
    }
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
  
  // Play tick sound (for timer)
  playTickSound() {
    const settings = this.settingsSignal();
    if (!settings.sound.enabled || !settings.sound.tickSound) return;
    
    const audio = new Audio('assets/sounds/tick.wav');
    audio.volume = (settings.sound.volume / 100) * 0.3; // Quieter than notification
    audio.play().catch(err => console.warn('Could not play tick:', err));
  }
  
  // Reset to defaults
  async resetToDefaults() {
    this.settingsSignal.set(DEFAULT_SETTINGS);
    await this.saveSettingsToAPI(DEFAULT_SETTINGS);
  }
  
  // Private methods
  private async saveSettings(settings: AppSettings) {
    // Save directly to API only
    await this.saveSettingsToAPI(settings);
  }

  private async saveSettingsToAPI(settings: AppSettings): Promise<void> {
    this.errorSignal.set(null);

    try {
      const request = this.mapAppToApiSettings(settings);
      await firstValueFrom(
        this.http.patch<UserSettingsResponse>(this.API_URL, request).pipe(
          tap(() => {
            console.log('Settings saved to API successfully');
          }),
          catchError(error => {
            console.warn('Failed to save settings to API:', error);
            this.errorSignal.set('Failed to save settings to server');
            return of(null);
          })
        )
      );
    } catch (error) {
      console.error('Error in saveSettingsToAPI:', error);
    }
  }

  // Map API response to AppSettings
  private mapApiToAppSettings(api: UserSettingsResponse): AppSettings {
    return {
      sound: {
        enabled: api.notificationSound,
        type: this.mapSoundType(api.soundType),
        volume: api.volume,
        tickSound: api.tickSound
      },
      autoStart: {
        autoStartBreaks: api.autoStartBreaks,
        autoStartPomodoros: api.autoStartPomodoros,
        countdownSeconds: 3 // Default, not stored in backend
      },
      notifications: api.notificationsEnabled,
      calendarSync: api.googleCalendarSync,
      theme: api.theme as 'LIGHT' | 'DARK'
    };
  }

  // Map AppSettings to API request
  private mapAppToApiSettings(app: AppSettings): UpdateSettingsRequest {
    return {
      soundType: this.mapSoundTypeToApi(app.sound.type),
      notificationSound: app.sound.enabled,
      volume: app.sound.volume,
      tickSound: app.sound.tickSound,
      autoStartBreaks: app.autoStart.autoStartBreaks,
      autoStartPomodoros: app.autoStart.autoStartPomodoros,
      theme: app.theme,
      notificationsEnabled: app.notifications,
      googleCalendarSync: app.calendarSync
    };
  }

  // Map backend sound type to frontend
  private mapSoundType(apiType: string): 'bell' | 'chime' | 'digital' | 'soft' {
    const mapping: Record<string, 'bell' | 'chime' | 'digital' | 'soft'> = {
      'BELL': 'bell',
      'CHYME': 'chime',
      'DIGITAL_BEEP': 'digital',
      'SOFT_DING': 'soft'
    };
    return mapping[apiType] || 'bell';
  }

  // Map frontend sound type to backend
  private mapSoundTypeToApi(type: 'bell' | 'chime' | 'digital' | 'soft'): string {
    const mapping: Record<string, string> = {
      'bell': 'BELL',
      'chime': 'CHYME',
      'digital': 'DIGITAL_BEEP',
      'soft': 'SOFT_DING'
    };
    return mapping[type] || 'BELL';
  }
}
