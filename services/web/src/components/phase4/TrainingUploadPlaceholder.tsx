import { Database, FileUp, Tags, UploadCloud } from 'lucide-react';

const uploadLanes = [
    {
        title: 'Policy and FAQ documents',
        detail: 'Upload text, URL content, or plain text files that map to the knowledge document contract.',
    },
    {
        title: 'Vendor guides and scripts',
        detail: 'Reserve category, language, country, and effective date metadata for downstream ingestion.',
    },
    {
        title: 'Ingestion pipeline',
        detail: 'Future flow will chunk content, generate embeddings, and push points into the vector store.',
    },
];

export default function TrainingUploadPlaceholder() {
    return (
        <section className="rounded-xl border border-border bg-card p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                    <div className="inline-flex items-center gap-2 rounded-full border border-sky-500/20 bg-sky-500/10 px-3 py-1 text-xs font-medium text-sky-500">
                        <UploadCloud className="h-3.5 w-3.5" />
                        Training Intake Stub
                    </div>
                    <h2 className="mt-3 text-lg font-semibold text-foreground">Training upload placeholder</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                        UI-only preview for the knowledge base upload path described in the Phase 3 API design.
                    </p>
                </div>
                <div className="rounded-lg border border-border bg-background px-4 py-3">
                    <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                        <Database className="h-4 w-4 text-primary" />
                        Planned ingestion route
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">`POST /api/knowledge-bases/:id/documents` then `POST /api/knowledge-bases/:id/ingest`</p>
                </div>
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
                <div className="grid gap-3">
                    {uploadLanes.map((lane) => (
                        <div key={lane.title} className="rounded-lg border border-border bg-background/60 px-4 py-4">
                            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                                <FileUp className="h-4 w-4 text-primary" />
                                {lane.title}
                            </div>
                            <p className="mt-1 text-sm text-muted-foreground">{lane.detail}</p>
                        </div>
                    ))}
                </div>

                <div className="rounded-xl border border-dashed border-border bg-muted/30 p-4">
                    <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                        <Tags className="h-4 w-4 text-primary" />
                        Metadata scaffold
                    </div>
                    <div className="mt-3 grid gap-2 text-xs text-muted-foreground">
                        <div className="rounded-lg border border-border bg-card px-3 py-2">category: policy | faq | script | vendor-guide</div>
                        <div className="rounded-lg border border-border bg-card px-3 py-2">language: es-MX, en-US, pt-BR</div>
                        <div className="rounded-lg border border-border bg-card px-3 py-2">scope: company, brand, team</div>
                        <div className="rounded-lg border border-border bg-card px-3 py-2">source: upload, manual, seed</div>
                    </div>
                    <p className="mt-4 text-sm text-muted-foreground">
                        Placeholder only. The existing add-source modal and vector store actions remain the active path.
                    </p>
                </div>
            </div>
        </section>
    );
}
