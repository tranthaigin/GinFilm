import { useEffect } from 'react';

/**
 * Light mode hook — Syncs the dark mode state with the global HTML document.
 * 
 * When transitioning from the User layout (which may force dark mode) to the 
 * Admin/Staff layout (which respects useThemeStore), we need to ensure the 
 * global 'dark' class on <html> is properly synced. Otherwise, Tailwind v4 
 * will keep applying dark utilities to admin-light-mode elements.
 */
export function useLightModeStyle(_isDarkMode) {
  useEffect(() => {
    if (_isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [_isDarkMode]);
}

/** No-op kept for backward compat if any component imports this */
export function applyLightStylesToRoot() {}
