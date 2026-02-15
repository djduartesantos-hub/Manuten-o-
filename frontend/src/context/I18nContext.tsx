import React from 'react';
import { defaultLocale, translations, type Locale } from '../i18n/translations';

const STORAGE_KEY = 'cmms:locale';

type I18nContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
};

const I18nContext = React.createContext<I18nContextValue | null>(null);

function resolveInitialLocale(): Locale {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === 'pt' || stored === 'en' || stored === 'es') return stored;

  const language = navigator.language.toLowerCase();
  if (language.startsWith('es')) return 'es';
  if (language.startsWith('en')) return 'en';
  return defaultLocale;
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = React.useState<Locale>(resolveInitialLocale);

  const setLocale = React.useCallback((next: Locale) => {
    setLocaleState(next);
    localStorage.setItem(STORAGE_KEY, next);
  }, []);

  const t = React.useCallback(
    (key: string, vars?: Record<string, string | number>) => {
      const table = translations[locale] || translations[defaultLocale];
      const fallback = translations[defaultLocale];
      const raw = table[key] || fallback[key] || key;

      if (!vars) return raw;
      return Object.keys(vars).reduce((acc, varKey) => {
        return acc.replace(new RegExp(`\\{\\{${varKey}\\}\\}`, 'g'), String(vars[varKey]));
      }, raw);
    },
    [locale],
  );

  const value = React.useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = React.useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within I18nProvider');
  }
  return context;
}
