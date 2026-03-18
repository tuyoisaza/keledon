import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Database, Plus, Search, FileText, Trash2, RefreshCw, Eye, AlertCircle, Settings, ArrowLeft, Tag } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { vectorStoreAPI, type PolicyDocument, type RetrievalResult, type VectorStoreStatus } from '@/lib/vector-store';
import { getCategories, type Category } from '@/lib/crud-api';
import { useAuth } from '@/context/AuthContext';

const defaultCategories = [
  { id: 'safety', name: 'Safety', color: '#ef4444', description: 'Safety guidelines and procedures' },
  { id: 'procedure', name: 'Procedure', color: '#3b82f6', description: 'Standard operating procedures' },
  { id: 'compliance', name: 'Compliance', color: '#a855f7', description: 'Compliance and regulations' },
  { id: 'knowledge', name: 'Knowledge', color: '#22c55e', description: 'General knowledge base' },
];

export default function VectorStoreDocumentsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [status, setStatus] = useState<VectorStoreStatus | null>(null);
  const [documents, setDocuments] = useState<PolicyDocument[]>([]);
  const [searchResults, setSearchResults] = useState<RetrievalResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    fetchStatus();
    fetchDocuments();
    fetchCategories();
  }, []);

  const fetchStatus = async () => {
    try {
      const status = await vectorStoreAPI.getCollectionStatus();
      setStatus(status);
    } catch (error) {
      console.error('Failed to fetch vector store status:', error);
      setError('Failed to fetch vector store status. Please check your configuration.');
      setStatus(null);
    }
  };

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const docs = await vectorStoreAPI.listAllDocuments();
      setDocuments(docs);
    } catch (error) {
      console.error('Failed to fetch documents:', error);
      setError('Failed to fetch documents. Please check your vector store configuration.');
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const cats = await getCategories();
      setCategories(cats.length > 0 ? cats : defaultCategories);
    } catch (error) {
      console.error('Failed to fetch categories:', error);
      setCategories(defaultCategories);
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
      setError('Failed to perform search. Please check your vector store configuration.');
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleDeleteDocument = async (id: string) => {
    if (!confirm('Are you sure you want to delete this document?')) return;
    
    try {
      await vectorStoreAPI.deleteDocument(id);
      setDocuments(docs => docs.filter(doc => doc.id !== id));
      fetchStatus();
      toast.success('Document deleted');
    } catch (error) {
      console.error('Failed to delete document:', error);
      toast.error('Failed to delete document');
    }
  };

  const getCategoryColor = (category: string) => {
    const cat = categories.find(c => c.name.toLowerCase() === category.toLowerCase());
    return cat?.color || '#6b7280';
  };

  const getCategoryBgClass = (category: string) => {
    switch (category.toLowerCase()) {
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/management')}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-primary" />
            <h1 className="text-xl font-semibold">Vector Store</h1>
          </div>
        </div>
        <div className="flex gap-2">
          <Link
            to="/management/vector-store/categories"
            className="px-3 py-1.5 text-sm border border-border rounded-lg hover:bg-muted transition-colors flex items-center gap-2"
          >
            <Tag className="w-3 h-3" />
            Categories
          </Link>
          <Link
            to="/management/vector-store/add-document"
            className="px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2"
          >
            <Plus className="w-3 h-3" />
            Add Document
          </Link>
        </div>
      </div>

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
                      <span className={cn('px-2 py-1 text-xs rounded-full border', getCategoryBgClass(result.document.category))}>
                        {result.document.category}
                      </span>
                      <span className={cn('px-2 py-1 text-xs rounded-full border', getRelevanceColor(result.relevance))}>
                        {result.relevance} ({Math.round(result.score * 100)}%)
                      </span>
                    </div>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2">{result.document.content}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Documents List */}
      <div className="bg-card border border-border rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Policy Documents</h3>
          <button
            onClick={fetchDocuments}
            className="px-3 py-1.5 text-sm border border-border rounded-lg hover:bg-muted transition-colors flex items-center gap-2"
          >
            <RefreshCw className="w-3 h-3" />
            Refresh
          </button>
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
                      <span className={cn('px-2 py-1 text-xs rounded-full border', getCategoryBgClass(doc.category))}>
                        {doc.category}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>ID: {doc.id}</span>
                      <span>• Created: {new Date(doc.created_at).toLocaleDateString()}</span>
                      {doc.brand_id && <span>• Brand: {doc.brand_id}</span>}
                      {doc.team_id && <span>• Team: {doc.team_id}</span>}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Link
                      to={`/management/vector-store/edit-document/${doc.id}`}
                      className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded"
                    >
                      <Eye className="w-3 h-3" />
                    </Link>
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
            <Link
              to="/management/vector-store/add-document"
              className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2 mx-auto w-fit"
            >
              <Plus className="w-4 h-4" />
              Add First Document
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
