import { Globe } from 'lucide-react';
import { useTranslation } from '@/context/I18nContext';
import { cn } from '@/lib/utils';

export function LanguageSwitcher({ className }: { className?: string }) {
  const { locale, setLocale, supportedLocales, localeNames, t } = useTranslation();
  return <label className={cn('inline-flex items-center gap-2', className)}>
    <Globe className="h-4 w-4" aria-hidden="true" />
    <span className="sr-only">{t('common.language')}</span>
    <select value={locale} onChange={event => {
      const selected = supportedLocales.find(value => value === event.target.value);
      if (selected) setLocale(selected);
    }} className="min-h-11 rounded border border-border bg-background text-foreground px-2 py-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">
      {supportedLocales.map(value => <option key={value} value={value}>{localeNames[value]}</option>)}
    </select>
  </label>;
}
