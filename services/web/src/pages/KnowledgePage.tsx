import { useState, useEffect, useCallback, useRef } from 'react';
import { Search, Upload, FileText, Database, Bot, RefreshCw, X, Building2, Tag, Users } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useTranslation } from '@/context/I18nContext';
import { vectorStoreAPI, type PolicyDocument, type VectorStoreStatus } from '@/lib/vector-store';
import { getCompanies, getBrands, getTeams, type Company, type Brand, type Team } from '@/lib/crud-api';
import { getBrandsForCompany, getTeamsForBrand, readPlainTextFile } from '@/lib/knowledge-source-utils.js';
import ManagementModal from '@/components/common/ManagementModal';
import KnowledgeBaseManager from '@/components/knowledge/KnowledgeBaseManager';

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
    const { user } = useAuth();
    const { t } = useTranslation();
    const canManageKnowledge = ['admin', 'coordinator', 'superadmin'].includes(user?.role || '');
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
    const loadedCompanyIds = useRef(new Set<string>());
    const loadedBrandIds = useRef(new Set<string>());
    
    // Add source modal
    const [showAddModal, setShowAddModal] = useState(false);
    const [addForm, setAddForm] = useState({
        sourceType: 'text' as 'text' | 'url' | 'file',
        content: '',
        url: '',
        file: null as File | null,
        company_id: '',
        brand_id: '',
        team_id: '',
    });

    const fetchCompanies = useCallback(async () => {
        try {
            const data = await getCompanies();
            setCompanies(data);
        } catch {
            // Keep the page usable; the data-dependent controls remain empty.
        }
    }, []);

    const fetchVectorStoreData = useCallback(async () => {
        setIsLoading(true);
        setVectorError(null);

        try {
            const status = await vectorStoreAPI.getCollectionStatus();
            setVectorStatus(status);

            const docs = await vectorStoreAPI.listAllDocuments();
            setDocuments(docs.map((d: PolicyDocument) => ({
                id: d.id,
                title: d.title,
                type: 'text' as const,
                status: 'indexed' as const,
                size: d.content ? `${Math.max(1, Math.ceil(d.content.length / 1024))} KB` : undefined,
                chunks: Math.max(1, Math.ceil((d.content ?? '').length / 500)),
                lastUpdated: new Date(d.created_at).toLocaleDateString(),
                company_id: d.company_id,
                brand_id: d.brand_id,
                team_id: d.team_id,
            })));
        } catch {
            setVectorError(t('knowledge.loadError'));
            setDocuments([]);
        } finally {
            setIsLoading(false);
        }
    }, [t]);

    useEffect(() => {
        fetchVectorStoreData();
        fetchCompanies();
    }, [fetchCompanies, fetchVectorStoreData]);

    useEffect(() => {
        if (addForm.company_id) {
            const companyBrands = brands.filter(b => b.companyId === addForm.company_id);
            if (companyBrands.length === 0 && !loadedCompanyIds.current.has(addForm.company_id)) {
                loadedCompanyIds.current.add(addForm.company_id);
                getBrands(addForm.company_id).then(setBrands);
            }
        }
    }, [addForm.company_id, brands]);

    useEffect(() => {
        if (addForm.brand_id) {
            const brandTeams = teams.filter(t => t.brandId === addForm.brand_id);
            if (brandTeams.length === 0 && !loadedBrandIds.current.has(addForm.brand_id)) {
                loadedBrandIds.current.add(addForm.brand_id);
                getTeams(addForm.company_id).then(data => setTeams(data.filter(team => team.brandId === addForm.brand_id)));
            }
        }
    }, [addForm.brand_id, addForm.company_id, teams]);

    const handleAddSource = async () => {
        if (!addForm.company_id) {
            alert(t('knowledge.selectCompany'));
            return;
        }

        let content = '';
        let title = '';

        if (addForm.sourceType === 'url') {
            content = addForm.url.trim();
            title = addForm.url.trim();
        } else if (addForm.sourceType === 'file') {
            if (!addForm.file) {
                alert(t('knowledge.selectTextFile'));
                return;
            }
            content = (await readPlainTextFile(addForm.file)).trim();
            title = addForm.file.name;
        } else {
            content = addForm.content.trim();
            title = `Text - ${new Date().toLocaleTimeString()}`;
        }

        if (!content) {
            alert(t('knowledge.enterSource'));
            return;
        }

        setIsUploading(true);
        try {
            const now = new Date().toISOString();
            const newDocument: PolicyDocument = {
                id: `doc-${Date.now()}`,
                title,
                content,
                category: 'knowledge',
                company_id: addForm.company_id,
                brand_id: addForm.brand_id || undefined,
                team_id: addForm.team_id || undefined,
                created_by: 'user',
                created_at: now,
                updated_at: now,
            };

            await vectorStoreAPI.addDocument(newDocument);
            alert(t('knowledge.sourceAdded'));
            setShowAddModal(false);
            setAddForm({
                sourceType: 'text',
                content: '',
                url: '',
                file: null,
                company_id: '',
                brand_id: '',
                team_id: '',
            });
            fetchVectorStoreData();
        } catch {
            alert(t('knowledge.addError'));
        } finally {
            setIsUploading(false);
        }
    };

    const handleDeleteDocument = async (id: string) => {
        if (!confirm(t('knowledge.confirmDelete'))) return;
        
        try {
            await vectorStoreAPI.deleteDocument(id);
            fetchVectorStoreData();
        } catch {
            alert(t('knowledge.deleteError'));
        }
    };

    const filteredDocuments = documents.filter(doc =>
        doc.title.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const getCompanyName = (id?: string) => {
        if (!id) return t('knowledge.notAvailable');
        const company = companies.find(c => c.id === id);
        return company?.name || id;
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">{t('knowledge.title')}</h1>
                    <p className="text-muted-foreground mt-1">{t('knowledge.description')}</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={fetchVectorStoreData}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors"
                    >
                        <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                        {t('knowledge.refresh')}
                    </button>
                    {canManageKnowledge && (
                        <button
                            onClick={() => setShowAddModal(true)}
                            disabled={isUploading}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
                        >
                            <Upload className="w-4 h-4" />
                            {isUploading ? t('knowledge.indexing') : t('knowledge.addSource')}
                        </button>
                    )}
                </div>
            </div>

            {/* Vector Store Status */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-card border border-border rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                        <Database className="w-4 h-4 text-primary" />
                        <span className="text-sm font-medium">{t('knowledge.vectorStore')}</span>
                    </div>
                    <div className="text-2xl font-bold text-foreground">
                        {vectorStatus?.collectionExists ? t('knowledge.connected') : t('knowledge.disconnected')}
                    </div>
                </div>

                <div className="bg-card border border-border rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                        <FileText className="w-4 h-4 text-primary" />
                        <span className="text-sm font-medium">{t('knowledge.documents')}</span>
                    </div>
                    <div className="text-2xl font-bold text-foreground">{vectorStatus?.documentCount || 0}</div>
                </div>

                <div className="bg-card border border-border rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                        <Database className="w-4 h-4 text-primary" />
                        <span className="text-sm font-medium">{t('knowledge.dimensions')}</span>
                    </div>
                    <div className="text-2xl font-bold text-foreground">{vectorStatus?.dimensions || 1536}</div>
                </div>

                <div className="bg-card border border-border rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                        <Bot className="w-4 h-4 text-primary" />
                        <span className="text-sm font-medium">{t('knowledge.distance')}</span>
                    </div>
                    <div className="text-2xl font-bold text-foreground">{vectorStatus?.distance || 'Cosine'}</div>
                </div>
            </div>

            {canManageKnowledge && <KnowledgeBaseManager companies={companies} />}

            {/* Error Message */}
            {vectorError && (
                <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive">
                    <strong>{t('knowledge.errorTitle')}</strong> {vectorError}
                </div>
            )}

            {/* Document List */}
            <div className="space-y-4">
                <div className="flex items-center gap-4">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder={t('knowledge.search')}
                            aria-label={t('knowledge.search')}
                            className="w-full pl-10 pr-4 py-2 rounded-lg bg-card border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-4">
                    {isLoading ? (
                        <div role="status" className="text-center py-10 text-muted-foreground">{t('knowledge.loading')}</div>
                    ) : filteredDocuments.length === 0 ? (
                        <div className="text-center py-10 text-muted-foreground">
                            {t('knowledge.empty')}
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
                                            <span>{doc.chunks} {t(doc.chunks === 1 ? 'knowledge.chunk' : 'knowledge.chunks')}</span>
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
                                                    {t('knowledge.brand')}: {doc.brand_id}
                                                </span>
                                            )}
                                            {doc.team_id && (
                                                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                                    <Users className="w-3 h-3" />
                                                    {t('knowledge.team')}: {doc.team_id}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className={`px-2.5 py-1 rounded text-xs font-medium uppercase ${doc.status === 'indexed' ? 'bg-success/10 text-success' :
                                        doc.status === 'indexing' ? 'bg-warning/10 text-warning' : 'bg-destructive/10 text-destructive'
                                        }`}>
                                        {t(`knowledge.status.${doc.status}`)}
                                    </div>
                                    <div className="w-px h-8 bg-border" />
                                    <span className="text-sm font-mono text-muted-foreground">{doc.size || t('knowledge.notAvailable')}</span>
                                    {canManageKnowledge && (
                                        <button
                                            onClick={() => handleDeleteDocument(doc.id)}
                                            className="p-2 text-muted-foreground hover:text-destructive rounded-lg hover:bg-destructive/10"
                                            title={t('knowledge.deleteDocument')}
                                            aria-label={t('knowledge.deleteDocument')}
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Add Source Modal */}
            {showAddModal && (
                <ManagementModal title={t('knowledge.addSourceTitle')} onClose={() => setShowAddModal(false)}>
                    <div className="rounded-xl border border-border bg-card p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h2 id="knowledge-source-title" className="text-lg font-semibold">{t('knowledge.addSourceTitle')}</h2>
                            <button
                                type="button"
                                onClick={() => setShowAddModal(false)}
                                className="p-2 hover:bg-muted rounded-lg"
                                aria-label={t('knowledge.close')}
                                autoFocus
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            {/* Source Type */}
                            <div>
                                <label className="block text-sm font-medium mb-2">{t('knowledge.sourceType')}</label>
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setAddForm(prev => ({ ...prev, sourceType: 'text' }))}
                                        aria-pressed={addForm.sourceType === 'text'}
                                        className={`flex-1 py-2 rounded-lg border ${
                                            addForm.sourceType === 'text' 
                                                ? 'bg-primary text-primary-foreground border-primary' 
                                                : 'border-border hover:bg-muted'
                                        }`}
                                    >
                                        {t('knowledge.text')}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setAddForm(prev => ({ ...prev, sourceType: 'url' }))}
                                        aria-pressed={addForm.sourceType === 'url'}
                                        className={`flex-1 py-2 rounded-lg border ${
                                            addForm.sourceType === 'url' 
                                                ? 'bg-primary text-primary-foreground border-primary' 
                                                : 'border-border hover:bg-muted'
                                        }`}
                                    >
                                        URL
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setAddForm(prev => ({ ...prev, sourceType: 'file', content: '', url: '' }))}
                                        aria-pressed={addForm.sourceType === 'file'}
                                        className={`flex-1 py-2 rounded-lg border ${
                                            addForm.sourceType === 'file'
                                                ? 'bg-primary text-primary-foreground border-primary'
                                                : 'border-border hover:bg-muted'
                                        }`}
                                    >
                                        {t('knowledge.file')}
                                    </button>
                                </div>
                            </div>

                            {/* Company */}
                            <div>
                                <label htmlFor="knowledge-company" className="block text-sm font-medium mb-2">
                                    {t('knowledge.company')} <span className="text-destructive">*</span>
                                </label>
                                <select
                                    id="knowledge-company"
                                    value={addForm.company_id}
                                    onChange={(e) => setAddForm(prev => ({ 
                                        ...prev, 
                                        company_id: e.target.value,
                                        brand_id: '',
                                        team_id: '' 
                                    }))}
                                    className="w-full px-3 py-2 border border-border rounded-lg bg-muted/50 focus:border-primary/50 outline-none"
                                >
                                    <option value="">{t('knowledge.selectCompanyOption')}</option>
                                    {companies.map(company => (
                                        <option key={company.id} value={company.id}>
                                            {company.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Brand */}
                            <div>
                                <label htmlFor="knowledge-brand" className="block text-sm font-medium mb-2">{t('knowledge.brandOptional')}</label>
                                <select
                                    id="knowledge-brand"
                                    value={addForm.brand_id}
                                    onChange={(e) => setAddForm(prev => ({ 
                                        ...prev, 
                                        brand_id: e.target.value,
                                        team_id: ''
                                    }))}
                                    disabled={!addForm.company_id}
                                    className="w-full px-3 py-2 border border-border rounded-lg bg-muted/50 focus:border-primary/50 outline-none disabled:opacity-50"
                                >
                                    <option value="">{t('knowledge.selectBrandOption')}</option>
                                    {getBrandsForCompany(brands, addForm.company_id)
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
                                <label htmlFor="knowledge-team" className="block text-sm font-medium mb-2">{t('knowledge.teamOptional')}</label>
                                <select
                                    id="knowledge-team"
                                    value={addForm.team_id}
                                    onChange={(e) => setAddForm(prev => ({ ...prev, team_id: e.target.value }))}
                                    disabled={!addForm.brand_id}
                                    className="w-full px-3 py-2 border border-border rounded-lg bg-muted/50 focus:border-primary/50 outline-none disabled:opacity-50"
                                >
                                    <option value="">{t('knowledge.selectTeamOption')}</option>
                                    {getTeamsForBrand(teams, addForm.brand_id)
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
                                <label htmlFor={addForm.sourceType === 'url' ? 'knowledge-url' : addForm.sourceType === 'file' ? 'knowledge-file' : 'knowledge-content'} className="block text-sm font-medium mb-2">
                                    {addForm.sourceType === 'url' ? 'URL' : addForm.sourceType === 'file' ? t('knowledge.plainTextFile') : t('knowledge.content')} <span className="text-destructive">*</span>
                                </label>
                                {addForm.sourceType === 'url' ? (
                                    <input
                                        id="knowledge-url"
                                        type="url"
                                        value={addForm.url}
                                        onChange={(e) => setAddForm(prev => ({ ...prev, url: e.target.value }))}
                                        placeholder="https://example.com/document"
                                        className="w-full px-3 py-2 border border-border rounded-lg bg-muted/50 focus:border-primary/50 outline-none"
                                    />
                                ) : addForm.sourceType === 'file' ? (
                                    <input
                                        id="knowledge-file"
                                        type="file"
                                        accept=".txt,text/plain"
                                        onChange={(e) => setAddForm(prev => ({ ...prev, file: e.target.files?.[0] ?? null }))}
                                        className="w-full px-3 py-2 border border-border rounded-lg bg-muted/50 focus:border-primary/50 outline-none file:mr-4 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-2 file:text-primary-foreground"
                                    />
                                ) : (
                                    <textarea
                                        id="knowledge-content"
                                        value={addForm.content}
                                        onChange={(e) => setAddForm(prev => ({ ...prev, content: e.target.value }))}
                                        placeholder={t('knowledge.contentPlaceholder')}
                                        rows={6}
                                        className="w-full px-3 py-2 border border-border rounded-lg bg-muted/50 focus:border-primary/50 outline-none resize-none"
                                    />
                                )}
                            </div>

                            <button
                                onClick={handleAddSource}
                                disabled={!addForm.company_id || (addForm.sourceType === 'url' ? !addForm.url : addForm.sourceType === 'file' ? !addForm.file : !addForm.content) || isUploading}
                                className="w-full py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isUploading ? t('knowledge.adding') : t('knowledge.addSource')}
                            </button>
                        </div>
                    </div>
                </ManagementModal>
            )}

        </div>
    );
}
