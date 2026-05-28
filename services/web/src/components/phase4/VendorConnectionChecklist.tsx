import { CheckCircle2, KeyRound, Link2, ServerCog, ShieldAlert } from 'lucide-react';

const checklistItems = [
    'Vendor base URL entered for the target environment',
    'Credential material stored in encrypted fields or future secret references',
    'Team ownership confirmed before enabling browser execution',
    'Connection test and credential rotation endpoints reserved for the next slice',
];

export default function VendorConnectionChecklist() {
    return (
        <section className="rounded-xl border border-border bg-card p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                    <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-500">
                        <Link2 className="h-3.5 w-3.5" />
                        Connection Readiness
                    </div>
                    <h2 className="mt-3 text-lg font-semibold text-white">Vendor connection checklist</h2>
                    <p className="mt-1 text-sm text-gray-400">
                        Additive Phase 4 stub for the future `test-connection` and credential rotation workflow.
                    </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-lg border border-gray-700 bg-gray-900/70 px-4 py-3">
                        <div className="flex items-center gap-2 text-sm font-medium text-white">
                            <ServerCog className="h-4 w-4 text-primary" />
                            Planned endpoint
                        </div>
                        <p className="mt-1 text-xs text-gray-400">`POST /api/vendors/:vendorId/test-connection`</p>
                    </div>
                    <div className="rounded-lg border border-gray-700 bg-gray-900/70 px-4 py-3">
                        <div className="flex items-center gap-2 text-sm font-medium text-white">
                            <KeyRound className="h-4 w-4 text-primary" />
                            Planned rotation
                        </div>
                        <p className="mt-1 text-xs text-gray-400">`POST /api/vendors/:vendorId/rotate-credentials`</p>
                    </div>
                </div>
            </div>

            <div className="mt-6 grid gap-3 md:grid-cols-2">
                {checklistItems.map((item) => (
                    <div key={item} className="flex items-start gap-3 rounded-lg border border-gray-700 bg-gray-900/40 px-4 py-3">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-400" />
                        <span className="text-sm text-gray-200">{item}</span>
                    </div>
                ))}
            </div>

            <div className="mt-4 flex items-start gap-3 rounded-lg border border-amber-500/20 bg-amber-500/10 px-4 py-3">
                <ShieldAlert className="mt-0.5 h-4 w-4 text-amber-400" />
                <p className="text-sm text-amber-100">
                    Stub note: this panel does not perform live checks. Existing vendor CRUD behavior stays unchanged in this slice.
                </p>
            </div>
        </section>
    );
}
