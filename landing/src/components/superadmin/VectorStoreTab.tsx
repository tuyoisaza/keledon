import { useState, useEffect } from 'react';
import { Database, Plus, Search, FileText, Trash2, RefreshCw, Eye, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { vectorStoreAPI, type PolicyDocument, type RetrievalResult, type VectorStoreStatus } from '@/lib/vector-store';

export default function VectorStoreTab() {
  const [status, setStatus] = useState<VectorStoreStatus | null>(null);
  const [documents, setDocuments] = useState<PolicyDocument[]>([]);
  const [searchResults, setSearchResults] = useState<RetrievalResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingDocument, setEditingDocument] = useState<PolicyDocument | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    category: 'knowledge' as const,
    metadata: ''
  });

  useEffect(() => {
    fetchStatus();
    fetchDocuments();
  }, []);

  const fetchStatus = async () => {
    try {
      const status = await vectorStoreAPI.getCollectionStatus();
      setStatus(status);
    } catch (error) {
      console.error('Failed to fetch vector store status:', error);
      setError('Failed to fetch vector store status');
      // Fallback to mock data
      const mockStatus = await vectorStoreAPI.mockStatus();
      setStatus(mockStatus);
    }
  };

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const docs = await vectorStoreAPI.listAllDocuments();
      setDocuments(docs);
    } catch (error) {
      console.error('Failed to fetch documents:', error);
      setError('Failed to fetch documents');
      // Fallback to mock data
      const mockDocs = await vectorStoreAPI.mockDocuments();
      setDocuments(mockDocs);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    try {
      setSearchLoading(true);
      const results = await vectorStoreAPI.searchDocuments(searchQuery);
      setSearchResults(results);
    } catch (error) {
      console.error('Failed to search:', error);
      setError('Failed to perform search');
      // Fallback to mock search
      const mockResults = await vectorStoreAPI.mockSearch(searchQuery);
      setSearchResults(mockResults);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleSaveDocument = async () => {
    try {
      const metadata = formData.metadata ? JSON.parse(formData.metadata) : {};
      const newDocument: PolicyDocument = {
        id: editingDocument?.id || `doc-${Date.now()}`,
        title: formData.title,
        content: formData.content,
        category: formData.category,
        metadata
      };

      if (editingDocument) {
        await vectorStoreAPI.updateDocument(newDocument);
        setDocuments(docs => docs.map(doc => 
          doc.id === editingDocument.id ? newDocument : doc
        ));
      } else {
        await vectorStoreAPI.addDocument(newDocument);
        setDocuments(docs => [...docs, newDocument]);
      }

      setShowAddForm(false);
      setEditingDocument(null);
      setFormData({ title: '', content: '', category: 'knowledge', metadata: '' });
      fetchStatus(); // Refresh status
    } catch (error) {
      console.error('Failed to save document:', error);
      setError('Failed to save document');
    }
  };

  const handleDeleteDocument = async (id: string) => {
    if (!confirm('Are you sure you want to delete this document?')) return;
    
    try {
      await vectorStoreAPI.deleteDocument(id);
      setDocuments(docs => docs.filter(doc => doc.id !== id));
      fetchStatus(); // Refresh status
    } catch (error) {
      console.error('Failed to delete document:', error);
      setError('Failed to delete document');
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'safety': return 'bg-red-100 text-red-800 border-red-200';
      case 'procedure': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'compliance': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'knowledge': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getRelevanceColor = (relevance: string) => {
    switch (relevance) {
      case 'high': return 'bg-green-500/20 text-green-600 border-green-500/30';
      case 'medium': return 'bg-yellow-500/20 text-yellow-600 border-yellow-500/30';
      case 'low': return 'bg-gray-500/20 text-gray-600 border-gray-500/30';
      default: return 'bg-gray-100 text-gray-600 border-gray-200';
    }
  };

  if (showAddForm) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            {editingDocument ? 'Edit Document' : 'Add New Document'}
          </h2>
          <button
            onClick={() => {
              setShowAddForm(false);
              setEditingDocument(null);
              setFormData({ title: '', content: '', category: 'knowledge', metadata: '' });
            }}
            className="text-muted-foreground hover:text-foreground"
          >
            Cancel
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Title</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              className="w-full px-3 py-2 border border-border rounded-lg bg-muted/50 focus:border-primary/50 focus:ring-1 focus:ring-primary/50 outline-none"
              placeholder="Document title"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Category</label>
            <select
              value={formData.category}
              onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value as any }))}
              className="w-full px-3 py-2 border border-border rounded-lg bg-muted/50 focus:border-primary/50 focus:ring-1 focus:ring-primary/50 outline-none"
            >
              <option value="safety">Safety</option>
              <option value="procedure">Procedure</option>
              <option value="compliance">Compliance</option>
              <option value="knowledge">Knowledge</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Content</label>
            <textarea
              value={formData.content}
              onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
              className="w-full px-3 py-2 border border-border rounded-lg bg-muted/50 focus:border-primary/50 focus:ring-1 focus:ring-primary/50 outline-none h-32 resize-none"
              placeholder="Document content..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Metadata (JSON)</label>
            <textarea
              value={formData.metadata}
              onChange={(e) => setFormData(prev => ({ ...prev, metadata: e.target.value }))}
              className="w-full px-3 py-2 border border-border rounded-lg bg-muted/50 focus:border-primary/50 focus:ring-1 focus:ring-primary/50 outline-none h-24 resize-none font-mono text-sm"
              placeholder='{"priority": "high", "version": "1.0"}'
            />
          </div>

          <button
            onClick={handleSaveDocument}
            disabled={!formData.title || !formData.content}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {editingDocument ? 'Update Document' : 'Add Document'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Status Cards */}
      {status && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Database className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">Collection</span>
            </div>
            <div className="text-2xl font-bold text-foreground">
              {status.collectionExists ? 'Active' : 'Not Found'}
            </div>
          </div>

          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">Documents</span>
            </div>
            <div className="text-2xl font-bold text-foreground">{status.documentCount}</div>
          </div>

          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Database className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">Size</span>
            </div>
            <div className="text-2xl font-bold text-foreground">{status.collectionSize}</div>
          </div>

          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Database className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">Dimensions</span>
            </div>
            <div className="text-2xl font-bold text-foreground">{status.dimensions}</div>
          </div>

          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Database className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">Distance</span>
            </div>
            <div className="text-2xl font-bold text-foreground">{status.distance}</div>
          </div>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      {/* Search Section */}
      <div className="bg-card border border-border rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Vector Search</h3>
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Search for documents using semantic similarity..."
              className="w-full pl-10 pr-4 py-2 border border-border rounded-lg bg-muted/50 focus:border-primary/50 focus:ring-1 focus:ring-primary/50 outline-none"
            />
          </div>
          <button
            onClick={handleSearch}
            disabled={!searchQuery.trim() || searchLoading}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {searchLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            Search
          </button>
        </div>

        {searchResults.length > 0 && (
          <div className="mt-4 space-y-3">
            <h4 className="font-medium text-sm text-muted-foreground">Search Results</h4>
            {searchResults.map((result, index) => (
              <div key={index} className="border border-border rounded-lg p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h5 className="font-medium text-foreground">{result.document.title}</h5>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={cn('px-2 py-1 text-xs rounded-full border', getCategoryColor(result.document.category))}>
                        {result.document.category}
                      </span>
                      <span className={cn('px-2 py-1 text-xs rounded-full border', getRelevanceColor(result.relevance))}>
                        {result.relevance} ({Math.round(result.score * 100)}%)
                      </span>
                    </div>
                  </div>
                  <Eye className="w-4 h-4 text-muted-foreground cursor-pointer hover:text-foreground" />
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2">{result.document.content}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Documents Management */}
      <div className="bg-card border border-border rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Policy Documents</h3>
          <div className="flex gap-2">
            <button
              onClick={fetchDocuments}
              className="px-3 py-1.5 text-sm border border-border rounded-lg hover:bg-muted transition-colors flex items-center gap-2"
            >
              <RefreshCw className="w-3 h-3" />
              Refresh
            </button>
            <button
              onClick={() => setShowAddForm(true)}
              className="px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2"
            >
              <Plus className="w-3 h-3" />
              Add Document
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : documents.length > 0 ? (
          <div className="space-y-3">
            {documents.map((doc) => (
              <div key={doc.id} className="border border-border rounded-lg p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h5 className="font-medium text-foreground">{doc.title}</h5>
                      <span className={cn('px-2 py-1 text-xs rounded-full border', getCategoryColor(doc.category))}>
                        {doc.category}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>ID: {doc.id}</span>
                      {doc.metadata && Object.keys(doc.metadata).length > 0 && (
                        <span>• Metadata: {JSON.stringify(doc.metadata)}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => {
                        setEditingDocument(doc);
                        setFormData({
                          title: doc.title,
                          content: doc.content,
                          category: doc.category,
                          metadata: JSON.stringify(doc.metadata || {}, null, 2)
                        });
                        setShowAddForm(true);
                      }}
                      className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded"
                    >
                      <Eye className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => handleDeleteDocument(doc.id)}
                      className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-3">{doc.content}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <Database className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No documents found in vector store.</p>
            <button
              onClick={() => setShowAddForm(true)}
              className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2 mx-auto"
            >
              <Plus className="w-4 h-4" />
              Add First Document
            </button>
          </div>
        )}
      </div>
    </div>
  );
}