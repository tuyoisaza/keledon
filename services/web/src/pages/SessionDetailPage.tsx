import { useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function SessionDetailPage() {
    const { id } = useParams();

    return (
        <div className="space-y-6">
            <button
                onClick={() => window.location.href = '/sessions'}
                className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
            >
                <ArrowLeft className="w-4 h-4" />
                Back to Sessions
            </button>

            <div className="rounded-xl border border-border bg-card p-6">
                <h1 className="text-2xl font-bold text-foreground mb-4">Session Details</h1>
                <div className="p-4 bg-muted rounded-lg border border-border font-mono text-sm">
                    ID: {id}
                </div>
                <div className="mt-8 flex items-center justify-center h-64 border-2 border-dashed border-border rounded-lg text-muted-foreground">
                    Session Recording & Transcript Placeholder
                </div>
            </div>
        </div>
    );
}
