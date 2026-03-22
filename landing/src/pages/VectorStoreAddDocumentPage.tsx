import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, Loader2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { vectorStoreAPI, type PolicyDocument } from '@/lib/vector-store';
import { getCompanies, getBrands, getTeams, getCategories, type Company, type Brand, type Team, type Category } from '@/lib/crud-api';
import { useAuth } from '@/context/AuthContext';

const defaultCategories = [
  { id: 'safety', name: 'Safety', color: '#ef4444', description: 'Safety guidelines and procedures' },
  { id: 'procedure', name: 'Procedure', color: '#3b82f6', description: 'Standard operating procedures' },
  { id: 'compliance', name: 'Compliance', color: '#a855f7', description: 'Compliance and regulations' },
  { id: 'knowledge', name: 'Knowledge', color: '#22c55e', description: 'General knowledge base' },
];

export default function VectorStoreAddDocumentPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useAuth();
  const isEditing = !!id;

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Data for dropdowns
  const [companies, setCompanies] = useState<Company[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [categories, setCategories] = useState<Category[]>(defaultCategories);

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    category: 'knowledge',
    metadata: '',
    company_id: '',
    brand_id: '',
    team_id: '',
  });

  // Fetch dropdown data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [companiesData, brandsData, teamsData, categoriesData] = await Promise.all([
          getCompanies(),
          getBrands(),
          getTeams(),
          getCategories()
        ]);
        setCompanies(companiesData);
        setBrands(brandsData);
        setTeams(teamsData);
        setCategories(categoriesData.length > 0 ? categoriesData : defaultCategories);

        // Set default company from user if available
        if (user?.companyId) {
          setFormData(prev => ({ ...prev, company_id: user.companyId || '' }));
        } else if (companiesData.length > 0) {
          setFormData(prev => ({ ...prev, company_id: companiesData[0].id }));
        }
      } catch (err) {
        console.error('Failed to fetch data:', err);
        setError('Failed to load form data');
      }
    };
    fetchData();
  }, [user?.companyId]);

  // If editing, fetch existing document
  useEffect(() => {
    if (isEditing && id) {
      const fetchDocument = async () => {
        setLoading(true);
        try {
          const docs = await vectorStoreAPI.listAllDocuments();
          const doc = docs.find((d: PolicyDocument) => d.id === id);
          if (doc) {
            setFormData({
              title: doc.title,
              content: doc.content,
              category: doc.category,
              metadata: doc.metadata ? JSON.stringify(doc.metadata, null, 2) : '',
              company_id: doc.company_id || '',
              brand_id: doc.brand_id || '',
              team_id: doc.team_id || '',
            });
          } else {
            toast.error('Document not found');
            navigate('/management/vector-store');
          }
        } catch (err) {
          console.error('Failed to fetch document:', err);
          toast.error('Failed to load document');
        } finally {
          setLoading(false);
        }
      };
      fetchDocument();
    }
  }, [isEditing, id, navigate]);

  // Filter brands and teams based on selected company
  const filteredBrands = brands.filter(b => !formData.company_id || b.companyId === formData.company_id);
  const filteredTeams = teams.filter(t => {
    if (!formData.company_id) return true;
    if (formData.brand_id) return t.brandId === formData.brand_id && t.company?.id === formData.company_id;
    return t.company?.id === formData.company_id;
  });

  const handleSave = async () => {
    if (!formData.title.trim()) {
      toast.error('Title is required');
      return;
    }
    if (!formData.content.trim()) {
      toast.error('Content is required');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const metadata = formData.metadata ? JSON.parse(formData.metadata) : {};
      const now = new Date().toISOString();
      
      const document: PolicyDocument = {
        id: isEditing ? id! : `doc-${Date.now()}`,
        title: formData.title,
        content: formData.content,
        category: formData.category,
        metadata,
        company_id: formData.company_id || user?.companyId || '',
        brand_id: formData.brand_id || undefined,
        team_id: formData.team_id || undefined,
        created_by: user?.id || 'user',
        created_at: now,
        updated_at: now,
      };

      if (isEditing) {
        await vectorStoreAPI.updateDocument(document);
        toast.success('Document updated successfully');
      } else {
        await vectorStoreAPI.addDocument(document);
        toast.success('Document added successfully');
      }

      navigate('/management/vector-store');
    } catch (err: any) {
      console.error('Failed to save document:', err);
      setError(err.message || 'Failed to save document. Please check your vector store configuration.');
      toast.error('Failed to save document');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/management/vector-store')}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-semibold">
            {isEditing ? 'Edit Document' : 'Add New Document'}
          </h1>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      {/* Form */}
      <div className="bg-card border border-border rounded-lg p-6 space-y-6">
        {/* Title */}
        <div>
          <label className="block text-sm font-medium mb-2">Title *</label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
            className="w-full px-3 py-2 border border-border rounded-lg bg-muted/50 focus:border-primary/50 focus:ring-1 focus:ring-primary/50 outline-none"
            placeholder="Document title"
          />
        </div>

        {/* Category */}
        <div>
          <label className="block text-sm font-medium mb-2">Category</label>
          <select
            value={formData.category}
            onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
            className="w-full px-3 py-2 border border-border rounded-lg bg-muted/50 focus:border-primary/50 focus:ring-1 focus:ring-primary/50 outline-none"
          >
            {categories.map((cat) => (
              <option key={cat.id} value={cat.name.toLowerCase()}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>

        {/* Content */}
        <div>
          <label className="block text-sm font-medium mb-2">Content *</label>
          <textarea
            value={formData.content}
            onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
            className="w-full px-3 py-2 border border-border rounded-lg bg-muted/50 focus:border-primary/50 focus:ring-1 focus:ring-primary/50 outline-none h-48 resize-none"
            placeholder="Document content..."
          />
        </div>

        {/* Company, Brand, Team */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Company</label>
            <select
              value={formData.company_id}
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                company_id: e.target.value,
                brand_id: '',
                team_id: ''
              }))}
              className="w-full px-3 py-2 border border-border rounded-lg bg-muted/50 focus:border-primary/50 focus:ring-1 focus:ring-primary/50 outline-none"
            >
              <option value="">All Companies</option>
              {companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Brand</label>
            <select
              value={formData.brand_id}
              onChange={(e) => setFormData(prev => ({ ...prev, brand_id: e.target.value, team_id: '' }))}
              className="w-full px-3 py-2 border border-border rounded-lg bg-muted/50 focus:border-primary/50 focus:ring-1 focus:ring-primary/50 outline-none"
              disabled={!formData.company_id && filteredBrands.length === 0}
            >
              <option value="">All Brands</option>
              {filteredBrands.map((brand) => (
                <option key={brand.id} value={brand.id}>
                  {brand.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Team</label>
            <select
              value={formData.team_id}
              onChange={(e) => setFormData(prev => ({ ...prev, team_id: e.target.value }))}
              className="w-full px-3 py-2 border border-border rounded-lg bg-muted/50 focus:border-primary/50 focus:ring-1 focus:ring-primary/50 outline-none"
              disabled={!formData.company_id && filteredTeams.length === 0}
            >
              <option value="">All Teams</option>
              {filteredTeams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Metadata */}
        <div>
          <label className="block text-sm font-medium mb-2">Metadata (JSON)</label>
          <textarea
            value={formData.metadata}
            onChange={(e) => setFormData(prev => ({ ...prev, metadata: e.target.value }))}
            className="w-full px-3 py-2 border border-border rounded-lg bg-muted/50 focus:border-primary/50 focus:ring-1 focus:ring-primary/50 outline-none h-24 resize-none font-mono text-sm"
            placeholder='{"priority": "high", "version": "1.0"}'
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4">
          <button
            onClick={() => navigate('/management/vector-store')}
            disabled={saving}
            className="px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !formData.title || !formData.content}
            className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? 'Saving...' : isEditing ? 'Update Document' : 'Add Document'}
          </button>
        </div>
      </div>
    </div>
  );
}
