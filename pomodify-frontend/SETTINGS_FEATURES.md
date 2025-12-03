# New Settings Features

This document explains the newly implemented settings features in Pomodify.

## 🔊 Sound Settings

### Features:
1. **Notification Sound Toggle** - Enable/disable sounds when timer completes
2. **Sound Type Selector** - Choose from 4 different notification sounds:
   - Bell
   - Chime
   - Digital Beep
   - Soft Ding
3. **Volume Control** - Adjust sound volume from 0-100%
4. **Tick Sound** - Optional ticking sound while timer is running
5. **Test Button** - Preview sounds before saving

### How It Works:
- All settings are saved to `localStorage` automatically
- Settings persist across browser sessions
- Sound files are loaded from `/assets/sounds/`

### Usage:
```typescript
// In your timer component, play sound when timer completes:
import { SettingsService } from './core/services/settings.service';

constructor(private settingsService: SettingsService) {}

onTimerComplete() {
  this.settingsService.playSound(); // Uses user's selected sound type
}

// Play tick sound every second (optional):
onTimerTick() {
  this.settingsService.playTickSound();
}
```

---

## ▶️ Auto-Start Options

### Features:
1. **Auto-start Breaks** - Automatically start break timer after pomodoro completes
2. **Auto-start Pomodoros** - Automatically start next pomodoro after break ends
3. **3-Second Countdown** - Shows countdown before auto-start (with cancel option)

### How It Works:
- When enabled, timer automatically transitions to next phase
- User sees a countdown notification: "Starting break in 3... 2... 1..."
- User can cancel auto-start during countdown
- Settings are saved to `localStorage`

### Usage:
```typescript
// In your timer component:
import { SettingsService } from './core/services/settings.service';

constructor(private settingsService: SettingsService) {}

onPomodoroComplete() {
  const settings = this.settingsService.getSettings();
  
  if (settings.autoStart.autoStartBreaks) {
    // Show countdown
    this.showCountdown(3, () => {
      this.startBreak();
    });
  } else {
    // Show manual start button
    this.showBreakPrompt();
  }
}

showCountdown(seconds: number, callback: () => void) {
  let remaining = seconds;
  const interval = setInterval(() => {
    if (remaining > 0) {
      console.log(`Starting in ${remaining}...`);
      remaining--;
    } else {
      clearInterval(interval);
      callback();
    }
  }, 1000);
}
```

---

## 📦 Settings Service API

### Methods:

#### Get Settings
```typescript
// Get current settings
const settings = settingsService.getSettings();

// Get settings as reactive signal
const settings$ = settingsService.getSettingsSignal();
```

#### Update Settings
```typescript
// Update sound settings
settingsService.updateSoundSettings({
  enabled: true,
  type: 'bell',
  volume: 80
});

// Update auto-start settings
settingsService.updateAutoStartSettings({
  autoStartBreaks: true,
  autoStartPomodoros: false
});

// Update general settings
settingsService.updateSettings({
  notifications: true,
  calendarSync: false
});
```

#### Play Sounds
```typescript
// Play notification sound (uses user's selected type)
settingsService.playSound();

// Play specific sound type
settingsService.playSound('chime');

// Play tick sound
settingsService.playTickSound();
```

#### Reset Settings
```typescript
// Reset all settings to defaults
settingsService.resetToDefaults();
```

---

## 🎨 UI Components

### Toggle Switch
```html
<div class="toggle-switch">
  <input type="checkbox" id="my-toggle" class="toggle-input" 
         [checked]="mySignal()" 
         (change)="toggleMySetting()">
  <label for="my-toggle" class="toggle-label"></label>
</div>
```

### Dropdown Select
```html
<select class="sound-select" [value]="soundType()" (change)="onSoundTypeChange($event)">
  <option value="bell">Bell</option>
  <option value="chime">Chime</option>
</select>
```

### Volume Slider
```html
<input type="range" min="0" max="100" 
       [value]="volume()" 
       (input)="onVolumeChange($event)" 
       class="volume-slider">
```

### Info Box
```html
<div class="info-box">
  <i class="fa-solid fa-info-circle"></i>
  <p>Your helpful message here</p>
</div>
```

---

## 🔧 Setup Instructions

### 1. Add Sound Files
Place MP3 files in `/public/assets/sounds/`:
- `bell.mp3`
- `chime.mp3`
- `digital.mp3`
- `soft.mp3`
- `tick.mp3` (optional)

See `/public/assets/sounds/README.md` for where to get free sound files.

### 2. Import Settings Service
```typescript
import { SettingsService } from './core/services/settings.service';
```

### 3. Use in Components
```typescript
constructor(private settingsService: SettingsService) {}

ngOnInit() {
  const settings = this.settingsService.getSettings();
  console.log('User settings:', settings);
}
```

---

## 📱 Responsive Design

All settings UI components are fully responsive:
- Desktop: Side-by-side layout
- Tablet: Adjusted spacing
- Mobile: Stacked layout

---

## 🐛 Troubleshooting

### Sound not playing?
1. Check if sound files exist in `/public/assets/sounds/`
2. Check browser console for errors
3. Verify sound is enabled in settings
4. Check volume is not 0%

### Settings not saving?
1. Check browser localStorage is enabled
2. Check browser console for errors
3. Try clearing localStorage and reloading

### Auto-start not working?
1. Verify toggle is enabled in settings
2. Check timer completion logic calls the service
3. Verify countdown logic is implemented

---

## 🚀 Future Enhancements

Potential additions:
- Custom sound upload
- Different sounds for different timer types
- Sound themes/packs
- Vibration support for mobile
- Do Not Disturb schedule
- Per-activity sound settings

---

## 📝 Notes

- All settings are stored in `localStorage` with key `pomodify_settings`
- Settings are automatically loaded on app init
- Service uses Angular signals for reactive state management
- Sound playback uses Web Audio API
- Compatible with all modern browsers

---

For questions or issues, contact the development team.
