import { createContext } from 'react';

export type Locale = 'es' | 'en' | 'pt';

export interface I18nContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string) => string;
  supportedLocales: Locale[];
  localeNames: Record<Locale, string>;
}

export const I18nContext = createContext<I18nContextType | null>(null);
