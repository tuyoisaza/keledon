import { useEffect, useMemo, useState } from 'react';
import { Download, RefreshCw, Shield } from 'lucide-react';
import { apiJson } from '@/lib/api-fetch';
import { useTranslation } from '@/context/I18nContext';

type AuditEntry = {
  id: string;
  userId: string | null;
  action: string;
  entity: string;
  entityId: string | null;
  changes: string | null;
  createdAt: string;
  user: { id: string; name: string | null; email: string | null } | null;
};
type AuditResponse = {
  data: AuditEntry[];
  pagination: { total: number; limit: number; offset: number; hasMore: boolean };
};
const PAGE_SIZE = 50;

function csvCell(value: unknown): string {
  let text = value == null ? '' : String(value);
  if (/^\s*[=+@-]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}

export default function AdminAuditPage() {
  const { t } = useTranslation();
  const [filters, setFilters] = useState({ action: '', entity: '', userId: '', startDate: '', endDate: '' });
  const [appliedQuery, setAppliedQuery] = useState('');
  const [pageOffset, setPageOffset] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);
  const [result, setResult] = useState<AuditResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(false);
    apiJson<AuditResponse>(`/api/crud/audit-logs?limit=${PAGE_SIZE}&offset=${pageOffset}${appliedQuery ? `&${appliedQuery}` : ''}`)
      .then(value => { if (active) setResult(value); })
      .catch(() => { if (active) { setResult(null); setError(true); } })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [appliedQuery, pageOffset, refreshKey]);

  const range = useMemo(() => {
    const total = result?.pagination.total ?? 0;
    return { first: total ? pageOffset + 1 : 0, last: Math.min(pageOffset + (result?.data.length ?? 0), total), total };
  }, [pageOffset, result]);

  const updateFilter = (key: keyof typeof filters, value: string) => setFilters(current => ({ ...current, [key]: value }));
  const search = (event: React.FormEvent) => {
    event.preventDefault();
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(filters)) if (value.trim()) params.set(key, value.trim());
    setPageOffset(0);
    setAppliedQuery(params.toString());
  };
  const exportVisiblePage = async () => {
    const rows = result?.data ?? [];
    if (!rows.length || exporting) return;
    const fields = ['timestamp', 'actor', 'action', 'entity', 'record', 'changes'];
    const lines = [fields, ...rows.map(row => [
      row.createdAt,
      row.user?.email ?? row.user?.name ?? row.userId ?? 'system',
      row.action,
      row.entity,
      row.entityId ?? '',
      row.changes ?? '',
    ])].map(row => row.map(csvCell).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob([lines], { type: 'text/csv;charset=utf-8' }));
    setExporting(true);
    setExportError(false);
    try {
      await apiJson('/api/crud/audit-logs/export-page', {
        method: 'POST',
        body: JSON.stringify({
          rowCount: rows.length,
          offset: pageOffset,
          filterKeys: Array.from(new URLSearchParams(appliedQuery).keys()),
        }),
      });
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `keledon-audit-${new Date().toISOString().slice(0, 10)}.csv`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch {
      URL.revokeObjectURL(url);
      setExportError(true);
    } finally {
      setExporting(false);
    }
  };

  return <main className="mx-auto max-w-7xl space-y-6 p-4 md:p-8">
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div className="flex items-start gap-3"><Shield aria-hidden="true" className="mt-1 h-6 w-6 text-primary"/><div><h1 className="text-2xl font-bold">{t('audit.title')}</h1><p className="mt-1 text-muted-foreground">{t('audit.description')}</p></div></div>
      <div className="flex gap-2">
        <button type="button" onClick={() => setRefreshKey(current => current + 1)} disabled={loading} className="inline-flex min-h-11 items-center gap-2 rounded-md border border-border px-3 py-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-50"><RefreshCw aria-hidden="true" className="h-4 w-4"/>{t('audit.refresh')}</button>
        <button type="button" onClick={() => void exportVisiblePage()} disabled={!result?.data.length || loading || exporting} className="inline-flex min-h-11 items-center gap-2 rounded-md border border-border px-3 py-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-50"><Download aria-hidden="true" className="h-4 w-4"/>{t('audit.exportPage')}</button>
      </div>
    </header>
    {exportError && <p role="alert" className="text-sm text-destructive">{t('audit.exportError')}</p>}
    <form onSubmit={search} className="grid gap-3 rounded-lg border border-border p-4 sm:grid-cols-2 lg:grid-cols-5">
      <label className="text-sm">{t('audit.action')}<input value={filters.action} maxLength={80} onChange={e => updateFilter('action', e.target.value)} className="mt-1 min-h-11 w-full rounded border border-border bg-background px-3 py-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"/></label>
      <label className="text-sm">{t('audit.entity')}<input value={filters.entity} maxLength={100} onChange={e => updateFilter('entity', e.target.value)} className="mt-1 min-h-11 w-full rounded border border-border bg-background px-3 py-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"/></label>
      <label className="text-sm">{t('audit.userId')}<input value={filters.userId} maxLength={128} onChange={e => updateFilter('userId', e.target.value)} className="mt-1 min-h-11 w-full rounded border border-border bg-background px-3 py-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"/></label>
      <label className="text-sm">{t('audit.from')}<input type="date" value={filters.startDate} onChange={e => updateFilter('startDate', e.target.value)} className="mt-1 min-h-11 w-full rounded border border-border bg-background px-3 py-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"/></label>
      <label className="text-sm">{t('audit.to')}<input type="date" value={filters.endDate} onChange={e => updateFilter('endDate', e.target.value)} className="mt-1 min-h-11 w-full rounded border border-border bg-background px-3 py-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"/></label>
      <div className="flex gap-2 sm:col-span-2 lg:col-span-5"><button type="submit" disabled={loading} className="min-h-11 rounded-md bg-primary px-4 py-2 text-primary-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-50">{t('audit.search')}</button><button type="button" onClick={() => { setFilters({ action: '', entity: '', userId: '', startDate: '', endDate: '' }); setPageOffset(0); setAppliedQuery(''); }} disabled={loading} className="min-h-11 rounded-md border border-border px-4 py-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-50">{t('audit.clear')}</button></div>
    </form>
    <section aria-live="polite" aria-busy={loading} className="overflow-hidden rounded-lg border border-border">
      {loading ? <p className="p-6 text-muted-foreground">{t('audit.loading')}</p> : error ? <p role="alert" className="p-6 text-destructive">{t('audit.loadError')}</p> : !result?.data.length ? <p className="p-6 text-muted-foreground">{t('audit.noLogs')}</p> : <>
        <div className="flex flex-wrap justify-between gap-2 border-b border-border px-4 py-3 text-sm text-muted-foreground"><span>{range.first}–{range.last} / {range.total}</span><span>{t('audit.successOnly')}</span></div>
        <div className="overflow-x-auto"><table className="w-full min-w-[850px] text-left text-sm"><thead className="bg-muted/50"><tr>{['timestamp','user','action','entity','record','details'].map(key => <th key={key} scope="col" className="px-4 py-3 font-medium">{t(`audit.${key}`)}</th>)}</tr></thead><tbody className="divide-y divide-border">
          {result.data.map(row => <tr key={row.id} className="align-top"><td className="whitespace-nowrap px-4 py-3">{new Date(row.createdAt).toLocaleString()}</td><td className="px-4 py-3"><span>{row.user?.name || row.user?.email || row.userId || t('audit.system')}</span>{row.user?.email && row.user?.name && <span className="block text-xs text-muted-foreground">{row.user.email}</span>}</td><td className="px-4 py-3">{row.action}</td><td className="px-4 py-3">{row.entity}</td><td className="break-all px-4 py-3">{row.entityId || '—'}</td><td className="px-4 py-3">{row.changes ? <details><summary className="inline-flex min-h-11 cursor-pointer items-center text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">{t('audit.viewDetails')}</summary><pre className="mt-2 max-w-[34rem] whitespace-pre-wrap break-all rounded bg-muted p-2 text-xs">{row.changes}</pre></details> : <span className="text-muted-foreground">{t('audit.noDetails')}</span>}</td></tr>)}
        </tbody></table></div>
        <nav aria-label={t('audit.pagination')} className="flex items-center justify-end gap-3 border-t border-border p-3"><button type="button" disabled={pageOffset === 0 || loading} onClick={() => setPageOffset(Math.max(0, pageOffset - PAGE_SIZE))} className="min-h-11 rounded border border-border px-3 py-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-50">{t('audit.previous')}</button><button type="button" disabled={!result.pagination.hasMore || loading} onClick={() => setPageOffset(pageOffset + PAGE_SIZE)} className="min-h-11 rounded border border-border px-3 py-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-50">{t('audit.next')}</button></nav>
      </>}
    </section>
  </main>;
}
