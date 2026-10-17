import { useEffect, useRef, useState } from "react";
import { FileText, Save, RefreshCw } from "lucide-react";
import { useTranslation } from "@/context/I18nContext";
import {
  AiAdminError,
  aiAdminRequest,
  parseOutputSchema,
  type ManagedPrompt,
  type ManagedPromptSummary,
} from "@/lib/ai-admin";

type Draft = {
  name: string;
  personalityPrompt: string;
  executionPrompt: string;
  schema: string;
  enabled: boolean;
  purpose: string;
  owningFeature: string;
  callsite: string;
  inputSchema: string;
  outputDestination: string;
  nextHops: string;
};
const fromPrompt = (prompt: ManagedPrompt): Draft => ({
  name: prompt.name,
  personalityPrompt: prompt.personalityPrompt,
  executionPrompt: prompt.executionPrompt,
  schema: JSON.stringify(prompt.outputSchemaJson, null, 2),
  enabled: prompt.enabled,
  purpose: prompt.purpose,
  owningFeature: prompt.owningFeature,
  callsite: prompt.callsite,
  inputSchema: JSON.stringify(prompt.inputSchemaJson, null, 2),
  outputDestination: prompt.outputDestination,
  nextHops: JSON.stringify(prompt.nextHops, null, 2),
});
export default function AdminPromptsPage() {
  const { t } = useTranslation();
  const [items, setItems] = useState<ManagedPromptSummary[]>([]);
  const [selected, setSelected] = useState<ManagedPrompt | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const requestNumber = useRef(0);
  const dirty =
    !!selected &&
    !!draft &&
    JSON.stringify(fromPrompt(selected)) !== JSON.stringify(draft);
  const errorKey = (error: unknown) =>
    error instanceof AiAdminError && [401, 403].includes(error.status)
      ? "aiAdmin.denied"
      : error instanceof AiAdminError && error.status === 409
        ? "aiAdmin.conflict"
        : "aiAdmin.failed";
  useEffect(() => {
    const controller = new AbortController();
    aiAdminRequest<ManagedPromptSummary[] | { items: ManagedPromptSummary[] }>("/prompts", {
      signal: controller.signal,
    })
    .then(async (result) => {
        const list = Array.isArray(result) ? result : result.items;
        setItems(list);
        if (list[0]) {
          const first = await aiAdminRequest<ManagedPrompt>("/prompts/" + encodeURIComponent(list[0].id));
          setSelected(first);
          setDraft(fromPrompt(first));
        }
      })
      .catch((error) => {
        if (!controller.signal.aborted) setNotice(errorKey(error));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, []);
  useEffect(() => {
    if (!dirty) return;
    const prevent = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", prevent);
    return () => window.removeEventListener("beforeunload", prevent);
  }, [dirty]);
  const choose = async (id: string) => {
    if (saving || (dirty && !window.confirm(t("aiAdmin.discard")))) return;
    const sequence = ++requestNumber.current;
    setLoading(true);
    setNotice("");
    try {
      const item = await aiAdminRequest<ManagedPrompt>(
        "/prompts/" + encodeURIComponent(id),
      );
      if (sequence === requestNumber.current) {
        setSelected(item);
        setDraft(fromPrompt(item));
      }
    } catch (error) {
      if (sequence === requestNumber.current) setNotice(errorKey(error));
    } finally {
      if (sequence === requestNumber.current) setLoading(false);
    }
  };
  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!draft || !selected || saving) return;
    let outputSchemaJson: Record<string, unknown>;
    let inputSchemaJson: Record<string, unknown>;
    let nextHops: ManagedPrompt['nextHops'];
    try {
      outputSchemaJson = parseOutputSchema(draft.schema);
    } catch {
      setNotice("aiAdmin.schemaError");
      return;
    }
    try {
      inputSchemaJson = JSON.parse(draft.inputSchema);
      nextHops = JSON.parse(draft.nextHops);
      if (!inputSchemaJson || Array.isArray(inputSchemaJson) || typeof inputSchemaJson !== 'object' || !Array.isArray(nextHops)) throw new Error('Invalid workflow metadata');
    } catch {
      setNotice('aiAdmin.workflowSchemaError');
      return;
    }
    if (
      !draft.name.trim() ||
      !draft.personalityPrompt.trim() ||
      !draft.executionPrompt.trim()
    ) {
      setNotice("aiAdmin.required");
      return;
    }
    setSaving(true);
    setNotice("");
    try {
      const item = await aiAdminRequest<ManagedPrompt>(
        "/prompts/" + encodeURIComponent(selected.id),
        {
          method: "PUT",
          body: JSON.stringify({
            name: draft.name,
            personalityPrompt: draft.personalityPrompt,
            executionPrompt: draft.executionPrompt,
            outputSchemaJson,
            enabled: draft.enabled,
            purpose: draft.purpose,
            owningFeature: draft.owningFeature,
            callsite: draft.callsite,
            inputSchemaJson,
            outputDestination: draft.outputDestination,
            nextHops,
            expectedRevision: selected.revision,
          }),
        },
      );
      setSelected(item);
      setDraft(fromPrompt(item));
      setItems((previous) =>
        previous.map((row) => (row.id === item.id ? item : row)),
      );
      setNotice("aiAdmin.draftSaved");
    } catch (error) {
      setNotice(errorKey(error));
    } finally {
      setSaving(false);
    }
  };
  const edit = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft((previous) =>
      previous ? { ...previous, [key]: value } : previous,
    );
  const rollback = async (revision: number) => {
    if (!selected || saving || !window.confirm(t('aiAdmin.rollbackConfirm'))) return;
    setSaving(true); setNotice('');
    try {
      const item = await aiAdminRequest<ManagedPrompt>(`/prompts/${encodeURIComponent(selected.id)}/rollback`, { method: 'POST', body: JSON.stringify({ targetRevision: revision, expectedRevision: selected.revision }) });
      setSelected(item); setDraft(fromPrompt(item)); setItems(previous => previous.map(row => row.id === item.id ? item : row)); setNotice('aiAdmin.draftSaved');
    } catch (error) { setNotice(errorKey(error)); }
    finally { setSaving(false); }
  };
  const publish = async () => {
    if (!selected || saving || dirty || selected.revision === selected.publishedRevision || !window.confirm(t('aiAdmin.publishConfirm'))) return;
    setSaving(true); setNotice('');
    try {
      const item = await aiAdminRequest<ManagedPrompt>(`/prompts/${encodeURIComponent(selected.id)}/publish`, { method: 'POST', body: JSON.stringify({ expectedRevision: selected.revision }) });
      setSelected(item); setDraft(fromPrompt(item)); setItems(previous => previous.map(row => row.id === item.id ? item : row)); setNotice('aiAdmin.published');
    } catch (error) { setNotice(errorKey(error)); }
    finally { setSaving(false); }
  };
  return (
    <section className="max-w-6xl mx-auto p-4 md:p-8 space-y-5">
      <header>
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          <FileText aria-hidden="true" />
          {t("aiAdmin.prompts")}
        </h1>
        <p className="text-muted-foreground mt-2">{t("aiAdmin.promptIntro")}</p>
      </header>
      {notice && (
        <p
          role={["aiAdmin.saved", "aiAdmin.draftSaved", "aiAdmin.published"].includes(notice) ? "status" : "alert"}
          className="rounded-lg border border-border p-3 text-sm"
        >
          {t(notice)}
        </p>
      )}
      {loading && <p role="status">{t("aiAdmin.loading")}</p>}
      {!loading && !notice && items.length === 0 && (
        <p className="p-6 rounded-lg border border-border">
          {t("aiAdmin.emptyPrompts")}
        </p>
      )}
      <div className="grid md:grid-cols-[250px_minmax(0,1fr)] gap-5">
        <nav aria-label={t("aiAdmin.promptList")} className="space-y-2">
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              disabled={saving || loading}
              aria-current={selected?.id === item.id ? "page" : undefined}
              onClick={() => void choose(item.id)}
              className={
                "w-full rounded-lg border p-3 text-left break-words " +
                (selected?.id === item.id
                  ? "border-primary bg-primary/10"
                  : "border-border hover:bg-muted")
              }
            >
              <span className="font-medium block">{item.name}</span>
              <span className="text-xs text-muted-foreground break-all">
                {item.id}
              </span>
            </button>
          ))}
        </nav>
        {selected && draft && (
          <form
            onSubmit={save}
            aria-busy={saving || loading}
            className="space-y-4 rounded-xl border border-border p-4 md:p-6 min-w-0"
          >
            <div className="flex flex-wrap justify-between gap-2 text-sm text-muted-foreground">
              <span>
                {t("aiAdmin.revision")}: {selected.revision}
              </span>
              <span>{t('aiAdmin.publishedRevision')}: {selected.publishedRevision}</span>
              <span role="status">{t(dirty ? "aiAdmin.unsaved" : selected.revision !== selected.publishedRevision ? 'aiAdmin.awaitingPublish' : "aiAdmin.current")}</span>
            </div>
            <label className="block text-sm font-medium">
              {t("aiAdmin.name")}
              <input
                required
                disabled={saving || loading}
                maxLength={200}
                value={draft.name}
                onChange={(e) => edit("name", e.target.value)}
                className="mt-2 w-full rounded-md border border-border bg-background p-3"
              />
            </label>
            <label className="block text-sm font-medium">
              {t("aiAdmin.personality")}
              <textarea
                required
                disabled={saving || loading}
                rows={6}
                maxLength={20000}
                value={draft.personalityPrompt}
                aria-label={t("aiAdmin.personality")}
                onChange={(e) => edit("personalityPrompt", e.target.value)}
                className="mt-2 w-full rounded-md border border-border bg-background p-3"
              />
            </label>
            <label className="block text-sm font-medium">
              {t("aiAdmin.execution")}
              <textarea
                required
                disabled={saving || loading}
                rows={8}
                maxLength={20000}
                value={draft.executionPrompt}
                aria-label={t("aiAdmin.execution")}
                onChange={(e) => edit("executionPrompt", e.target.value)}
                className="mt-2 w-full rounded-md border border-border bg-background p-3"
              />
            </label>
            <label className="block text-sm font-medium">
              {t("aiAdmin.schema")}
              <textarea
                required
                disabled={saving || loading}
                rows={9}
                spellCheck={false}
                maxLength={20000}
                value={draft.schema}
                aria-label={t("aiAdmin.schema")}
                onChange={(e) => edit("schema", e.target.value)}
                className="mt-2 w-full rounded-md border border-border bg-background p-3 font-mono text-xs"
              />
            </label>
            <label className="block text-sm font-medium">{t('aiAdmin.purpose')}<input disabled={saving || loading} maxLength={500} value={draft.purpose} onChange={e => edit('purpose', e.target.value)} className="mt-2 w-full rounded-md border border-border bg-background p-3" /></label>
            <label className="block text-sm font-medium">{t('aiAdmin.owningFeature')}<input disabled={saving || loading} maxLength={500} value={draft.owningFeature} onChange={e => edit('owningFeature', e.target.value)} className="mt-2 w-full rounded-md border border-border bg-background p-3" /></label>
            <label className="block text-sm font-medium">{t('aiAdmin.callsite')}<input disabled={saving || loading} maxLength={500} value={draft.callsite} onChange={e => edit('callsite', e.target.value)} className="mt-2 w-full rounded-md border border-border bg-background p-3" /></label>
            <label className="block text-sm font-medium">{t('aiAdmin.inputSchema')}<textarea disabled={saving || loading} rows={6} value={draft.inputSchema} onChange={e => edit('inputSchema', e.target.value)} className="mt-2 w-full rounded-md border border-border bg-background p-3 font-mono text-sm" /></label>
            <label className="block text-sm font-medium">{t('aiAdmin.outputDestination')}<input disabled={saving || loading} maxLength={500} value={draft.outputDestination} onChange={e => edit('outputDestination', e.target.value)} className="mt-2 w-full rounded-md border border-border bg-background p-3" /></label>
            <label className="block text-sm font-medium">{t('aiAdmin.nextHops')}<textarea disabled={saving || loading} rows={4} value={draft.nextHops} onChange={e => edit('nextHops', e.target.value)} className="mt-2 w-full rounded-md border border-border bg-background p-3 font-mono text-sm" /></label>
            {selected.revisions?.length ? <section className="rounded-lg border border-border p-3"><h2 className="font-medium">{t('aiAdmin.revision')} history</h2><ul className="mt-2 space-y-2">{selected.revisions.map(item => <li key={item.toRevision} className="flex items-center justify-between gap-3 text-sm"><span>v{item.toRevision}{item.publishedAt ? ` · ${t('aiAdmin.published')}` : ''}</span><button type="button" disabled={saving || item.toRevision === selected.revision} onClick={() => void rollback(item.toRevision)} className="rounded border border-border px-3 py-1">{t('aiAdmin.rollback')}</button></li>)}</ul></section> : null}
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                disabled={saving || loading}
                checked={draft.enabled}
                onChange={(e) => edit("enabled", e.target.checked)}
              />
              {t("aiAdmin.enabled")}
            </label>
            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={!dirty || saving || loading}
                className="inline-flex items-center gap-2 rounded-md bg-primary text-primary-foreground px-4 py-2 disabled:opacity-50"
              >
                <Save className="w-4 h-4" aria-hidden="true" />
                {t(saving ? "aiAdmin.saving" : "aiAdmin.save")}
              </button>
              {selected.revision !== selected.publishedRevision && <button type="button" disabled={dirty || saving || loading} onClick={() => void publish()} className="rounded-md bg-primary px-4 py-2 text-primary-foreground disabled:opacity-50">{t(saving ? 'aiAdmin.saving' : 'aiAdmin.publish')}</button>}
              <button
                type="button"
                disabled={saving || loading}
                onClick={() => void choose(selected.id)}
                className="inline-flex items-center gap-2 rounded-md border border-border px-4 py-2"
              >
                <RefreshCw className="w-4 h-4" aria-hidden="true" />
                {t("aiAdmin.reload")}
              </button>
            </div>
          </form>
        )}
      </div>
      <section aria-labelledby="ai-workflow-graph-title" className="rounded-xl border border-border p-4 md:p-6">
        <h2 id="ai-workflow-graph-title" className="text-lg font-semibold">{t('aiAdmin.workflowGraph')}</h2>
        <ol className="mt-4 grid gap-3 md:grid-cols-2">
          {items.map((item) => {
            const edges = Array.isArray(item.nextHops) ? item.nextHops : [];
            return <li key={item.id} className="min-w-0 rounded-lg border border-border p-3">
              <h3 className="break-words font-medium">{item.name}</h3>
              <p className="break-all font-mono text-xs text-muted-foreground">{item.id}</p>
              <p className="mt-2 text-sm">{item.outputDestination}</p>
              {edges.length ? <ul className="mt-3 space-y-2 border-l-2 border-primary pl-3">
                {edges.map((edge, index) => <li key={`${edge.agentId}-${index}`} className="break-words text-sm">
                  <span aria-hidden="true">→ </span><strong>{items.find((candidate) => candidate.id === edge.agentId)?.name ?? edge.agentId}</strong>
                  {edge.condition && <p className="text-muted-foreground">{t('aiAdmin.edgeCondition')}: {edge.condition}</p>}
                  {edge.inputMapping && <p className="break-all font-mono text-xs text-muted-foreground">{t('aiAdmin.edgeMapping')}: {JSON.stringify(edge.inputMapping)}</p>}
                  {edge.maxHops && <p className="text-muted-foreground">{t('aiAdmin.edgeGuard')}: {edge.maxHops}</p>}
                </li>)}
              </ul> : <p className="mt-3 text-sm text-muted-foreground">{t('aiAdmin.terminalNode')}</p>}
            </li>;
          })}
        </ol>
      </section>
    </section>
  );
}
