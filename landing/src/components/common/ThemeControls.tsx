import { useEffect, useState } from 'react';
import { useTranslation } from '@/context/useTranslation';

type Theme = 'dark' | 'light' | 'corporate';
const themes: Theme[] = ['dark', 'light', 'corporate'];
function readTheme(): Theme {
  try {
    const value = localStorage.getItem('keledon-theme');
    return themes.includes(value as Theme) ? value as Theme : 'dark';
  } catch { return 'dark'; }
}
export function ThemeControls() {
  const { t } = useTranslation();
  const [theme, setTheme] = useState<Theme>(readTheme);
  useEffect(() => {
    document.documentElement.dataset.keledonTheme = theme;
    try { localStorage.setItem('keledon-theme', theme); } catch { /* Theme still applies when storage is denied. */ }
  }, [theme]);
  return (
    <label className="inline-flex items-center gap-1 text-xs text-foreground">
      <span className="sr-only">{t('theme.label')}</span>
      <select aria-label={t('theme.label')} value={theme}
        onChange={event => setTheme(event.target.value as Theme)}
        className="max-w-36 rounded border border-border bg-background px-1 py-0.5 text-xs focus-visible:outline-2 focus-visible:outline-primary">
        {themes.map(value => <option key={value} value={value}>{t('theme.' + value)}</option>)}
      </select>
    </label>
  );
}
