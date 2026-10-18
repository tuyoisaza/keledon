import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Building2, Loader2, Pencil, Plus, RefreshCw, Trash2, X } from 'lucide-react';
import { useTranslation } from '@/context/I18nContext';
import {
  createManagedInterface,
  deleteManagedInterface,
  getCompanies,
  getManagedInterfaces,
  updateManagedInterface,
  type Company,
  type ManagedInterface,
  type ManagedInterfaceInput,
} from '@/lib/crud-api';

type FormState = {
  companyId: string;
  name: string;
  baseUrl: string;
  category: string;
  providerKey: string;
  credentials: string;
};

const EMPTY_FORM: FormState = {
  companyId: '', name: '', baseUrl: '', category: 'crm', providerKey: '', credentials: '',
};

export function ManagedInterfacesPanel() {
  const { t } = useTranslation();
  const format = (key: string, values: Record<string, string>) => Object.entries(values).reduce(
    (message, [name, value]) => message.replace(`{{${name}}}`, value), t(key),
  );
  const [companies, setCompanies] = useState<Company[]>([]);
  const [interfaces, setInterfaces] = useState<ManagedInterface[]>([]);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [editing, setEditing] = useState<ManagedInterface | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [companyRows, interfaceRows] = await Promise.all([getCompanies(), getManagedInterfaces()]);
      setCompanies(companyRows);
      setInterfaces(interfaceRows);
    } catch {
      setError(t('managedInterfaces.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => { void load(); }, [load]);

  const reset = () => {
    setEditing(null);
    setFormOpen(false);
    setForm({ ...EMPTY_FORM, companyId: companies[0]?.id ?? '' });
    setError('');
    setNotice('');
  };

  const beginEdit = (item: ManagedInterface) => {
    setEditing(item);
    setFormOpen(true);
    setForm({
      companyId: item.companyId ?? '',
      name: item.name,
      baseUrl: item.baseUrl ?? '',
      category: item.category ?? 'crm',
      providerKey: item.providerKey ?? '',
      credentials: '',
    });
    setError('');
    setNotice('');
  };

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setNotice('');
    const payload: ManagedInterfaceInput = {
      companyId: form.companyId,
      name: form.name.trim(),
      baseUrl: form.baseUrl.trim(),
      category: form.category.trim() || undefined,
      providerKey: form.providerKey.trim() || undefined,
      status: editing?.status ?? 'disconnected',
      ...(form.credentials ? { credentials: form.credentials } : {}),
    };
    try {
      if (editing) {
        const { companyId: _companyId, ...update } = payload;
        await updateManagedInterface(editing.id, update);
      } else {
        await createManagedInterface(payload);
      }
      setNotice(t(editing ? 'managedInterfaces.updated' : 'managedInterfaces.created'));
      setEditing(null);
      setFormOpen(false);
      setForm({ ...EMPTY_FORM, companyId: companies[0]?.id ?? '' });
      await load();
    } catch {
      setError(t('managedInterfaces.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (item: ManagedInterface) => {
    if (!window.confirm(format('managedInterfaces.confirmDelete', { name: item.name }))) return;
    setError('');
    setNotice('');
    try {
      await deleteManagedInterface(item.id);
      if (editing?.id === item.id) reset();
      setNotice(t('managedInterfaces.deleted'));
      await load();
    } catch {
      setError(t('managedInterfaces.deleteFailed'));
    }
  };

  const companyName = (id?: string | null) => companies.find((company) => company.id === id)?.name ?? t('managedInterfaces.unassigned');

  return (
    <section aria-labelledby="managed-interfaces-title" className="space-y-5 rounded-xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="managed-interfaces-title" className="text-lg font-semibold">{t('managedInterfaces.title')}</h2>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{t('managedInterfaces.description')}</p>
        </div>
        <button type="button" onClick={() => { setEditing(null); setFormOpen(true); setForm({ ...EMPTY_FORM, companyId: companies[0]?.id ?? '' }); setError(''); setNotice(''); }} className="inline-flex min-h-11 items-center gap-2 rounded-md border border-border px-3 text-sm font-medium hover:bg-muted focus-visible:outline-2 focus-visible:outline-primary">
          <Plus className="h-4 w-4" aria-hidden="true" />{t('managedInterfaces.add')}
        </button>
      </div>

      {error && <p role="alert" className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
      {notice && <p role="status" className="rounded-md border border-primary/30 bg-primary/5 p-3 text-sm">{notice}</p>}

      {formOpen ? (
        <form onSubmit={save} className="grid gap-4 rounded-lg border border-border p-4 md:grid-cols-2">
          <h3 className="md:col-span-2 font-medium">{t(editing ? 'managedInterfaces.edit' : 'managedInterfaces.new')}</h3>
          <label className="grid gap-1 text-sm font-medium">
            {t('managedInterfaces.company')}
            <select required={!editing} value={form.companyId} disabled={!!editing || saving} onChange={(event) => setForm({ ...form, companyId: event.target.value })} className="min-h-11 rounded-md border border-border bg-background px-3">
              <option value="">{editing && !editing.companyId ? t('managedInterfaces.unassigned') : t('managedInterfaces.selectCompany')}</option>
              {companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}
            </select>
          </label>
          <label className="grid gap-1 text-sm font-medium">
            {t('managedInterfaces.name')}
            <input required maxLength={120} value={form.name} disabled={saving} onChange={(event) => setForm({ ...form, name: event.target.value })} className="min-h-11 rounded-md border border-border bg-background px-3" />
          </label>
          <label className="grid gap-1 text-sm font-medium md:col-span-2">
            {t('managedInterfaces.baseUrl')}
            <input required type="url" maxLength={2048} value={form.baseUrl} disabled={saving} onChange={(event) => setForm({ ...form, baseUrl: event.target.value })} className="min-h-11 rounded-md border border-border bg-background px-3" />
          </label>
          <label className="grid gap-1 text-sm font-medium">
            {t('managedInterfaces.category')}
            <select value={form.category} disabled={saving} onChange={(event) => setForm({ ...form, category: event.target.value })} className="min-h-11 rounded-md border border-border bg-background px-3">
              <option value="crm">CRM</option><option value="talk">{t('managedInterfaces.calls')}</option><option value="case">{t('managedInterfaces.cases')}</option>
            </select>
          </label>
          <label className="grid gap-1 text-sm font-medium">
            {t('managedInterfaces.providerKey')}
            <input maxLength={120} value={form.providerKey} disabled={saving} onChange={(event) => setForm({ ...form, providerKey: event.target.value })} className="min-h-11 rounded-md border border-border bg-background px-3" />
          </label>
          <label className="grid gap-1 text-sm font-medium md:col-span-2">
            {t('managedInterfaces.replaceCredentials')}
            <textarea autoComplete="new-password" maxLength={16000} value={form.credentials} disabled={saving} onChange={(event) => setForm({ ...form, credentials: event.target.value })} className="min-h-24 rounded-md border border-border bg-background p-3 font-mono text-sm" />
            <span className="font-normal text-muted-foreground">{t(editing ? 'managedInterfaces.secretReplaceHelp' : 'managedInterfaces.secretCreateHelp')}</span>
          </label>
          <div className="flex flex-wrap gap-2 md:col-span-2">
            <button disabled={saving || loading || companies.length === 0} className="inline-flex min-h-11 items-center gap-2 rounded-md bg-primary px-4 text-primary-foreground disabled:opacity-50">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}{t('managedInterfaces.save')}
            </button>
            <button type="button" onClick={reset} disabled={saving} className="inline-flex min-h-11 items-center gap-2 rounded-md border border-border px-4 hover:bg-muted"><X className="h-4 w-4" aria-hidden="true" />{t('managedInterfaces.cancel')}</button>
          </div>
        </form>
      ) : null}

      {loading ? <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />{t('managedInterfaces.loading')}</p> : interfaces.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground"><Building2 className="mx-auto mb-2 h-5 w-5" aria-hidden="true" />{t('managedInterfaces.empty')}</div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-[680px] text-left text-sm">
            <caption className="sr-only">{t('managedInterfaces.title')}</caption>
            <thead className="bg-muted/60"><tr>
              <th scope="col" className="p-3">{t('managedInterfaces.name')}</th><th scope="col" className="p-3">{t('managedInterfaces.company')}</th><th scope="col" className="p-3">{t('managedInterfaces.category')}</th><th scope="col" className="p-3">{t('managedInterfaces.status')}</th><th scope="col" className="p-3">{t('managedInterfaces.credentials')}</th><th scope="col" className="p-3">{t('managedInterfaces.actions')}</th>
            </tr></thead>
            <tbody>{interfaces.map((item) => <tr key={item.id} className="border-t border-border">
              <th scope="row" className="p-3 font-medium">{item.name}<span className="mt-1 block max-w-64 truncate font-normal text-muted-foreground" title={item.baseUrl}>{item.baseUrl ?? ''}</span></th>
              <td className="p-3">{companyName(item.companyId)}</td><td className="p-3">{item.category || '—'}</td><td className="p-3">{item.status}</td><td className="p-3">{t(item.hasCredentials ? 'managedInterfaces.configured' : 'managedInterfaces.notConfigured')}</td>
              <td className="p-3"><div className="flex gap-2"><button type="button" onClick={() => beginEdit(item)} aria-label={format('managedInterfaces.editNamed', { name: item.name })} className="inline-flex min-h-11 min-w-11 items-center justify-center rounded border border-border hover:bg-muted"><Pencil className="h-4 w-4" aria-hidden="true" /></button><button type="button" onClick={() => void remove(item)} aria-label={format('managedInterfaces.deleteNamed', { name: item.name })} className="inline-flex min-h-11 min-w-11 items-center justify-center rounded border border-border text-destructive hover:bg-destructive/10"><Trash2 className="h-4 w-4" aria-hidden="true" /></button></div></td>
            </tr>)}</tbody>
          </table>
        </div>
      )}
      <button type="button" onClick={() => void load()} disabled={loading} className="inline-flex min-h-11 items-center gap-2 rounded-md px-3 text-sm hover:bg-muted disabled:opacity-50"><RefreshCw className="h-4 w-4" aria-hidden="true" />{t('managedInterfaces.refresh')}</button>
    </section>
  );
}
