import React, { createContext, useContext, useState, ReactNode } from 'react';

export type ThemeName = 'light' | 'dark';

export interface Theme {
  name: ThemeName;
  variables: Record<string, string>;
}

const themes: Record<ThemeName, Theme> = {
  light: {
    name: 'light',
    variables: {
      '--dash-bg': '#f2f4f7',
      '--dash-accent': '#14b8a6',
      '--dash-accent-2': '#f59e0b',
      '--dash-ink': '#1f2937',
      '--dash-muted': '#5b6471',
      '--dash-panel': 'rgba(255,255,255,0.92)',
      '--dash-panel-2': 'rgba(244,247,251,0.92)',
      '--dash-border': 'rgba(100,116,139,0.2)',
      '--dash-surface': '#f8fafc',
      '--dash-surface-2': '#eef2f7',
    },
  },
  dark: {
    name: 'dark',
    variables: {
      '--dash-bg': '#0c1116',
      '--dash-accent': '#2dd4bf',
      '--dash-accent-2': '#f59e0b',
      '--dash-ink': '#e5e7eb',
      '--dash-muted': '#9aa4b2',
      '--dash-panel': 'rgba(17,24,39,0.92)',
      '--dash-panel-2': 'rgba(24,32,45,0.95)',
      '--dash-border': 'rgba(148,163,184,0.25)',
      '--dash-surface': '#121826',
      '--dash-surface-2': '#1b2433',
    },
  },
};

interface ThemeContextValue {
  theme: Theme;
  setTheme: (name: ThemeName) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [themeName, setThemeName] = useState<ThemeName>(() => {
    if (typeof window === 'undefined') return 'light';
    const stored = window.localStorage.getItem('theme');
    if (stored === 'light' || stored === 'dark') return stored;
    const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)')?.matches;
    return prefersDark ? 'dark' : 'light';
  });

  React.useEffect(() => {
    const theme = themes[themeName];
    Object.entries(theme.variables).forEach(([key, value]) => {
      document.documentElement.style.setProperty(key, value);
    });

    // Keep compatibility with Tailwind dark variants / global CSS
    document.documentElement.classList.toggle('dark', themeName === 'dark');

    try {
      window.localStorage.setItem('theme', themeName);
    } catch {
      // ignore
    }
  }, [themeName]);

  const value: ThemeContextValue = {
    theme: themes[themeName],
    setTheme: setThemeName,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
