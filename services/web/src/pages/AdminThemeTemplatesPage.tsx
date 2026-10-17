import { useCallback, useEffect, useState, type CSSProperties } from 'react';
import { apiFetch } from '@/lib/api-fetch';
import { useTranslation } from '@/context/I18nContext';
import { applyThemeConfiguration, type ThemeConfiguration } from '../../../../shared/theme-runtime.js';

const presets = ['light', 'dark', 'corporate'] as const;
const fields: Array<[string, string]> = [
  ['background','background'], ['foreground','foreground'], ['primary','primary'], ['primaryForeground','primaryForeground'],
  ['accent','accent'], ['accentForeground','accentForeground'], ['muted','muted'], ['mutedForeground','mutedForeground'],
  ['border','border'], ['ring','ring'], ['popover','popover'], ['card','card'], ['cardForeground','cardForeground'],
  ['sidebar','sidebar'], ['sidebarForeground','sidebarForeground'], ['sidebarActive','sidebarActive'],
];
type ThemePalette = Partial<NonNullable<ThemeConfiguration['presets']>[typeof presets[number]]>;
const previewStyle = (colors: ThemePalette) => Object.fromEntries([
  ['background', 'background'], ['foreground', 'foreground'], ['primary', 'primary'],
  ['primaryForeground', 'primary-foreground'], ['accent', 'accent'], ['accentForeground', 'accent-foreground'],
  ['muted', 'muted'], ['mutedForeground', 'muted-foreground'], ['border', 'border'], ['ring', 'ring'],
  ['popover', 'popover'], ['card', 'card'], ['cardForeground', 'card-foreground'],
  ['sidebar', 'sidebar'], ['sidebarForeground', 'sidebar-foreground'], ['sidebarActive', 'sidebar-active'],
].map(([key, token]) => [`--color-${token}`, colors[key as keyof typeof colors]])) as CSSProperties;

export default function AdminThemeTemplatesPage() {
  const { t } = useTranslation();
  const [config, setConfig] = useState<ThemeConfiguration | null>(null);
  const [saved, setSaved] = useState<ThemeConfiguration | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    const response = await apiFetch('/api/admin/theme');
    if (!response.ok) throw new Error(response.status === 403 ? t('themeEditor.accessDenied') : t('themeEditor.loadFailed'));
    const value = await response.json() as ThemeConfiguration;
    setConfig(value); setSaved(structuredClone(value));
  }, [t]);
  useEffect(() => { void load().catch(e => setError(e instanceof Error ? e.message : t('themeEditor.genericError'))); }, [load, t]);
  const updateColor = (preset: string, field: string, color: string) => setConfig(current => {
    if (!current) return current;
    const updated = { ...current, presets: { ...current.presets, [preset]: { ...current.presets?.[preset], [field]: color } } };
    applyThemeConfiguration(updated);
    return updated;
  });
  const save = async () => {
    if (!config) return;
    setBusy(true); setError('');
    try {
      const response = await apiFetch('/api/admin/theme', { method: 'PUT', body: JSON.stringify({ expectedRevision: config.revision ?? 0, corporateEnabled: config.corporateEnabled, presets: config.presets }) });
      if (!response.ok) throw new Error(response.status === 403 ? t('themeEditor.accessDenied') : t('themeEditor.saveFailed'));
      const value = await response.json() as ThemeConfiguration;
      setConfig(value); setSaved(structuredClone(value)); applyThemeConfiguration(value);
    } catch (e) { setError(e instanceof Error ? e.message : t('themeEditor.saveFailed')); }
    finally { setBusy(false); }
  };
  if (!config) return <main className="mx-auto max-w-5xl p-6" aria-busy="true">{t('themeEditor.loading')}</main>;
  return <main className="mx-auto max-w-6xl space-y-6 p-6">
    <header><h1 className="text-2xl font-bold">{t('themeEditor.title')}</h1><p className="text-muted-foreground">{t('themeEditor.description')}</p></header>
    <label className="flex items-center gap-3 rounded-lg border border-border bg-card p-4"><input type="checkbox" checked={config.corporateEnabled} onChange={e => setConfig({ ...config, corporateEnabled: e.target.checked })} />{t('themeEditor.corporateEnabled')}</label>
    <div className="grid gap-4 lg:grid-cols-3">{presets.map(preset => {
      const presetLabel = t(`themeEditor.presets.${preset}`);
      return <section key={preset} className="space-y-3 rounded-xl border border-border bg-card p-4" aria-label={t('themeEditor.templateNamed').replace('{name}', presetLabel)}>
      <h2 className="text-lg font-semibold">{presetLabel}</h2>
      <div style={previewStyle(config.presets?.[preset] ?? config.presets?.dark ?? {})} className="rounded-lg border border-border bg-background p-4 text-foreground"><strong>{t('themeEditor.previewNamed').replace('{name}', presetLabel)}</strong><p className="my-3 text-muted-foreground">{t('themeEditor.previewSample')}</p><button className="rounded bg-primary px-3 py-2 text-primary-foreground">{t('themeEditor.primaryAction')}</button></div>
      <div className="grid grid-cols-1 gap-2">{fields.map(([field, labelKey]) => {
        const label = t(`themeEditor.colors.${labelKey}`);
        return <label key={field} className="flex items-center justify-between gap-2 text-sm">{label}<input aria-label={`${presetLabel} · ${label}`} type="color" value={config.presets?.[preset]?.[field] ?? config.presets?.dark?.[field] ?? ''} onChange={e => updateColor(preset, field, e.target.value)} /></label>;
      })}</div>
    </section>})}</div>
    <div className="flex flex-wrap items-center gap-3"><button type="button" onClick={() => { if (saved) { const restored = structuredClone(saved); setConfig(restored); applyThemeConfiguration(restored); } }} disabled={busy} className="rounded border border-border px-4 py-2">{t('themeEditor.cancel')}</button><button type="button" onClick={() => void save()} disabled={busy} className="rounded bg-primary px-4 py-2 text-primary-foreground">{busy ? t('themeEditor.saving') : t('themeEditor.save')}</button>{error && <p role="alert" className="text-red-700">{error}</p>}{!error && saved && config.revision !== saved.revision && <p role="status">{t('themeEditor.unsaved')}</p>}{!error && saved && config.revision === saved.revision && <p role="status">{t('themeEditor.saved')}</p>}</div>
  </main>;
}
