import { useEffect, useState } from 'react';
import { useTranslation } from '@/context/I18nContext';
import { loadThemeConfiguration } from '../../../../../shared/theme-runtime.js';

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
  const [corporateEnabled, setCorporateEnabled] = useState(true);
  useEffect(() => {
    let active = true;
    const sync = (config: { corporateEnabled?: boolean }) => {
      if (!active) return;
      setCorporateEnabled(config.corporateEnabled !== false);
      const saved = readTheme();
      if (config.corporateEnabled === false && saved === 'corporate') setTheme('light');
    };
    const listener = (event: Event) => sync((event as CustomEvent).detail ?? {});
    window.addEventListener('keledon-theme-configuration', listener);
    void loadThemeConfiguration().then(sync);
    return () => { active = false; window.removeEventListener('keledon-theme-configuration', listener); };
  }, []);
  useEffect(() => {
    document.documentElement.dataset.keledonTheme = theme;
    try { localStorage.setItem('keledon-theme', theme); } catch { /* Theme still applies when storage is denied. */ }
  }, [theme]);
  return (
    <label className="inline-flex items-center gap-1 text-xs text-foreground">
      <span className="sr-only">{t('theme.label')}</span>
      <select aria-label={t('theme.label')} value={theme}
        onChange={event => setTheme(event.target.value as Theme)}
        className="min-h-11 max-w-36 rounded border border-border bg-background px-1 py-0.5 text-xs focus-visible:outline-2 focus-visible:outline-primary">
        {themes.filter(value => value !== 'corporate' || corporateEnabled).map(value => <option key={value} value={value}>{t('theme.' + value)}</option>)}
      </select>
    </label>
  );
}
