import { toast } from 'sonner';
import type { Dispatch, SetStateAction } from 'react';


type BrainLogsPanelProps = {
  brainLogs: string[];
  setBrainLogs: Dispatch<SetStateAction<string[]>>;
};

export function BrainLogsPanel(props: BrainLogsPanelProps) {
  return (
<details className="mt-4 rounded-lg border border-border">
          <summary className="flex cursor-pointer items-center justify-between px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground">
            <span>Brain Logs ({props.brainLogs.length})</span>
            <span className="flex items-center gap-2">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  navigator.clipboard.writeText(props.brainLogs.join("\n"));
                  toast.success("Logs copied to clipboard");
                }}
                className="rounded border border-border px-2 py-0.5 text-xs hover:bg-muted"
              >
                Copy
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  props.setBrainLogs([]);
                }}
                className="rounded border border-border px-2 py-0.5 text-xs hover:bg-muted"
              >
                Clear
              </button>
            </span>
          </summary>
          <pre className="max-h-48 overflow-auto px-4 pb-3 text-xs text-muted-foreground">
            {props.brainLogs.length === 0 ? (
              <span className="italic">No logs yet</span>
            ) : (
              props.brainLogs.map((l, i) => (
                <div key={i} className="py-0.5 leading-relaxed">
                  {l}
                </div>
              ))
            )}
          </pre>
        </details>
  );
}
