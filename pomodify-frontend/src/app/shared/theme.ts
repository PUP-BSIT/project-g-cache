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

export function applyTheme(theme: Theme): void {
  const isDark = theme === 'dark';
  
  // Check if we're on a public page (landing, login, signup)
  const currentPath = window.location.pathname;
  const isPublicPage = currentPath === '/' || 
                      currentPath === '/login' || 
                      currentPath === '/signup' ||
                      currentPath.startsWith('/landing');
  
  // If on public page, NEVER apply dark theme
  if (isPublicPage) {
    document.documentElement.classList.remove('theme-dark');
    document.documentElement.classList.remove('theme-transitioning');
    return;
  }
  
  // Add transition class for smooth theme switching (authenticated pages only)
  document.documentElement.classList.add('theme-transitioning');
  
  // Apply the theme (authenticated pages only)
  document.documentElement.classList.toggle('theme-dark', isDark);
  
  // Remove transition class after animation completes
  setTimeout(() => {
    document.documentElement.classList.remove('theme-transitioning');
  }, 300);
}

export function initTheme(): void {
  try {
    // Check if we're on a public page
    const currentPath = window.location.pathname;
    const isPublicPage = currentPath === '/' || 
                        currentPath === '/login' || 
                        currentPath === '/signup' ||
                        currentPath.startsWith('/landing');
    
    if (isPublicPage) {
      // Force remove any theme classes from public pages
      document.documentElement.classList.remove('theme-dark');
      document.documentElement.classList.remove('theme-transitioning');
      return;
    }
    
    // Apply theme only for authenticated pages
    const theme = getStoredTheme();
    applyTheme(theme);
  } catch {
    // noop
  }
}

export function setTheme(theme: Theme): void {
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {/* ignore */}
  applyTheme(theme);
}

export function toggleTheme(): void {
  const next: Theme = document.documentElement.classList.contains('theme-dark') ? 'light' : 'dark';
  setTheme(next);
}

// Force public pages to always be light theme
export function ensurePublicPageLightTheme(): void {
  const currentPath = window.location.pathname;
  const isPublicPage = currentPath === '/' || 
                      currentPath === '/login' || 
                      currentPath === '/signup' ||
                      currentPath.startsWith('/landing');
  
  if (isPublicPage) {
    document.documentElement.classList.remove('theme-dark');
    document.documentElement.classList.remove('theme-transitioning');
  }
}
