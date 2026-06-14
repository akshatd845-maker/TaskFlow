import { createContext, useContext, useEffect, useMemo, useState } from 'react';

const ThemeContext = createContext(null);

const THEME_STORAGE_KEY = 'taskflow-theme';

function getSystemTheme() {
  if (typeof window === 'undefined' || !window.matchMedia) return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function getInitialTheme() {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === 'light' || stored === 'dark') return stored;
  } catch (_) {
    // ignore
  }
  return getSystemTheme();
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(getInitialTheme);

  useEffect(() => {
    // Apply theme
    const root = document.documentElement;
    if (theme === 'dark') root.classList.add('dark');
    else root.classList.remove('dark');

    // Persist
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch (_) {
      // ignore
    }
  }, [theme]);

  useEffect(() => {
    // If user hasn't explicitly chosen a theme, follow system changes.
    let mql;
    try {
      mql = window.matchMedia('(prefers-color-scheme: dark)');
    } catch (_) {
      return;
    }

    const stored = (() => {
      try {
        return localStorage.getItem(THEME_STORAGE_KEY);
      } catch (_) {
        return null;
      }
    })();

    if (stored === 'light' || stored === 'dark') {
      return; // user preference overrides system
    }

    const onChange = () => {
      setTheme(getSystemTheme());
    };

    // Safari older support
    if (mql.addEventListener) mql.addEventListener('change', onChange);
    else mql.addListener(onChange);

    return () => {
      if (mql.removeEventListener) mql.removeEventListener('change', onChange);
      else mql.removeListener(onChange);
    };
  }, []);

  const value = useMemo(() => {
    const toggleTheme = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'));
    const setAppTheme = (next) => {
      if (next !== 'light' && next !== 'dark') return;
      setTheme(next);
    };

    return {
      theme,
      toggleTheme,
      setTheme: setAppTheme,
    };
  }, [theme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}

