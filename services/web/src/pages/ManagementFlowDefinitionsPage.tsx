import { getCompanies, type Company } from '@/lib/crud-api';
import { apiFetch } from '@/lib/api-fetch';
import { useAuth } from '@/context/AuthContext';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

type FlowDefinition = {
  id: string;
  companyId?: string;
  interfaceId?: string;
  name: string;
  description?: string;
  category?: 'talk' | 'case';
  status?: 'active' | 'inactive';
  intentTags: string[];
  createdAt: string;
  updatedAt: string;
};

type FlowVersion = {
  id: string;
  flowDefinitionId: string;
  version: number;
  status: 'draft' | 'approved' | 'deprecated';
  steps: Array<Record<string, unknown>>;
  createdAt: string;
  updatedAt: string;
};

type TenantFlowPermission = {
  flowDefinitionId: string;
  isEnabled: boolean;
  defaultForIntent?: string;
};

type IntentFlowMapping = {
  intent: string;
  allowedFlowDefinitionIds: string[];
};

type DefinitionForm = {
  name: string;
  description: string;
  category: 'talk' | 'case';
  intentTags: string;
  interfaceId: string;
};

const emptyDefinition: DefinitionForm = {
  name: '',
  description: '',
  category: 'case',
  intentTags: '',
  interfaceId: '',
};

async function requestJson<T>(url: string, method = 'GET', body?: unknown): Promise<T> {
  const response = await apiFetch(url, {
    method,
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    headers: { 'Content-Type': 'application/json' },
  });
  if (!response.ok) throw new Error(`Request failed (${response.status})`);
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export default function ManagementFlowDefinitionsPage() {
  const { user } = useAuth();
  const isSuperadmin = user?.role === 'superadmin';
  const [companies, setCompanies] = useState<Company[]>([]);
  const [companyId, setCompanyId] = useState(user?.companyId || '');
  const [legacyOwnerCompanyId, setLegacyOwnerCompanyId] = useState('');
  const [flows, setFlows] = useState<FlowDefinition[]>([]);
  const [versions, setVersions] = useState<FlowVersion[]>([]);
  const [permissions, setPermissions] = useState<TenantFlowPermission[]>([]);
  const [mappings, setMappings] = useState<IntentFlowMapping[]>([]);
  const [selectedFlowId, setSelectedFlowId] = useState('');
  const [editing, setEditing] = useState<FlowDefinition | null>(null);
  const [showDefinitionForm, setShowDefinitionForm] = useState(false);
  const [form, setForm] = useState<DefinitionForm>(emptyDefinition);
  const [steps, setSteps] = useState('[]');
  const [editingVersionId, setEditingVersionId] = useState('');
  const [versionStatus, setVersionStatus] = useState<FlowVersion['status']>('draft');
  const [intent, setIntent] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isSuperadmin) return;
    void getCompanies()
      .then((items) => {
        setCompanies(items);
        setCompanyId((current) => current || items[0]?.id || '');
      })
      .catch(() => toast.error('Could not load companies'));
  }, [isSuperadmin]);

  const load = useCallback(async (targetCompanyId = companyId) => {
    if (!targetCompanyId) {
      setFlows([]);
      setVersions([]);
      setPermissions([]);
      setMappings([]);
      return;
    }
    setLoading(true);
    try {
      const legacyView = isSuperadmin && targetCompanyId === '__legacy__';
      const scope = encodeURIComponent(targetCompanyId);
      const [allFlowRows, allVersionRows, permissionRows, mappingRows] = legacyView
        ? await Promise.all([
            requestJson<FlowDefinition[]>('/api/flow-definitions'),
            requestJson<FlowVersion[]>('/api/flow-versions'),
            Promise.resolve([] as TenantFlowPermission[]),
            Promise.resolve([] as IntentFlowMapping[]),
          ])
        : await Promise.all([
            requestJson<FlowDefinition[]>(`/api/flow-definitions?companyId=${scope}`),
            requestJson<FlowVersion[]>(`/api/flow-versions?companyId=${scope}`),
            requestJson<TenantFlowPermission[]>(`/api/tenant-flow-permissions/${scope}`),
            requestJson<IntentFlowMapping[]>(`/api/intent-flow-mappings/${scope}`),
          ]);
      const flowRows = legacyView
        ? allFlowRows.filter((flow) => !flow.companyId)
        : allFlowRows;
      const flowIds = new Set(flowRows.map((flow) => flow.id));
      const versionRows = legacyView
        ? allVersionRows.filter((version) => flowIds.has(version.flowDefinitionId))
        : allVersionRows;
      setFlows(flowRows);
      setVersions(versionRows);
      setPermissions(permissionRows);
      setMappings(mappingRows);
      setSelectedFlowId((current) =>
        flowRows.some((flow) => flow.id === current)
          ? current
          : flowRows[0]?.id || '',
      );
    } catch {
      toast.error('Could not load company flow configuration');
    } finally {
      setLoading(false);
    }
  }, [companyId, isSuperadmin]);

  useEffect(() => {
    void load();
  }, [load]);

  const selectedFlow = flows.find((flow) => flow.id === selectedFlowId) || null;
  const selectedVersions = useMemo(
    () => versions.filter((version) => version.flowDefinitionId === selectedFlowId),
    [versions, selectedFlowId],
  );
  const selectedPermission = permissions.find(
    (permission) => permission.flowDefinitionId === selectedFlowId,
  );
  const mappedIntents = mappings.filter((mapping) =>
    mapping.allowedFlowDefinitionIds.includes(selectedFlowId),
  );

  const openCreate = () => {
    setEditing(null);
    setForm(emptyDefinition);
    setShowDefinitionForm(true);
  };

  const openEdit = (flow: FlowDefinition) => {
    setEditing(flow);
    setShowDefinitionForm(true);
    setLegacyOwnerCompanyId(flow.companyId || '');
    setSelectedFlowId(flow.id);
    setForm({
      name: flow.name,
      description: flow.description || '',
      category: flow.category || 'case',
      intentTags: (flow.intentTags || []).join(', '),
      interfaceId: flow.interfaceId || '',
    });
  };

  const saveDefinition = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const assigningLegacyDefinition = isSuperadmin && companyId === '__legacy__' && editing !== null && !editing.companyId;
    const targetCompanyId = isSuperadmin && companyId === '__legacy__'
      ? legacyOwnerCompanyId
      : companyId;
    if (!targetCompanyId || !form.name.trim()) return;
    setSaving(true);
    try {
      const body = {
        companyId: targetCompanyId,
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        category: form.category,
        intentTags: form.intentTags.split(',').map((tag) => tag.trim()).filter(Boolean),
        interfaceId: form.interfaceId.trim() || undefined,
      };
      const saved = await requestJson<FlowDefinition>(
        editing ? `/api/flow-definitions/${editing.id}` : '/api/flow-definitions',
        editing ? 'PUT' : 'POST',
        body,
      );
      toast.success(editing ? 'Flow definition updated' : 'Flow definition created');
      setEditing(null);
      setShowDefinitionForm(false);
      setForm(emptyDefinition);
      setSelectedFlowId(saved.id);
      if (assigningLegacyDefinition) setCompanyId(targetCompanyId);
      await load(assigningLegacyDefinition ? targetCompanyId : companyId);
    } catch {
      toast.error('Could not save flow definition');
    } finally {
      setSaving(false);
    }
  };

  const archive = async (flow: FlowDefinition) => {
    if (!window.confirm(`Deactivate “${flow.name}”? Its versions and history will be kept.`)) return;
    try {
      await requestJson(`/api/flow-definitions/${flow.id}`, 'DELETE');
      toast.success('Flow definition deactivated');
      await load();
    } catch {
      toast.error('Could not deactivate flow definition');
    }
  };

  const saveVersion = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedFlow || !companyId) return;
    let parsedSteps: unknown;
    try {
      parsedSteps = JSON.parse(steps);
      if (!Array.isArray(parsedSteps)) throw new Error('Steps must be an array');
      if (parsedSteps.some((step) => !step || typeof step !== 'object' || Array.isArray(step)))
        throw new Error('Each step must be an object');
    } catch {
      toast.error('Steps must be a JSON array of objects');
      return;
    }
    setSaving(true);
    try {
      if (editingVersionId) {
        await requestJson(`/api/flow-versions/${editingVersionId}`, 'PUT', {
          steps: parsedSteps,
          status: versionStatus,
        });
      } else {
        const nextVersion = Math.max(0, ...selectedVersions.map((version) => version.version)) + 1;
        await requestJson('/api/flow-versions', 'POST', {
          flowDefinitionId: selectedFlow.id,
          version: nextVersion,
          status: 'draft',
          steps: parsedSteps,
        });
      }
      setEditingVersionId('');
      setSteps('[]');
      toast.success('Flow version saved');
      await load();
    } catch {
      toast.error('Could not save flow version');
    } finally {
      setSaving(false);
    }
  };

  const editVersion = (version: FlowVersion) => {
    setEditingVersionId(version.id);
    setSteps(JSON.stringify(version.steps, null, 2));
    setVersionStatus(version.status);
  };

  const updateEnabled = async (isEnabled: boolean) => {
    if (!selectedFlow || !companyId) return;
    const previousPermissions = permissions;
    setPermissions((current) => {
      const existing = current.find((permission) => permission.flowDefinitionId === selectedFlow.id);
      const updated = { flowDefinitionId: selectedFlow.id, isEnabled };
      return existing
        ? current.map((permission) => permission.flowDefinitionId === selectedFlow.id ? { ...permission, ...updated } : permission)
        : [...current, updated];
    });
    try {
      await requestJson('/api/tenant-flow-permissions', 'POST', [{
        companyId,
        flowDefinitionId: selectedFlow.id,
        isEnabled,
      }]);
      await load();
      toast.success('Tenant flow availability updated');
    } catch {
      setPermissions(previousPermissions);
      toast.error('Could not update tenant flow availability');
    }
  };

  const saveIntentMapping = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedFlow || !companyId || !intent.trim()) return;
    const current = mappings.find((mapping) => mapping.intent === intent.trim());
    const ids = new Set(current?.allowedFlowDefinitionIds || []);
    if (ids.has(selectedFlow.id)) ids.delete(selectedFlow.id);
    else ids.add(selectedFlow.id);
    try {
      await requestJson('/api/intent-flow-mappings', 'POST', {
        companyId,
        intent: intent.trim(),
        allowedFlowDefinitionIds: [...ids],
      });
      await load();
      toast.success('Intent mapping updated');
    } catch {
      toast.error('Could not update intent mapping');
    }
  };

  const canManage = user?.role === 'admin' || user?.role === 'coordinator' || isSuperadmin;
  const isLegacyView = isSuperadmin && companyId === '__legacy__';

  return (
    <main className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Tenant flow definitions</h1>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            Configure call flow definitions, immutable approved versions, and company-specific intent access.
          </p>
        </div>
        {isSuperadmin ? (
          <label className="grid gap-1 text-sm font-medium">
            Company
            <select
              aria-label="Company scope"
              value={companyId}
              onChange={(event) => setCompanyId(event.target.value)}
              className="min-h-11 min-w-56 rounded-lg border border-border bg-background px-3"
            >
              <option value="">Choose a company</option>
              {companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}
              <option value="__legacy__">Unassigned legacy definitions</option>
            </select>
          </label>
        ) : <p className="rounded-lg bg-muted px-3 py-2 text-sm">Company scope is taken from your account.</p>}
      </header>

      {!companyId ? (
        <section className="rounded-xl border border-border p-8 text-center text-muted-foreground">
          Select a company to manage its flow configuration.
        </section>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[minmax(18rem,0.8fr)_minmax(0,1.5fr)]">
          <section className="space-y-4 rounded-xl border border-border bg-card p-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">Definitions</h2>
              <button type="button" onClick={openCreate} disabled={!canManage || isLegacyView} className="min-h-11 rounded-lg bg-primary px-4 text-primary-foreground disabled:opacity-50">New flow</button>
            </div>
            {loading ? <p role="status">Loading…</p> : flows.length === 0 ? <p className="py-6 text-sm text-muted-foreground">No definitions for this company yet.</p> : (
              <ul className="space-y-2">
                {flows.map((flow) => (
                  <li key={flow.id} className={`rounded-lg border p-3 ${flow.id === selectedFlowId ? 'border-primary bg-primary/5' : 'border-border'}`}>
                    <button type="button" onClick={() => { setSelectedFlowId(flow.id); setEditing(null); setShowDefinitionForm(false); }} className="min-h-11 w-full text-left">
                      <span className="block font-medium">{flow.name}</span>
                      <span className="text-sm text-muted-foreground">{flow.category || 'case'} · {flow.status || 'active'}</span>
                    </button>
                    <div className="mt-2 flex gap-2">
                      <button type="button" onClick={() => openEdit(flow)} className="min-h-11 rounded border border-border px-3 text-sm">Edit</button>
                      {(flow.status || 'active') === 'active' && <button type="button" onClick={() => void archive(flow)} className="min-h-11 rounded border border-border px-3 text-sm">Deactivate</button>}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="space-y-6">
            {showDefinitionForm ? (
              <form onSubmit={saveDefinition} className="space-y-4 rounded-xl border border-border bg-card p-5">
                <h2 className="text-lg font-semibold">{editing ? 'Edit definition' : 'Create definition'}</h2>
                {isLegacyView && isSuperadmin && <label className="grid gap-1 text-sm font-medium">Assign to company<select required value={legacyOwnerCompanyId} onChange={(event) => setLegacyOwnerCompanyId(event.target.value)} className="min-h-11 rounded-lg border border-border bg-background px-3"><option value="">Choose the owning company</option>{companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}</select><span className="font-normal text-muted-foreground">This moves the legacy definition and its versions under the selected company.</span></label>}
                <label className="grid gap-1 text-sm font-medium">Name<input required maxLength={120} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className="min-h-11 rounded-lg border border-border bg-background px-3" /></label>
                <label className="grid gap-1 text-sm font-medium">Description<textarea maxLength={2000} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} className="min-h-24 rounded-lg border border-border bg-background p-3" /></label>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="grid gap-1 text-sm font-medium">Category<select value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value as DefinitionForm['category'] })} className="min-h-11 rounded-lg border border-border bg-background px-3"><option value="talk">Talk</option><option value="case">Case</option></select></label>
                  <label className="grid gap-1 text-sm font-medium">Interface ID<input value={form.interfaceId} onChange={(event) => setForm({ ...form, interfaceId: event.target.value })} className="min-h-11 rounded-lg border border-border bg-background px-3" /></label>
                </div>
                <label className="grid gap-1 text-sm font-medium">Intent tags, comma separated<input value={form.intentTags} onChange={(event) => setForm({ ...form, intentTags: event.target.value })} className="min-h-11 rounded-lg border border-border bg-background px-3" /></label>
                <div className="flex gap-2"><button disabled={saving} className="min-h-11 rounded-lg bg-primary px-4 text-primary-foreground disabled:opacity-50">{saving ? 'Saving…' : 'Save definition'}</button><button type="button" onClick={() => { setEditing(null); setShowDefinitionForm(false); setForm(emptyDefinition); }} className="min-h-11 rounded-lg border border-border px-4">Cancel</button></div>
              </form>
            ) : selectedFlow ? (
              <>
                <section className="space-y-4 rounded-xl border border-border bg-card p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-semibold">{selectedFlow.name}</h2><p className="text-sm text-muted-foreground">{selectedFlow.description || 'No description'}</p></div>{!isLegacyView && <label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" checked={selectedPermission?.isEnabled ?? false} onChange={(event) => void updateEnabled(event.target.checked)} />Available to this company</label>}</div>
                  <h3 className="font-medium">Versions</h3>
                  {selectedVersions.length === 0 ? <p className="text-sm text-muted-foreground">No versions yet.</p> : <ul className="space-y-2">{selectedVersions.map((version) => <li key={version.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-3"><span>v{version.version} · {version.status} · {version.steps.length} steps</span>{version.status === 'draft' && <button type="button" onClick={() => editVersion(version)} className="min-h-11 rounded border border-border px-3">Edit draft</button>}</li>)}</ul>}
                  {canManage && <form onSubmit={saveVersion} className="space-y-3 border-t border-border pt-4"><h4 className="font-medium">{editingVersionId ? 'Edit draft version' : 'Create draft version'}</h4><label className="grid gap-1 text-sm font-medium">Steps (JSON array)<textarea required value={steps} onChange={(event) => setSteps(event.target.value)} spellCheck={false} className="min-h-36 rounded-lg border border-border bg-background p-3 font-mono text-sm" /></label>{editingVersionId && <label className="grid max-w-xs gap-1 text-sm font-medium">Status<select value={versionStatus} onChange={(event) => setVersionStatus(event.target.value as FlowVersion['status'])} className="min-h-11 rounded-lg border border-border bg-background px-3"><option value="draft">Draft</option><option value="approved">Approve and lock</option><option value="deprecated">Deprecated</option></select></label>}<div className="flex gap-2"><button disabled={saving} className="min-h-11 rounded-lg bg-primary px-4 text-primary-foreground disabled:opacity-50">Save version</button>{editingVersionId && <button type="button" onClick={() => { setEditingVersionId(''); setSteps('[]'); }} className="min-h-11 rounded-lg border border-border px-4">Cancel</button>}</div></form>}
                </section>

                {!isLegacyView && <section className="space-y-4 rounded-xl border border-border bg-card p-5">
                  <h2 className="text-lg font-semibold">Intent routing</h2>
                  <p className="text-sm text-muted-foreground">Choose which intents may route to this flow within the selected company.</p>
                  <form onSubmit={saveIntentMapping} className="flex flex-wrap gap-2"><label className="sr-only" htmlFor="flow-intent">Intent</label><input id="flow-intent" required value={intent} onChange={(event) => setIntent(event.target.value)} placeholder="Intent name" className="min-h-11 min-w-56 flex-1 rounded-lg border border-border bg-background px-3" /><button className="min-h-11 rounded-lg border border-border px-4">Toggle mapping</button></form>
                  {mappedIntents.length === 0 ? <p className="text-sm text-muted-foreground">No intents map to this flow.</p> : <ul className="flex flex-wrap gap-2">{mappedIntents.map((mapping) => <li key={mapping.intent} className="rounded-full bg-muted px-3 py-2 text-sm">{mapping.intent}</li>)}</ul>}
                </section>}
              </>
            ) : null}
          </section>
        </div>
      )}
    </main>
  );
}
