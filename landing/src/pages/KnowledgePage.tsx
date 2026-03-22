import { useState, useEffect } from 'react';
import { Search, Upload, FileText, Database, Bot, RefreshCw, X, Building2, Tag, Users } from 'lucide-react';
import { API_URL } from '@/lib/config';
import { vectorStoreAPI, type PolicyDocument, type VectorStoreStatus } from '@/lib/vector-store';
import { getCompanies, getBrands, getTeams, type Company, type Brand, type Team } from '@/lib/crud-api';

interface KnowledgeDocument {
    id: string;
    title: string;
    type: 'pdf' | 'docx' | 'url' | 'text';
    status: 'indexed' | 'indexing' | 'error';
    size?: string;
    chunks: number;
    lastUpdated: string;
    company_id?: string;
    brand_id?: string;
    team_id?: string;
}

export default function KnowledgePage() {
    const [documents, setDocuments] = useState<KnowledgeDocument[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isUploading, setIsUploading] = useState(false);
    
    // Vector store state
    const [vectorStatus, setVectorStatus] = useState<VectorStoreStatus | null>(null);
    const [vectorError, setVectorError] = useState<string | null>(null);
    
    // Company/Brand/Team for filtering and adding
    const [companies, setCompanies] = useState<Company[]>([]);
    const [brands, setBrands] = useState<Brand[]>([]);
    const [teams, setTeams] = useState<Team[]>([]);
    
    // Add source modal
    const [showAddModal, setShowAddModal] = useState(false);
    const [addForm, setAddForm] = useState({
        sourceType: 'text' as 'text' | 'url',
        content: '',
        url: '',
        company_id: '',
        brand_id: '',
        team_id: '',
    });

    useEffect(() => {
        fetchVectorStoreData();
        fetchCompanies();
    }, []);

    useEffect(() => {
        if (addForm.company_id) {
            const companyBrands = brands.filter(b => b.companyId === addForm.company_id);
            if (companyBrands.length === 0) {
                getBrands(addForm.company_id).then(setBrands);
            }
        }
    }, [addForm.company_id]);

    useEffect(() => {
        if (addForm.brand_id) {
            const brandTeams = teams.filter(t => t.brandId === addForm.brand_id);
            if (brandTeams.length === 0) {
                getTeams(addForm.company_id, addForm.brand_id).then(setTeams);
            }
        }
    }, [addForm.brand_id]);

    const fetchCompanies = async () => {
        try {
            const data = await getCompanies();
            setCompanies(data);
        } catch (err) {
            console.error('Failed to fetch companies', err);
        }
    };

    const fetchVectorStoreData = async () => {
        setIsLoading(true);
        setVectorError(null);
        
        try {
            // Fetch vector store status
            const status = await vectorStoreAPI.getCollectionStatus();
            setVectorStatus(status);
            
            // Fetch all documents from vector store
            const docs = await vectorStoreAPI.listAllDocuments();
            setDocuments(docs.map((d: PolicyDocument) => ({
                id: d.id,
                title: d.title,
                type: 'text' as const,
                status: 'indexed' as const,
                size: d.content ? `${Math.round(d.content.length / 1024)} KB` : undefined,
                chunks: Math.max(1, Math.ceil(d.content.length / 500)),
                lastUpdated: new Date(d.created_at).toLocaleDateString(),
                company_id: d.company_id,
                brand_id: d.brand_id,
                team_id: d.team_id,
            })));
        } catch (err: any) {
            console.error('Failed to fetch vector store data', err);
            setVectorError(err.message || 'Failed to connect to vector store. Please check configuration.');
            setDocuments([]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleAddSource = async () => {
        if (!addForm.company_id) {
            alert('Please select a company');
            return;
        }
        
        const content = addForm.sourceType === 'url' ? addForm.url : addForm.content;
        if (!content.trim()) {
            alert('Please enter content or URL');
            return;
        }

        setIsUploading(true);
        try {
            const now = new Date().toISOString();
            const newDocument: PolicyDocument = {
                id: `doc-${Date.now()}`,
                title: addForm.sourceType === 'url' ? addForm.url : `Text - ${new Date().toLocaleTimeString()}`,
                content: content,
                category: 'knowledge',
                company_id: addForm.company_id,
                brand_id: addForm.brand_id || undefined,
                team_id: addForm.team_id || undefined,
                created_by: 'user',
                created_at: now,
                updated_at: now,
            };

            await vectorStoreAPI.addDocument(newDocument);
            alert('Source added and indexed in vector store!');
            setShowAddModal(false);
            setAddForm({
                sourceType: 'text',
                content: '',
                url: '',
                company_id: '',
                brand_id: '',
                team_id: '',
            });
            fetchVectorStoreData();
        } catch (err: any) {
            console.error(err);
            alert('Error adding source: ' + err.message);
        } finally {
            setIsUploading(false);
        }
    };

    const handleDeleteDocument = async (id: string) => {
        if (!confirm('Are you sure you want to delete this document from the vector store?')) return;
        
        try {
            await vectorStoreAPI.deleteDocument(id);
            fetchVectorStoreData();
        } catch (err: any) {
            alert('Error deleting document: ' + err.message);
        }
    };

    const filteredDocuments = documents.filter(doc =>
        doc.title.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const getCompanyName = (id?: string) => {
        if (!id) return 'N/A';
        const company = companies.find(c => c.id === id);
        return company?.name || id;
    };

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
                        onClick={fetchVectorStoreData}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors"
                    >
                        <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                        Refresh
                    </button>
                    <button
                        onClick={() => setShowAddModal(true)}
                        disabled={isUploading}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
                    >
                        <Upload className="w-4 h-4" />
                        {isUploading ? 'Indexing...' : 'Add Source'}
                    </button>
                </div>
            </div>

            {/* Vector Store Status */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-card border border-border rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                        <Database className="w-4 h-4 text-primary" />
                        <span className="text-sm font-medium">Vector Store</span>
                    </div>
                    <div className="text-2xl font-bold text-foreground">
                        {vectorStatus?.collectionExists ? 'Connected' : 'Disconnected'}
                    </div>
                </div>

                <div className="bg-card border border-border rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                        <FileText className="w-4 h-4 text-primary" />
                        <span className="text-sm font-medium">Documents</span>
                    </div>
                    <div className="text-2xl font-bold text-foreground">{vectorStatus?.documentCount || 0}</div>
                </div>

                <div className="bg-card border border-border rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                        <Database className="w-4 h-4 text-primary" />
                        <span className="text-sm font-medium">Dimensions</span>
                    </div>
                    <div className="text-2xl font-bold text-foreground">{vectorStatus?.dimensions || 1536}</div>
                </div>

                <div className="bg-card border border-border rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                        <Bot className="w-4 h-4 text-primary" />
                        <span className="text-sm font-medium">Distance</span>
                    </div>
                    <div className="text-2xl font-bold text-foreground">{vectorStatus?.distance || 'Cosine'}</div>
                </div>
            </div>

            {/* Error Message */}
            {vectorError && (
                <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive">
                    <strong>Vector Store Error:</strong> {vectorError}
                    <p className="text-sm mt-1">Please configure QDRANT_URL and OPENAI_API_KEY in your environment.</p>
                </div>
            )}

            {/* Agent Context Simulator (Demo) */}
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
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-4">
                    {isLoading ? (
                        <div className="text-center py-10 text-muted-foreground">Loading documents...</div>
                    ) : filteredDocuments.length === 0 ? (
                        <div className="text-center py-10 text-muted-foreground">
                            No documents found. Add a source to get started.
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
                                        <div className="flex items-center gap-2 mt-1">
                                            {doc.company_id && (
                                                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                                    <Building2 className="w-3 h-3" />
                                                    {getCompanyName(doc.company_id)}
                                                </span>
                                            )}
                                            {doc.brand_id && (
                                                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                                    <Tag className="w-3 h-3" />
                                                    {doc.brand_id}
                                                </span>
                                            )}
                                            {doc.team_id && (
                                                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                                    <Users className="w-3 h-3" />
                                                    {doc.team_id}
                                                </span>
                                            )}
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
                                    <button
                                        onClick={() => handleDeleteDocument(doc.id)}
                                        className="p-2 text-muted-foreground hover:text-destructive rounded-lg hover:bg-destructive/10"
                                        title="Delete document"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Add Source Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-card border border-border rounded-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-lg font-semibold">Add Knowledge Source</h2>
                            <button
                                onClick={() => setShowAddModal(false)}
                                className="p-2 hover:bg-muted rounded-lg"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            {/* Source Type */}
                            <div>
                                <label className="block text-sm font-medium mb-2">Source Type</label>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setAddForm(prev => ({ ...prev, sourceType: 'text' }))}
                                        className={`flex-1 py-2 rounded-lg border ${
                                            addForm.sourceType === 'text' 
                                                ? 'bg-primary text-primary-foreground border-primary' 
                                                : 'border-border hover:bg-muted'
                                        }`}
                                    >
                                        Text
                                    </button>
                                    <button
                                        onClick={() => setAddForm(prev => ({ ...prev, sourceType: 'url' }))}
                                        className={`flex-1 py-2 rounded-lg border ${
                                            addForm.sourceType === 'url' 
                                                ? 'bg-primary text-primary-foreground border-primary' 
                                                : 'border-border hover:bg-muted'
                                        }`}
                                    >
                                        URL
                                    </button>
                                </div>
                            </div>

                            {/* Company */}
                            <div>
                                <label className="block text-sm font-medium mb-2">
                                    Company <span className="text-destructive">*</span>
                                </label>
                                <select
                                    value={addForm.company_id}
                                    onChange={(e) => setAddForm(prev => ({ 
                                        ...prev, 
                                        company_id: e.target.value,
                                        brand_id: '',
                                        team_id: '' 
                                    }))}
                                    className="w-full px-3 py-2 border border-border rounded-lg bg-muted/50 focus:border-primary/50 outline-none"
                                >
                                    <option value="">Select company...</option>
                                    {companies.map(company => (
                                        <option key={company.id} value={company.id}>
                                            {company.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Brand */}
                            <div>
                                <label className="block text-sm font-medium mb-2">Brand (Optional)</label>
                                <select
                                    value={addForm.brand_id}
                                    onChange={(e) => setAddForm(prev => ({ 
                                        ...prev, 
                                        brand_id: e.target.value,
                                        team_id: ''
                                    }))}
                                    disabled={!addForm.company_id}
                                    className="w-full px-3 py-2 border border-border rounded-lg bg-muted/50 focus:border-primary/50 outline-none disabled:opacity-50"
                                >
                                    <option value="">Select brand...</option>
                                    {brands
                                        .filter(b => b.company_id === addForm.company_id)
                                        .map(brand => (
                                            <option key={brand.id} value={brand.id}>
                                                {brand.name}
                                            </option>
                                        ))
                                    }
                                </select>
                            </div>

                            {/* Team */}
                            <div>
                                <label className="block text-sm font-medium mb-2">Team (Optional)</label>
                                <select
                                    value={addForm.team_id}
                                    onChange={(e) => setAddForm(prev => ({ ...prev, team_id: e.target.value }))}
                                    disabled={!addForm.brand_id}
                                    className="w-full px-3 py-2 border border-border rounded-lg bg-muted/50 focus:border-primary/50 outline-none disabled:opacity-50"
                                >
                                    <option value="">Select team...</option>
                                    {teams
                                        .filter(t => t.brand_id === addForm.brand_id)
                                        .map(team => (
                                            <option key={team.id} value={team.id}>
                                                {team.name}
                                            </option>
                                        ))
                                    }
                                </select>
                            </div>

                            {/* Content */}
                            <div>
                                <label className="block text-sm font-medium mb-2">
                                    {addForm.sourceType === 'url' ? 'URL' : 'Content'} <span className="text-destructive">*</span>
                                </label>
                                {addForm.sourceType === 'url' ? (
                                    <input
                                        type="url"
                                        value={addForm.url}
                                        onChange={(e) => setAddForm(prev => ({ ...prev, url: e.target.value }))}
                                        placeholder="https://example.com/document"
                                        className="w-full px-3 py-2 border border-border rounded-lg bg-muted/50 focus:border-primary/50 outline-none"
                                    />
                                ) : (
                                    <textarea
                                        value={addForm.content}
                                        onChange={(e) => setAddForm(prev => ({ ...prev, content: e.target.value }))}
                                        placeholder="Enter text content to add to knowledge base..."
                                        rows={6}
                                        className="w-full px-3 py-2 border border-border rounded-lg bg-muted/50 focus:border-primary/50 outline-none resize-none"
                                    />
                                )}
                            </div>

                            <button
                                onClick={handleAddSource}
                                disabled={!addForm.company_id || (!addForm.content && !addForm.url) || isUploading}
                                className="w-full py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isUploading ? 'Adding to Vector Store...' : 'Add Source'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
