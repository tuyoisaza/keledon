import ManagementModal from "@/components/common/ManagementModal";
import RecordDetails from "@/components/common/RecordDetails";
import { useAuth } from "@/context/AuthContext";
import { useTranslation } from "@/context/I18nContext";
import {
  createWorkflow,
  deleteWorkflow,
  getWorkflows,
  updateWorkflow,
  type Workflow,
} from "@/lib/crud-api";
import { cn } from "@/lib/utils";
import {
  GitBranch,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

type WorkflowForm = {
  name: string;
  interfaceId: string;
  description: string;
  trigger: string;
  steps: string;
  variables: string;
  isEnabled: boolean;
};

const emptyForm: WorkflowForm = {
  name: "",
  interfaceId: "",
  description: "",
  trigger: '{\n  "type": "manual"\n}',
  steps: "[]",
  variables: "{}",
  isEnabled: true,
};

function formatJson(value: string | undefined, fallback: string) {
  if (!value) return fallback;
  try {
    return JSON.stringify(JSON.parse(value), null, 2);
  } catch {
    return value;
  }
}

export default function ManagementWorkflowsPage() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Workflow | null>(null);
  const [form, setForm] = useState<WorkflowForm>(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setWorkflows(await getWorkflows());
    } catch {
      toast.error(
        t("records.fetchFailedEntity").replace(
          "{entity}",
          t("records.workflowPlural"),
        ),
      );
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setShowForm(true);
  };

  const openEdit = (workflow: Workflow) => {
    setEditing(workflow);
    setForm({
      name: workflow.name,
      interfaceId: workflow.interfaceId || "",
      description: workflow.description || "",
      trigger: formatJson(workflow.trigger, "{}"),
      steps: formatJson(workflow.steps, "[]"),
      variables: formatJson(workflow.variables, "{}"),
      isEnabled: workflow.isEnabled,
    });
    setShowForm(true);
  };

  const save = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (user?.role !== "superadmin") return;
    let trigger: unknown;
    let steps: unknown;
    let variables: unknown;
    try {
      trigger = JSON.parse(form.trigger);
      steps = JSON.parse(form.steps);
      variables = JSON.parse(form.variables);
      if (!trigger || typeof trigger !== "object" || Array.isArray(trigger))
        throw new Error();
      if (!Array.isArray(steps)) throw new Error();
      if (
        !variables ||
        typeof variables !== "object" ||
        Array.isArray(variables)
      )
        throw new Error();
    } catch {
      toast.error(t("records.workflowJsonInvalid"));
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        interfaceId: form.interfaceId.trim() || undefined,
        description: form.description.trim() || undefined,
        trigger: JSON.stringify(trigger),
        steps: JSON.stringify(steps),
        variables: JSON.stringify(variables),
        isEnabled: form.isEnabled,
      };
      if (editing) {
        await updateWorkflow(editing.id, payload);
        toast.success(
          t("records.updatedEntity").replace("{entity}", t("records.workflow")),
        );
      } else {
        await createWorkflow(payload);
        toast.success(
          t("records.createdEntity").replace("{entity}", t("records.workflow")),
        );
      }
      setShowForm(false);
      await load();
    } catch {
      toast.error(
        t("records.saveFailedEntity").replace(
          "{entity}",
          t("records.workflow"),
        ),
      );
    } finally {
      setSaving(false);
    }
  };

  const remove = async (workflow: Workflow) => {
    if (user?.role !== "superadmin") return;
    const confirmed = window.confirm(t("records.confirmDeleteWorkflow"));
    if (!confirmed) return;
    try {
      await deleteWorkflow(workflow.id);
      toast.success(
        t("records.deletedEntity").replace("{entity}", t("records.workflow")),
      );
      await load();
    } catch {
      toast.error(
        t("records.deleteFailedEntity").replace(
          "{entity}",
          t("records.workflow"),
        ),
      );
    }
  };

  const filtered = workflows.filter((workflow) =>
    `${workflow.name} ${workflow.description || ""}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  const setField = <K extends keyof WorkflowForm>(
    key: K,
    value: WorkflowForm[K],
  ) => setForm((current) => ({ ...current, [key]: value }));
  const isSuperadmin = user?.role === "superadmin";

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <GitBranch className="h-6 w-6 text-primary" aria-hidden="true" />
          <div>
            <h1 className="text-2xl font-bold">
              {t("records.workflowPlural")}
            </h1>
            <p className="text-muted-foreground">
              {t("records.manageWorkflows")}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={openCreate}
          disabled={!isSuperadmin}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          {t("records.add")} {t("records.workflow")}
        </button>
      </header>

      <div className="flex items-center gap-3">
        <div className="relative max-w-md flex-1">
          <Search
            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            aria-label={t("records.searchEntity").replace(
              "{entity}",
              t("records.workflowPlural"),
            )}
            placeholder={t("records.searchEntity").replace(
              "{entity}",
              t("records.workflowPlural"),
            )}
            className="w-full rounded-lg border border-border bg-muted/50 py-2 pl-10 pr-4 outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50"
          />
        </div>
        <button
          type="button"
          onClick={() => void load()}
          aria-label={t("records.refresh")}
          title={t("records.refresh")}
          className="rounded-lg p-2 hover:bg-muted"
        >
          <RefreshCw
            className={cn("h-4 w-4", loading && "animate-spin")}
            aria-hidden="true"
          />
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2
              className="h-8 w-8 animate-spin text-primary"
              aria-label={t("records.loading")}
            />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            <GitBranch
              className="mx-auto mb-4 h-12 w-12 opacity-50"
              aria-hidden="true"
            />
            <p>
              {t("records.noEntityFound").replace(
                "{entity}",
                t("records.workflowPlural"),
              )}
            </p>
            {isSuperadmin && (
              <button
                type="button"
                onClick={openCreate}
                className="mt-4 rounded-lg bg-primary px-4 py-2 text-primary-foreground"
              >
                {t("records.addFirst").replace(
                  "{entity}",
                  t("records.workflow"),
                )}
              </button>
            )}
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-border text-left text-sm text-muted-foreground">
                <th className="px-4 py-3 font-medium">{t("records.name")}</th>
                <th className="px-4 py-3 font-medium">
                  {t("records.description")}
                </th>
                <th className="px-4 py-3 font-medium">{t("records.status")}</th>
                <th className="px-4 py-3 font-medium">
                  {t("records.updated")}
                </th>
                <th className="px-4 py-3 font-medium">
                  {t("records.actions")}
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((workflow) => (
                <tr
                  key={workflow.id}
                  className="border-b border-border hover:bg-muted/50"
                >
                  <td className="px-4 py-3 font-medium">{workflow.name}</td>
                  <td className="max-w-md truncate px-4 py-3 text-muted-foreground">
                    {workflow.description || "—"}
                  </td>
                  <td className="px-4 py-3">
                    {workflow.isEnabled
                      ? t("records.active")
                      : t("records.inactive")}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {workflow.updatedAt
                      ? new Date(workflow.updatedAt).toLocaleDateString()
                      : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <RecordDetails
                        name={workflow.name || workflow.id}
                        fields={[
                          { label: t("records.id"), value: workflow.id },
                          { label: t("records.name"), value: workflow.name },
                          {
                            label: t("records.interfaceId"),
                            value: workflow.interfaceId,
                          },
                          {
                            label: t("records.description"),
                            value: workflow.description,
                          },
                          {
                            label: t("records.trigger"),
                            value: formatJson(workflow.trigger, "{}"),
                          },
                          {
                            label: t("records.steps"),
                            value: formatJson(workflow.steps, "[]"),
                          },
                          {
                            label: t("records.variables"),
                            value: formatJson(workflow.variables, "{}"),
                          },
                          {
                            label: t("records.status"),
                            value: workflow.isEnabled
                              ? t("records.active")
                              : t("records.inactive"),
                          },
                          {
                            label: t("records.created"),
                            value: workflow.createdAt,
                          },
                          {
                            label: t("records.updated"),
                            value: workflow.updatedAt,
                          },
                        ]}
                      />
                      <button
                        type="button"
                        disabled={!isSuperadmin}
                        onClick={() => openEdit(workflow)}
                        aria-label={`${t("records.edit")} ${workflow.name}`}
                        title={t("records.edit")}
                        className="rounded p-1.5 hover:bg-muted disabled:opacity-50"
                      >
                        <Pencil className="h-4 w-4" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        disabled={!isSuperadmin}
                        onClick={() => void remove(workflow)}
                        aria-label={`${t("records.delete")} ${workflow.name}`}
                        title={t("records.delete")}
                        className="rounded p-1.5 text-destructive hover:bg-destructive/10 disabled:opacity-50"
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showForm && (
        <ManagementModal
          title={`${editing ? t("records.edit") : t("records.add")} ${t("records.workflow")}`}
          onClose={() => setShowForm(false)}
        >
          <form
            onSubmit={save}
            className="w-full max-w-2xl space-y-4 rounded-xl border border-border bg-card p-6"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">
                {editing ? t("records.edit") : t("records.add")}{" "}
                {t("records.workflow")}
              </h2>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                aria-label={t("records.close")}
                className="rounded p-1 hover:bg-muted"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
            <label className="block text-sm">
              {t("records.name")}
              <input
                required
                maxLength={160}
                value={form.name}
                onChange={(event) => setField("name", event.target.value)}
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2"
              />
            </label>
            <label className="block text-sm">
              {t("records.interfaceId")}
              <input
                value={form.interfaceId}
                onChange={(event) =>
                  setField("interfaceId", event.target.value)
                }
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2"
              />
            </label>
            <label className="block text-sm">
              {t("records.description")}
              <textarea
                maxLength={2000}
                value={form.description}
                onChange={(event) =>
                  setField("description", event.target.value)
                }
                rows={2}
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2"
              />
            </label>
            {(["trigger", "steps", "variables"] as const).map((field) => (
              <label key={field} className="block text-sm">
                {t(`records.${field}`)}
                <textarea
                  required
                  value={form[field]}
                  onChange={(event) => setField(field, event.target.value)}
                  rows={field === "steps" ? 8 : 5}
                  spellCheck={false}
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-xs"
                />
              </label>
            ))}
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.isEnabled}
                onChange={(event) =>
                  setField("isEnabled", event.target.checked)
                }
              />
              {t("records.active")}
            </label>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="rounded-lg border border-border px-4 py-2"
              >
                {t("records.cancel")}
              </button>
              <button
                type="submit"
                disabled={saving || !isSuperadmin}
                className="rounded-lg bg-primary px-4 py-2 text-primary-foreground disabled:opacity-50"
              >
                {saving ? t("records.saving") : t("records.save")}
              </button>
            </div>
          </form>
        </ManagementModal>
      )}
    </div>
  );
}
