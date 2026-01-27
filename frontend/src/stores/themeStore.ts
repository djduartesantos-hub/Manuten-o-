import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ThemeSettings {
  theme: 'light' | 'dark' | 'system';
  accentColor: string;
  fontFamily: 'system' | 'inter' | 'roboto';
  fontSize: 'small' | 'normal' | 'large';
  compactMode: boolean;
}

interface ThemeStore {
  settings: ThemeSettings;
  isDarkMode: boolean;
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  setAccentColor: (color: string) => void;
  setFontFamily: (family: 'system' | 'inter' | 'roboto') => void;
  setFontSize: (size: 'small' | 'normal' | 'large') => void;
  setCompactMode: (compact: boolean) => void;
  updateSettings: (settings: Partial<ThemeSettings>) => void;
  toggleTheme: () => void;
  applyThemeToDOM: () => void;
}

const getSystemTheme = (): 'light' | 'dark' => {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
};

const getEffectiveTheme = (theme: 'light' | 'dark' | 'system'): 'light' | 'dark' => {
  return theme === 'system' ? getSystemTheme() : theme;
};

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set, get) => ({
      settings: {
        theme: 'system',
        accentColor: '#3B82F6',
        fontFamily: 'system',
        fontSize: 'normal',
        compactMode: false,
      },
      isDarkMode: false,

      setTheme: (theme) => {
        set((state) => ({
          settings: { ...state.settings, theme },
          isDarkMode: getEffectiveTheme(theme) === 'dark',
        }));
        get().applyThemeToDOM();
      },

      setAccentColor: (color) => {
        set((state) => ({
          settings: { ...state.settings, accentColor: color },
        }));
        get().applyThemeToDOM();
      },

      setFontFamily: (family) => {
        set((state) => ({
          settings: { ...state.settings, fontFamily: family },
        }));
        get().applyThemeToDOM();
      },

      setFontSize: (size) => {
        set((state) => ({
          settings: { ...state.settings, fontSize: size },
        }));
        get().applyThemeToDOM();
      },

      setCompactMode: (compact) => {
        set((state) => ({
          settings: { ...state.settings, compactMode: compact },
        }));
        get().applyThemeToDOM();
      },

      updateSettings: (newSettings) => {
        set((state) => {
          const updated = { ...state.settings, ...newSettings };
          return {
            settings: updated,
            isDarkMode: getEffectiveTheme(updated.theme) === 'dark',
          };
        });
        get().applyThemeToDOM();
      },

      toggleTheme: () => {
        set((state) => {
          const currentTheme = getEffectiveTheme(state.settings.theme);
          const newTheme = currentTheme === 'light' ? 'dark' : 'light';
          return {
            settings: { ...state.settings, theme: newTheme },
            isDarkMode: newTheme === 'dark',
          };
        });
        get().applyThemeToDOM();
      },

      applyThemeToDOM: () => {
        const { settings } = get();
        const effectiveTheme = getEffectiveTheme(settings.theme);
        const root = document.documentElement;

        // Apply theme
        if (effectiveTheme === 'dark') {
          root.classList.add('dark');
        } else {
          root.classList.remove('dark');
        }

        // Apply accent color
        root.style.setProperty('--accent-color', settings.accentColor);

        // Apply font family
        const fontMap = {
          system: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          inter: '"Inter", sans-serif',
          roboto: '"Roboto", sans-serif',
        };
        root.style.setProperty('--font-family', fontMap[settings.fontFamily]);

        // Apply font size scale
        const fontSizeScale = {
          small: '0.9',
          normal: '1',
          large: '1.1',
        };
        root.style.setProperty(
          '--font-size-scale',
          fontSizeScale[settings.fontSize]
        );

        // Apply compact mode
        if (settings.compactMode) {
          root.classList.add('compact-mode');
        } else {
          root.classList.remove('compact-mode');
        }

        // Sync with localStorage
        localStorage.setItem('theme-settings', JSON.stringify(settings));
      },
    }),
    {
      name: 'theme-store',
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.isDarkMode = getEffectiveTheme(state.settings.theme) === 'dark';
          setTimeout(() => state.applyThemeToDOM(), 0);
        }
      },
    }
  )
);
