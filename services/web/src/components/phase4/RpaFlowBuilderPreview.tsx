import { GitBranch, Play, ShieldCheck, Waypoints } from 'lucide-react';

const flowSteps = [
    {
        id: '01',
        title: 'Call Received',
        detail: 'Browser reports the inbound event and Cloud opens the session contract.',
        badge: 'call.received',
    },
    {
        id: '02',
        title: 'Select Flow',
        detail: 'Cloud chooses the team flow and resolves vendor credentials by reference.',
        badge: 'rpa.flow.selected',
    },
    {
        id: '03',
        title: 'Execute Vendor Steps',
        detail: 'Browser performs login, navigate, input, extract, and decision steps only from Cloud commands.',
        badge: 'rpa.command.issued',
    },
    {
        id: '04',
        title: 'Return Evidence',
        detail: 'Step results send extracted data and screenshots back for the next decision.',
        badge: 'rpa.step.completed',
    },
];

export default function RpaFlowBuilderPreview() {
    return (
        <section className="rounded-xl border border-border bg-card p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-2">
                    <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                        <Waypoints className="h-3.5 w-3.5" />
                        Phase 4 Preview
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold text-foreground">RPA flow builder preview</h2>
                        <p className="text-sm text-muted-foreground">
                            Static preview of the Cloud-decides, Browser-executes loop defined in the operational API plan.
                        </p>
                    </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-lg border border-border bg-background px-4 py-3">
                        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                            <Play className="h-4 w-4 text-primary" />
                            Command bundle
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">`rpa.executeFlow`, `tts.play`, `call.close`, `call.transfer`</p>
                    </div>
                    <div className="rounded-lg border border-border bg-background px-4 py-3">
                        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                            <ShieldCheck className="h-4 w-4 text-primary" />
                            Redaction guard
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">Sensitive values stay in credential references, not inline steps.</p>
                    </div>
                </div>
            </div>

            <div className="mt-6 grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
                <div className="rounded-xl border border-border bg-background/60 p-4">
                    <div className="mb-4 flex items-center gap-2 text-sm font-medium text-foreground">
                        <GitBranch className="h-4 w-4 text-primary" />
                        Flow path
                    </div>
                    <div className="grid gap-3">
                        {flowSteps.map((step) => (
                            <div key={step.id} className="rounded-lg border border-border bg-card px-4 py-4">
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <div className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
                                            Step {step.id}
                                        </div>
                                        <div className="mt-1 text-sm font-semibold text-foreground">{step.title}</div>
                                        <p className="mt-1 text-sm text-muted-foreground">{step.detail}</p>
                                    </div>
                                    <span className="rounded-md bg-primary/10 px-2 py-1 text-[11px] font-medium text-primary">
                                        {step.badge}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="rounded-xl border border-dashed border-primary/30 bg-primary/5 p-4">
                    <h3 className="text-sm font-semibold text-foreground">Builder stub note</h3>
                    <p className="mt-2 text-sm text-muted-foreground">
                        This slice is intentionally UI-only. It previews the future flow builder structure without creating, editing,
                        or running flows through new API calls.
                    </p>
                    <div className="mt-4 space-y-2 text-xs text-muted-foreground">
                        <div className="rounded-lg border border-border bg-background px-3 py-2">
                            Required step types: login, navigate, click, input, extract, wait, decision, speak, close.
                        </div>
                        <div className="rounded-lg border border-border bg-background px-3 py-2">
                            Expected result payload: status, timestamps, extracted fields, evidence, and error state.
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
