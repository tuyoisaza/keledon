import { useEffect, useState, type ReactNode } from 'react';
import es from '../locales/es.json';
import en from '../locales/en.json';
import pt from '../locales/pt.json';
import { I18nContext, type Locale } from './i18n-context';

interface LocaleConfig {
  default: Locale;
  supported: Locale[];
}
const LOCALE_CONFIG: LocaleConfig = {
  default: 'es',
  supported: ['es', 'en', 'pt'],
};

const translations: Record<Locale, typeof es> = { es, en, pt };

function getNestedValue(obj: unknown, key: string): string | undefined {
  let value: unknown = obj;
  for (const part of key.split('.')) {
    if (!value || typeof value !== 'object') return undefined;
    value = (value as Record<string, unknown>)[part];
  }
  return typeof value === 'string' ? value : undefined;
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

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

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
