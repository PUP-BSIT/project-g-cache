// Simple global theme utility for light/dark mode
// Usage:
//  - initTheme() early in app bootstrap (main.ts)
//  - call toggleTheme() from any page header button
//  - setTheme('light'|'dark') when you need explicit value

const THEME_KEY = 'theme';

type Theme = 'light' | 'dark';

export function getStoredTheme(): Theme {
  const saved = localStorage.getItem(THEME_KEY);
  return saved === 'dark' ? 'dark' : 'light';
}

export function applyTheme(theme: Theme) {
  const isDark = theme === 'dark';
  document.documentElement.classList.toggle('theme-dark', isDark);
}

export function initTheme() {
  try {
    const theme = getStoredTheme();
    applyTheme(theme);
  } catch {
    // noop
  }
}

export function setTheme(theme: Theme) {
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {/* ignore */}
  applyTheme(theme);
}

export function toggleTheme() {
  const next: Theme = document.documentElement.classList.contains('theme-dark') ? 'light' : 'dark';
  setTheme(next);
}
