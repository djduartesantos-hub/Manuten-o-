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
      '--dash-bg': '#f1f5f9',
      '--dash-accent': '#38bdf8',
      '--dash-accent-2': '#fef9c3',
      '--dash-ink': '#334155',
      '--dash-muted': '#64748b',
      '--dash-panel': 'rgba(255,255,255,0.98)',
      '--dash-panel-2': 'rgba(248,250,252,0.98)',
      '--dash-border': 'rgba(148,163,184,0.18)',
      '--dash-surface': '#f8fafc',
      '--dash-surface-2': '#f1f5f9',
    },
  },
  dark: {
    name: 'dark',
    variables: {
      '--dash-bg': '#0b1220',
      '--dash-accent': '#38bdf8',
      '--dash-accent-2': '#0f766e',
      '--dash-ink': '#f8fafc',
      '--dash-muted': '#cbd5e1',
      '--dash-panel': 'rgba(30,41,59,0.98)',
      '--dash-panel-2': 'rgba(51,65,85,0.98)',
      '--dash-border': 'rgba(148,163,184,0.35)',
      '--dash-surface': '#1e293b',
      '--dash-surface-2': '#334155',
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
