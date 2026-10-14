import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Eye, Pencil, Plus, RefreshCw, Trash2 } from "lucide-react";
import { useTranslation } from "@/context/I18nContext";
import ManagementModal from "@/components/common/ManagementModal";
import {
  createKnowledgeBase,
  deleteKnowledgeBase,
  getKnowledgeBase,
  getKnowledgeBases,
  updateKnowledgeBase,
  type Company,
  type KnowledgeBase,
} from "@/lib/crud-api";

type Props = { companies: Company[] };
type BaseForm = { companyId: string; name: string; description: string };

export default function KnowledgeBaseManager({ companies }: Props) {
  const { t } = useTranslation();
  const [bases, setBases] = useState<KnowledgeBase[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState<BaseForm>({
    companyId: "",
    name: "",
    description: "",
  });
  const [editing, setEditing] = useState<KnowledgeBase | null>(null);
  const [selected, setSelected] = useState<KnowledgeBase | null>(null);
  const [showForm, setShowForm] = useState(false);

  const loadBases = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      setBases(await getKnowledgeBases());
    } catch {
      setError(t("knowledge.bases.loadError"));
      setBases([]);
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void loadBases();
  }, [loadBases]);

  const startCreate = () => {
    setEditing(null);
    setForm({ companyId: companies[0]?.id || "", name: "", description: "" });
    setShowForm(true);
  };

  const startEdit = (base: KnowledgeBase) => {
    setSelected(null);
    setEditing(base);
    setForm({
      companyId: base.companyId,
      name: base.name,
      description: base.description || "",
    });
    setShowForm(true);
  };

  const openDetails = async (id: string) => {
    setError("");
    try {
      setSelected(await getKnowledgeBase(id));
    } catch {
      setError(t("knowledge.bases.loadError"));
    }
  };

  const saveBase = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = form.name.trim();
    if (!name || (!editing && !form.companyId)) return;
    setIsSaving(true);
    setError("");
    try {
      const description = form.description.trim();
      const fields = { name, description: description || null };
      if (editing) await updateKnowledgeBase(editing.id, fields);
      else
        await createKnowledgeBase({
          name,
          companyId: form.companyId,
          ...(description ? { description } : {}),
        });
      setShowForm(false);
      setEditing(null);
      await loadBases();
    } catch {
      setError(t("knowledge.bases.saveError"));
    } finally {
      setIsSaving(false);
    }
  };

  const removeBase = async (base: KnowledgeBase) => {
    if (!window.confirm(t("knowledge.bases.confirmDelete"))) return;
    setError("");
    try {
      await deleteKnowledgeBase(base.id);
      await loadBases();
    } catch {
      setError(t("knowledge.bases.deleteError"));
    }
  };

  const companyName = (companyId: string) =>
    companies.find((company) => company.id === companyId)?.name || companyId;

  return (
    <section
      aria-labelledby="knowledge-bases-heading"
      className="space-y-4 rounded-xl border border-border bg-card p-4 md:p-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="knowledge-bases-heading" className="text-lg font-semibold">
            {t("knowledge.bases.title")}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("knowledge.bases.description")}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => void loadBases()}
            className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm"
            aria-label={t("knowledge.bases.refresh")}
          >
            <RefreshCw
              className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
            />
            {t("knowledge.bases.refresh")}
          </button>
          <button
            type="button"
            onClick={startCreate}
            disabled={companies.length === 0}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            {t("knowledge.bases.create")}
          </button>
        </div>
      </div>

      {error && (
        <p
          role="alert"
          className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive"
        >
          {error}
        </p>
      )}
      {isLoading ? (
        <p
          role="status"
          className="py-5 text-center text-sm text-muted-foreground"
        >
          {t("knowledge.bases.loading")}
        </p>
      ) : bases.length === 0 ? (
        <p className="py-5 text-center text-sm text-muted-foreground">
          {t("knowledge.bases.empty")}
        </p>
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border">
          {bases.map((base) => (
            <li
              key={base.id}
              className="flex flex-wrap items-center justify-between gap-3 p-4"
            >
              <div className="min-w-0">
                <h3 className="truncate font-medium">{base.name}</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {companyName(base.companyId)} · {base._count?.documents ?? 0}{" "}
                  {t("knowledge.bases.documents")}
                </p>
                {base.description && (
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                    {base.description}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => void openDetails(base.id)}
                  className="rounded-md p-2 hover:bg-muted"
                  aria-label={`${t("knowledge.bases.view")} ${base.name}`}
                >
                  <Eye className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => startEdit(base)}
                  className="rounded-md p-2 hover:bg-muted"
                  aria-label={`${t("knowledge.bases.edit")} ${base.name}`}
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => void removeBase(base)}
                  className="rounded-md p-2 text-destructive hover:bg-destructive/10"
                  aria-label={`${t("knowledge.bases.delete")} ${base.name}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {showForm && (
        <ManagementModal
          title={
            editing
              ? t("knowledge.bases.editTitle")
              : t("knowledge.bases.createTitle")
          }
          onClose={() => setShowForm(false)}
        >
          <form
            onSubmit={saveBase}
            className="space-y-4 rounded-xl border border-border bg-card p-6"
          >
            <h3 className="text-lg font-semibold">
              {editing
                ? t("knowledge.bases.editTitle")
                : t("knowledge.bases.createTitle")}
            </h3>
            {!editing && (
              <div className="space-y-2">
                <label
                  htmlFor="knowledge-base-company"
                  className="text-sm font-medium"
                >
                  {t("knowledge.company")}
                </label>
                <select
                  id="knowledge-base-company"
                  required
                  value={form.companyId}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      companyId: event.target.value,
                    }))
                  }
                  className="w-full rounded-md border border-border bg-background px-3 py-2"
                >
                  <option value="">{t("knowledge.selectCompanyOption")}</option>
                  {companies.map((company) => (
                    <option key={company.id} value={company.id}>
                      {company.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="space-y-2">
              <label
                htmlFor="knowledge-base-name"
                className="text-sm font-medium"
              >
                {t("knowledge.bases.name")}
              </label>
              <input
                id="knowledge-base-name"
                required
                maxLength={200}
                value={form.name}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
                className="w-full rounded-md border border-border bg-background px-3 py-2"
              />
            </div>
            <div className="space-y-2">
              <label
                htmlFor="knowledge-base-description"
                className="text-sm font-medium"
              >
                {t("knowledge.bases.descriptionLabel")}
              </label>
              <textarea
                id="knowledge-base-description"
                maxLength={4000}
                value={form.description}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
                rows={3}
                className="w-full rounded-md border border-border bg-background px-3 py-2"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="rounded-md border border-border px-4 py-2"
              >
                {t("knowledge.close")}
              </button>
              <button
                type="submit"
                disabled={isSaving || !form.name.trim()}
                className="rounded-md bg-primary px-4 py-2 text-primary-foreground disabled:opacity-50"
              >
                {isSaving
                  ? t("knowledge.bases.saving")
                  : t("knowledge.bases.save")}
              </button>
            </div>
          </form>
        </ManagementModal>
      )}

      {selected && (
        <ManagementModal
          title={t("knowledge.bases.detailsTitle")}
          onClose={() => setSelected(null)}
        >
          <div className="space-y-4 rounded-xl border border-border bg-card p-6">
            <h3 className="text-lg font-semibold">{selected.name}</h3>
            <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <dt className="text-sm text-muted-foreground">
                  {t("knowledge.company")}
                </dt>
                <dd>{companyName(selected.companyId)}</dd>
              </div>
              <div>
                <dt className="text-sm text-muted-foreground">
                  {t("knowledge.bases.documents")}
                </dt>
                <dd>{selected._count?.documents ?? 0}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-sm text-muted-foreground">
                  {t("knowledge.bases.descriptionLabel")}
                </dt>
                <dd>{selected.description || t("knowledge.notAvailable")}</dd>
              </div>
            </dl>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => startEdit(selected)}
                className="rounded-md bg-primary px-4 py-2 text-primary-foreground"
              >
                {t("knowledge.bases.editAction")}
              </button>
            </div>
          </div>
        </ManagementModal>
      )}
    </section>
  );
}
