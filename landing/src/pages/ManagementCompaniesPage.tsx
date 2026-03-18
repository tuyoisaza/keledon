import { useState, useEffect } from 'react';
import { Building2, Plus, RefreshCw, Loader2, Pencil, Trash2, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { getCompanies, createCompany, updateCompany, deleteCompany, type Company } from '@/lib/crud-api';
import { useAuth } from '@/context/AuthContext';
import EntityForm from '@/components/superadmin/EntityForm';

const availableCountries = [
    { code: 'US', name: 'United States' },
    { code: 'UK', name: 'United Kingdom' },
    { code: 'DE', name: 'Germany' },
    { code: 'FR', name: 'France' },
    { code: 'ES', name: 'Spain' },
    { code: 'MX', name: 'Mexico' },
    { code: 'BR', name: 'Brazil' },
    { code: 'AR', name: 'Argentina' },
    { code: 'CO', name: 'Colombia' },
    { code: 'CL', name: 'Chile' },
    { code: 'PE', name: 'Peru' },
];

export default function ManagementCompaniesPage() {
    const { user } = useAuth();
    const [companies, setCompanies] = useState<Company[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [editingCompany, setEditingCompany] = useState<Company | null>(null);
    const [formLoading, setFormLoading] = useState(false);

    useEffect(() => {
        fetchCompanies();
    }, []);

    const fetchCompanies = async () => {
        try {
            setLoading(true);
            const data = await getCompanies();
            setCompanies(data);
        } catch (error) {
            console.error('Failed to fetch companies:', error);
            toast.error('Failed to fetch companies');
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async (data: any) => {
        setFormLoading(true);
        try {
            await createCompany({
                ...data,
                created_at: new Date().toISOString()
            });
            toast.success('Company created successfully');
            setShowForm(false);
            fetchCompanies();
        } catch (error) {
            console.error('Failed to create company:', error);
            toast.error('Failed to create company');
        } finally {
            setFormLoading(false);
        }
    };

    const handleUpdate = async (data: any) => {
        if (!editingCompany) return;
        setFormLoading(true);
        try {
            await updateCompany(editingCompany.id, data);
            toast.success('Company updated successfully');
            setEditingCompany(null);
            fetchCompanies();
        } catch (error) {
            console.error('Failed to update company:', error);
            toast.error('Failed to update company');
        } finally {
            setFormLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this company?')) return;
        try {
            await deleteCompany(id);
            toast.success('Company deleted successfully');
            fetchCompanies();
        } catch (error) {
            console.error('Failed to delete company:', error);
            toast.error('Failed to delete company');
        }
    };

    const filteredCompanies = companies.filter(c =>
        c.name?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Building2 className="w-6 h-6 text-primary" />
                    <div>
                        <h1 className="text-2xl font-bold">Companies</h1>
                        <p className="text-muted-foreground">Manage companies, brands, teams, and users</p>
                    </div>
                </div>
                <button
                    onClick={() => setShowForm(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                >
                    <Plus className="w-4 h-4" />
                    Add Company
                </button>
            </div>

            <div className="flex items-center gap-4">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search companies..."
                        className="w-full pl-10 pr-4 py-2 border border-border rounded-lg bg-muted/50 focus:border-primary/50 focus:ring-1 focus:ring-primary/50 outline-none"
                    />
                </div>
                <button
                    onClick={fetchCompanies}
                    className="p-2 hover:bg-muted rounded-lg transition-colors"
                    title="Refresh"
                >
                    <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
                </button>
            </div>

            {showForm && (
                <EntityForm
                    activeTab="companies"
                    onSubmit={handleCreate}
                    onClose={() => setShowForm(false)}
                    isSuperAdmin={true}
                    saving={formLoading}
                />
            )}

            <div className="rounded-xl border border-border bg-card overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    </div>
                ) : filteredCompanies.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                        <Building2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>No companies found</p>
                        <button
                            onClick={() => setShowForm(true)}
                            className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                        >
                            Add First Company
                        </button>
                    </div>
                ) : (
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-border text-left text-sm text-muted-foreground">
                                <th className="px-4 py-3 font-medium">NAME</th>
                                <th className="px-4 py-3 font-medium">INDUSTRY</th>
                                <th className="px-4 py-3 font-medium">COUNTRIES</th>
                                <th className="px-4 py-3 font-medium">CREATED</th>
                                <th className="px-4 py-3 font-medium">ACTIONS</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredCompanies.map((company) => (
                                <tr key={company.id} className="border-b border-border hover:bg-muted/50">
                                    <td className="px-4 py-3 font-medium">{company.name}</td>
                                    <td className="px-4 py-3 text-muted-foreground">{company.industry || '—'}</td>
                                    <td className="px-4 py-3">
                                        <div className="flex flex-wrap gap-1">
                                            {company.countries?.slice(0, 3).map((c: string) => (
                                                <span key={c} className="px-2 py-0.5 bg-muted text-xs rounded">
                                                    {availableCountries.find(ac => ac.code === c)?.name || c}
                                                </span>
                                            ))}
                                            {(company.countries?.length || 0) > 3 && (
                                                <span className="px-2 py-0.5 bg-muted text-xs rounded">
                                                    +{(company.countries?.length || 0) - 3}
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-muted-foreground">
                                        {new Date(company.created_at).toLocaleDateString()}
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => setEditingCompany(company)}
                                                className="p-1.5 hover:bg-muted rounded transition-colors"
                                                title="Edit"
                                            >
                                                <Pencil className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(company.id)}
                                                className="p-1.5 hover:bg-destructive/10 text-destructive rounded transition-colors"
                                                title="Delete"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {editingCompany && (
                <EntityForm
                    activeTab="companies"
                    editingEntity={editingCompany}
                    onSubmit={(data) => handleUpdate(data)}
                    onClose={() => setEditingCompany(null)}
                    isSuperAdmin={true}
                    saving={formLoading}
                />
            )}
        </div>
    );
}
