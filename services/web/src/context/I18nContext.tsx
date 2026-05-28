import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import es from '../locales/es.json';
import en from '../locales/en.json';
import pt from '../locales/pt.json';

type Locale = 'es' | 'en' | 'pt';

interface LocaleConfig {
  default: Locale;
  supported: Locale[];
}

const LOCALE_CONFIG: LocaleConfig = {
  default: 'es',
  supported: ['es', 'en', 'pt'],
};

const translations: Record<Locale, typeof es> = { es, en, pt };

interface I18nContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string) => string;
  supportedLocales: Locale[];
  localeNames: Record<Locale, string>;
}

const I18nContext = createContext<I18nContextType | null>(null);

function getNestedValue(obj: Record<string, any>, path: string): string | undefined {
  return path.split('.').reduce((acc, part) => acc?.[part], obj);
}

function detectLocale(): Locale {
  const stored = localStorage.getItem('keledon-locale') as Locale;
  if (stored && LOCALE_CONFIG.supported.includes(stored)) {
    return stored;
  }

  const browserLang = navigator.language.split('-')[0] as Locale;
  if (LOCALE_CONFIG.supported.includes(browserLang)) {
    return browserLang;
  }

  return LOCALE_CONFIG.default;
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(detectLocale);

  const setLocale = (newLocale: Locale) => {
    if (LOCALE_CONFIG.supported.includes(newLocale)) {
      setLocaleState(newLocale);
      localStorage.setItem('keledon-locale', newLocale);
    }
  };

  const t = (key: string): string => {
    const value = getNestedValue(translations[locale], key);
    if (value !== undefined) return value;
    
    const fallback = getNestedValue(translations[LOCALE_CONFIG.default], key);
    if (fallback !== undefined) return fallback;
    
    const enFallback = getNestedValue(translations['en'], key);
    if (enFallback !== undefined) return enFallback;
    
    console.warn(`[i18n] Missing translation: ${key}`);
    return key;
  };

  const localeNames: Record<Locale, string> = {
    es: 'Español',
    en: 'English',
    pt: 'Português',
  };

  return (
    <I18nContext.Provider value={{ locale, setLocale, t, supportedLocales: LOCALE_CONFIG.supported, localeNames }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useTranslation() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useTranslation must be used within I18nProvider');
  }
  return context;
}

export type { Locale };
