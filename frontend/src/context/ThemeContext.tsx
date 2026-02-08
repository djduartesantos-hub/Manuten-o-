import React, { createContext, useContext, useState, ReactNode } from 'react';

export type ThemeName = 'dashboard' | 'light';

export interface Theme {
  name: ThemeName;
  variables: Record<string, string>;
}

const themes: Record<ThemeName, Theme> = {
  dashboard: {
    name: 'dashboard',
    variables: {
      '--dash-accent': '#0f766e',
      '--dash-accent-2': '#f59e0b',
      '--dash-ink': '#0f172a',
      '--dash-muted': '#475569',
      '--dash-panel': 'rgba(255,255,255,0.9)',
      '--dash-panel-2': 'rgba(248,250,252,0.9)',
      '--dash-border': 'rgba(148,163,184,0.35)',
      '--dash-surface': '#f1f5f9',
      '--dash-surface-2': '#e2e8f0',
    },
  },
  light: {
    name: 'light',
    variables: {
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
};

interface ThemeContextValue {
  theme: Theme;
  setTheme: (name: ThemeName) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [themeName, setThemeName] = useState<ThemeName>('dashboard');

  React.useEffect(() => {
    const theme = themes[themeName];
    Object.entries(theme.variables).forEach(([key, value]) => {
      document.documentElement.style.setProperty(key, value);
    });
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
