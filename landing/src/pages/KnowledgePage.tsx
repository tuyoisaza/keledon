import { useState, useEffect } from 'react';
import { Search, Upload, FileText, Database, Bot, RefreshCw } from 'lucide-react';
import { API_URL } from '@/lib/config';

interface KnowledgeDocument {
    id: string;
    title: string;
    type: 'pdf' | 'docx' | 'url' | 'text';
    status: 'indexed' | 'indexing' | 'error';
    size?: string;
    chunks: number;
    lastUpdated: string;
}

export default function KnowledgePage() {
    const [documents, setDocuments] = useState<KnowledgeDocument[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isUploading, setIsUploading] = useState(false);

    useEffect(() => {
        fetchDocuments();
    }, []);

    const fetchDocuments = async () => {
        setIsLoading(true);
        try {
            const res = await fetch(`${API_URL}/api/knowledge/documents`);
            if (res.ok) {
                const data = await res.json();
                setDocuments(data.map((d: any) => ({
                    id: d.id,
                    title: d.title,
                    type: d.type,
                    status: d.status,
                    size: d.size_bytes ? `${Math.round(d.size_bytes / 1024)} KB` : undefined,
                    chunks: d.chunk_count,
                    lastUpdated: new Date(d.created_at).toLocaleDateString(),
                })));
            }
        } catch (err) {
            console.error('Failed to fetch documents', err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSearch = async (query: string) => {
        setSearchQuery(query);
        // For now, we filter locally to avoid excessive API calls on keystroke.
        // For real-time RAG search visualization, users should use the "Live Agent Context" simulator.
    };

    const handleAddSource = async () => {
        const url = prompt("Enter URL or Text to index:");
        if (!url) return;

        setIsUploading(true);
        try {
            // Determine if URL or Text
            const isUrl = url.startsWith('http');
            const body = {
                title: isUrl ? url : `Text Snippet - ${new Date().toLocaleTimeString()}`,
                content: url, // For now, assuming direct text or URL
                type: isUrl ? 'url' : 'text'
            };

            const res = await fetch(`${API_URL}/api/knowledge/documents`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            if (res.ok) {
                alert('Source added! Indexing started...');
                fetchDocuments();
            } else {
                alert('Failed to add source');
            }
        } catch (err) {
            console.error(err);
            alert('Error adding source');
        } finally {
            setIsUploading(false);
        }
    };

    const filteredDocuments = documents.filter(doc =>
        doc.title.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Knowledge Base</h1>
                    <p className="text-muted-foreground mt-1">Manage documents and vector embeddings for Agent RAG</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={fetchDocuments}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors"
                    >
                        <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                        Refresh
                    </button>
                    <button
                        onClick={handleAddSource}
                        disabled={isUploading}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
                    >
                        <Upload className="w-4 h-4" />
                        {isUploading ? 'Indexing...' : 'Add Source'}
                    </button>
                </div>
            </div>

            {/* Agent Context Simulator (Moved from Connect) */}
            <div className="rounded-xl border border-border bg-card p-6">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-4">
                        <div className="p-2 rounded-lg bg-primary/10 text-primary">
                            <Bot className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="font-semibold text-foreground">Live Agent Context</h2>
                            <p className="text-xs text-muted-foreground">Real-time transcription and RAG retrieval</p>
                        </div>
                    </div>
                    <span className="px-2 py-1 rounded text-xs font-mono bg-muted text-muted-foreground">session: active</span>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Live Transcription */}
                    <div className="space-y-4 p-4 rounded-lg bg-muted/50 border border-border">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
                            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Listening</span>
                        </div>
                        <div className="h-16 flex items-center justify-center gap-0.5">
                            {Array.from({ length: 40 }).map((_, i) => (
                                <div
                                    key={i}
                                    className="w-1 bg-primary/50 rounded-full transition-all duration-75"
                                    style={{
                                        height: `${20 + (i % 5) * 15}%`,
                                        opacity: 0.5 + (i % 3) * 0.2,
                                    }}
                                />
                            ))}
                        </div>
                        <p className="text-lg font-medium text-foreground">"I need to check the status of my refund... it's been over 5 days."</p>
                        <div className="flex gap-2">
                            <span className="text-xs px-2 py-1 rounded bg-background border border-border text-muted-foreground">intent: check_refund_status</span>
                            <span className="text-xs px-2 py-1 rounded bg-background border border-border text-muted-foreground">confidence: 0.94</span>
                        </div>
                    </div>

                    {/* RAG Results */}
                    <div className="space-y-3">
                        <h3 className="text-sm font-medium text-muted-foreground mb-2">Relevant Knowledge</h3>
                        <div className="p-3 rounded-lg bg-secondary/50 border border-border hover:border-primary/30 transition-colors cursor-pointer">
                            <div className="flex items-start justify-between mb-1">
                                <span className="text-sm font-medium text-foreground">Refund Policy - Processing Times</span>
                                <span className="text-xs text-primary font-mono">92% match</span>
                            </div>
                            <p className="text-xs text-muted-foreground line-clamp-2">Standard refunds differ by payment method. Credit card refunds typically take 5-10 business days...</p>
                        </div>
                        <div className="p-3 rounded-lg bg-card border border-border hover:border-primary/30 transition-colors cursor-pointer">
                            <div className="flex items-start justify-between mb-1">
                                <span className="text-sm font-medium text-foreground">Escalating Refund Requests</span>
                                <span className="text-xs text-muted-foreground font-mono">65% match</span>
                            </div>
                            <p className="text-xs text-muted-foreground line-clamp-2">If a customer has waited longer than 10 business days, open a Tier 2 ticket...</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Document List */}
            <div className="space-y-4">
                <div className="flex items-center gap-4">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="Search knowledge documents..."
                            className="w-full pl-10 pr-4 py-2 rounded-lg bg-card border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                            value={searchQuery}
                            onChange={(e) => handleSearch(e.target.value)}
                        />
                    </div>
                    <div className="flex gap-2">
                        <button className="p-2 rounded-lg hover:bg-muted text-muted-foreground"><Database className="w-5 h-5" /></button>
                        <button className="p-2 rounded-lg hover:bg-muted text-muted-foreground"><Bot className="w-5 h-5" /></button>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-4">
                    {filteredDocuments.length === 0 ? (
                        <div className="text-center py-10 text-muted-foreground">
                            {isLoading ? 'Loading documents...' : 'No documents found. Add a source to get started.'}
                        </div>
                    ) : (
                        filteredDocuments.map(doc => (
                            <div key={doc.id} className="flex items-center justify-between p-4 rounded-xl border border-border bg-card hover:shadow-sm transition-all">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 rounded-lg bg-primary/10 text-primary">
                                        <FileText className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h3 className="font-medium text-foreground">{doc.title}</h3>
                                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                                            <span className="uppercase">{doc.type}</span>
                                            <span>•</span>
                                            <span>{doc.chunks} chunks</span>
                                            <span>•</span>
                                            <span>{doc.lastUpdated}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className={`px-2.5 py-1 rounded text-xs font-medium uppercase ${doc.status === 'indexed' ? 'bg-success/10 text-success' :
                                        doc.status === 'indexing' ? 'bg-warning/10 text-warning' : 'bg-destructive/10 text-destructive'
                                        }`}>
                                        {doc.status}
                                    </div>
                                    <div className="w-px h-8 bg-border" />
                                    <span className="text-sm font-mono text-muted-foreground">{doc.size || 'N/A'}</span>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
