import { Activity, Clock3, Mic, PhoneCall, Workflow } from 'lucide-react';

const stateTimeline = [
    'call_received',
    'listening',
    'transcribing',
    'thinking',
    'action_required',
    'executing_rpa',
    'reporting',
];

export default function CallMonitorPlaceholder() {
    return (
        <section className="rounded-xl border border-border bg-card p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                    <div className="inline-flex items-center gap-2 rounded-full border border-green-500/20 bg-green-500/10 px-3 py-1 text-xs font-medium text-green-500">
                        <PhoneCall className="h-3.5 w-3.5" />
                        Live Call Monitor Stub
                    </div>
                    <h2 className="mt-3 text-lg font-semibold text-foreground">Call monitor placeholder</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Preview of session states, command handoff, and evidence return without changing existing live-session APIs.
                    </p>
                </div>
                <div className="rounded-lg border border-border bg-background px-4 py-3">
                    <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                        <Clock3 className="h-4 w-4 text-primary" />
                        Canonical loop
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">Standby to closed, with escalation and failure paths preserved outside the happy path.</p>
                </div>
            </div>

            <div className="mt-6 grid gap-4 xl:grid-cols-[1fr_0.95fr]">
                <div className="rounded-xl border border-border bg-background/60 p-4">
                    <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-foreground">
                        <Workflow className="h-4 w-4 text-primary" />
                        Session state timeline
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {stateTimeline.map((state, index) => (
                            <div key={state} className="flex items-center gap-2">
                                <span className="rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-foreground">
                                    {state}
                                </span>
                                {index < stateTimeline.length - 1 && <Activity className="h-3.5 w-3.5 text-muted-foreground" />}
                            </div>
                        ))}
                    </div>
                </div>

                <div className="grid gap-3">
                    <div className="rounded-lg border border-border bg-background px-4 py-4">
                        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                            <Mic className="h-4 w-4 text-primary" />
                            Transcript turn payload
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Final STT turns feed decisioning, then Cloud issues either speech output or an RPA command bundle.
                        </p>
                    </div>
                    <div className="rounded-lg border border-border bg-background px-4 py-4">
                        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                            <PhoneCall className="h-4 w-4 text-primary" />
                            Placeholder note
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">
                            This monitor is static for now. It does not poll new endpoints or alter how sessions are loaded on this page.
                        </p>
                    </div>
                </div>
            </div>
        </section>
    );
}
