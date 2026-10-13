import { useEffect, useState } from "react";
import { Activity, RefreshCw } from "lucide-react";
import { useTranslation } from "@/context/useTranslation";
import { AiAdminError, aiAdminRequest } from "@/lib/ai-admin";

interface Usage {
  id?: string;
  promptId?: string;
  promptRevision?: number;
  provider?: string;
  requestedModel?: string;
  responseModel?: string | null;
  inputTokens?: number | null;
  outputTokens?: number | null;
  costUsd?: number | null;
  createdAt?: string;
  outcome?: string;
}
interface Consumption {
  items: Usage[];
  totals: {
    calls: number;
    inputTokens: number | null;
    outputTokens: number | null;
    costUsd: number | null;
  };
  pricingStatus: string;
}
export default function AdminAiConsumptionPage() {
  const { t } = useTranslation();
  const [data, setData] = useState<Consumption | null>(null);
  const [error, setError] = useState("");
  const [refresh, setRefresh] = useState(0);
  const [loadedRefresh, setLoadedRefresh] = useState(-1);
  const loading = loadedRefresh !== refresh;
  useEffect(() => {
    const controller = new AbortController();
    aiAdminRequest<Consumption>("/consumption?limit=100", {
      signal: controller.signal,
    })
      .then(setData)
      .catch((failure) => {
        if (!controller.signal.aborted)
          setError(
            failure instanceof AiAdminError &&
              [401, 403].includes(failure.status)
              ? "aiAdmin.denied"
              : "aiAdmin.failed",
          );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoadedRefresh(refresh);
      });
    return () => controller.abort();
  }, [refresh]);
  const metric = (value: number | null | undefined, money = false) =>
    typeof value === "number" && Number.isFinite(value)
      ? money
        ? new Intl.NumberFormat(undefined, {
            style: "currency",
            currency: "USD",
            maximumFractionDigits: 6,
          }).format(value)
        : value.toLocaleString()
      : t("aiAdmin.unknown");
  return (
    <section className="max-w-6xl mx-auto p-4 md:p-8 space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <Activity aria-hidden="true" />
            {t("aiAdmin.consumption")}
          </h1>
          <p className="text-muted-foreground mt-2">
            {t("aiAdmin.consumptionIntro")}
          </p>
        </div>
        <button
          type="button"
          disabled={loading}
          onClick={() => { setError(""); setRefresh((value) => value + 1); }}
          className="inline-flex gap-2 items-center rounded-md border border-border px-4 py-2"
        >
          <RefreshCw className="w-4 h-4" aria-hidden="true" />
          {t("aiAdmin.reload")}
        </button>
      </header>
      {loading && <p role="status">{t("aiAdmin.loading")}</p>}
      {error && (
        <p role="alert" className="border border-border rounded-lg p-4">
          {t(error)}
        </p>
      )}
      {data && !error && (
        <>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {(
              [
                ["aiAdmin.calls", data.totals.calls, false],
                ["aiAdmin.inputTokens", data.totals.inputTokens, false],
                ["aiAdmin.outputTokens", data.totals.outputTokens, false],
                ["aiAdmin.cost", data.totals.costUsd, true],
              ] as const
            ).map(([label, value, money]) => (
              <div key={label} className="rounded-xl border border-border p-4">
                <p className="text-sm text-muted-foreground">{t(label)}</p>
                <p className="text-xl font-semibold mt-2">
                  {metric(value, money)}
                </p>
              </div>
            ))}
          </div>
          <p className="text-sm text-muted-foreground">
            {t("aiAdmin.pricingUnavailable")}
          </p>
          {data.items.length === 0 ? (
            <p className="rounded-lg border border-border p-6">
              {t("aiAdmin.emptyUsage")}
            </p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-sm text-left">
                <caption className="sr-only">
                  {t("aiAdmin.consumption")}
                </caption>
                <thead>
                  <tr>
                    {[
                      "prompt",
                      "revision",
                      "provider",
                      "model",
                      "inputTokens",
                      "outputTokens",
                      "cost",
                      "time",
                    ].map((key) => (
                      <th
                        key={key}
                        scope="col"
                        className="p-3 border-b border-border font-medium"
                      >
                        {t("aiAdmin." + key)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((item, index) => (
                    <tr key={item.id || index}>
                      <td className="p-3 border-b border-border">
                        {item.promptId || t("aiAdmin.unknown")}
                      </td>
                      <td className="p-3 border-b border-border">
                        {metric(item.promptRevision)}
                      </td>
                      <td className="p-3 border-b border-border">
                        {item.provider || t("aiAdmin.unknown")}
                      </td>
                      <td className="p-3 border-b border-border">
                        {item.responseModel ||
                          item.requestedModel ||
                          t("aiAdmin.unknown")}
                      </td>
                      <td className="p-3 border-b border-border">
                        {metric(item.inputTokens)}
                      </td>
                      <td className="p-3 border-b border-border">
                        {metric(item.outputTokens)}
                      </td>
                      <td className="p-3 border-b border-border">
                        {metric(item.costUsd, true)}
                      </td>
                      <td className="p-3 border-b border-border">
                        {item.createdAt &&
                        Number.isFinite(Date.parse(item.createdAt))
                          ? new Date(item.createdAt).toLocaleString()
                          : t("aiAdmin.unknown")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </section>
  );
}
