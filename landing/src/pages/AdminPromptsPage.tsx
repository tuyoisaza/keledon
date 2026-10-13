import { useEffect, useRef, useState } from "react";
import { FileText, Save, RefreshCw } from "lucide-react";
import { useTranslation } from "@/context/I18nContext";
import {
  AiAdminError,
  aiAdminRequest,
  parseOutputSchema,
  type ManagedPrompt,
} from "@/lib/ai-admin";

type Draft = {
  name: string;
  personalityPrompt: string;
  executionPrompt: string;
  schema: string;
  enabled: boolean;
};
const fromPrompt = (prompt: ManagedPrompt): Draft => ({
  name: prompt.name,
  personalityPrompt: prompt.personalityPrompt,
  executionPrompt: prompt.executionPrompt,
  schema: JSON.stringify(prompt.outputSchemaJson, null, 2),
  enabled: prompt.enabled,
});
export default function AdminPromptsPage() {
  const { t } = useTranslation();
  const [items, setItems] = useState<ManagedPrompt[]>([]);
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
    aiAdminRequest<ManagedPrompt[] | { items: ManagedPrompt[] }>("/prompts", {
      signal: controller.signal,
    })
      .then((result) => {
        const list = Array.isArray(result) ? result : result.items;
        setItems(list);
        if (list[0]) {
          setSelected(list[0]);
          setDraft(fromPrompt(list[0]));
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
    try {
      outputSchemaJson = parseOutputSchema(draft.schema);
    } catch {
      setNotice("aiAdmin.schemaError");
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
            expectedRevision: selected.revision,
          }),
        },
      );
      setSelected(item);
      setDraft(fromPrompt(item));
      setItems((previous) =>
        previous.map((row) => (row.id === item.id ? item : row)),
      );
      setNotice("aiAdmin.saved");
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
          role={notice === "aiAdmin.saved" ? "status" : "alert"}
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
              <span role="status">
                {t(dirty ? "aiAdmin.unsaved" : "aiAdmin.current")}
              </span>
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
    </section>
  );
}
