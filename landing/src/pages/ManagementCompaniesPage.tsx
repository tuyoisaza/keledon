import { useState, useEffect } from 'react';
import { Building2, Plus, RefreshCw, Loader2, Pencil, Trash2, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { getCompanies, createCompany, updateCompany, deleteCompany, type Company } from '@/lib/crud-api';

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
    const [companies, setCompanies] = useState<Company[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [editingCompany, setEditingCompany] = useState<Company | null>(null);
    const [saving, setSaving] = useState(false);
    const [selectedCountries, setSelectedCountries] = useState<string[]>([]);

    const [formData, setFormData] = useState({
        name: '',
        industry: ''
    });

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

    const resetForm = () => {
        setFormData({ name: '', industry: '' });
        setSelectedCountries([]);
    };

    const openCreateForm = () => {
        resetForm();
        setEditingCompany(null);
        setShowForm(true);
    };

    const openEditForm = (company: Company) => {
        setFormData({
            name: company.name || '',
            industry: company.industry || ''
        });
        setSelectedCountries(company.countries?.map(c => c.countryCode) || []);
        setEditingCompany(company);
        setShowForm(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const data = { ...formData, countries: selectedCountries };
            if (editingCompany) {
                await updateCompany(editingCompany.id, data);
                toast.success('Company updated successfully');
            } else {
                await createCompany(data);
                toast.success('Company created successfully');
            }
            setShowForm(false);
            fetchCompanies();
        } catch (error) {
            console.error('Failed to save company:', error);
            toast.error('Failed to save company');
        } finally {
            setSaving(false);
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
                    onClick={openCreateForm}
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
                <button onClick={fetchCompanies} className="p-2 hover:bg-muted rounded-lg transition-colors" title="Refresh">
                    <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
                </button>
            </div>

            <div className="rounded-xl border border-border bg-card overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    </div>
                ) : filteredCompanies.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                        <Building2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>No companies found</p>
                        <button onClick={openCreateForm} className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors">
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
                                            {company.countries?.slice(0, 3).map((c) => (
                                                <span key={c.countryCode} className="px-2 py-0.5 bg-muted text-xs rounded">
                                                    {availableCountries.find(ac => ac.code === c.countryCode)?.name || c.countryCode}
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
                                        {company.createdAt ? new Date(company.createdAt).toLocaleDateString() : '—'}
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex gap-2">
                                            <button onClick={() => openEditForm(company)} className="p-1.5 hover:bg-muted rounded transition-colors" title="Edit">
                                                <Pencil className="w-4 h-4" />
                                            </button>
                                            <button onClick={() => handleDelete(company.id)} className="p-1.5 hover:bg-destructive/10 text-destructive rounded transition-colors" title="Delete">
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

            {showForm && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
                    <div className="bg-card border border-border rounded-xl p-6 w-full max-w-md">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold">
                                {editingCompany ? 'Edit' : 'Add'} Company
                            </h3>
                            <button onClick={() => setShowForm(false)} className="p-1 hover:bg-muted rounded">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm text-muted-foreground mb-1">Company Name</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    required
                                    className="w-full px-4 py-2 rounded-lg bg-muted border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-muted-foreground mb-1">Industry</label>
                                <input
                                    type="text"
                                    value={formData.industry}
                                    onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                                    className="w-full px-4 py-2 rounded-lg bg-muted border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-muted-foreground mb-1">Operating Countries</label>
                                <div className="mb-2 min-h-[60px] p-3 bg-muted rounded-lg border border-border">
                                    {selectedCountries.length > 0 ? (
                                        <div className="space-y-2">
                                            {selectedCountries.map(code => {
                                                const country = availableCountries.find(c => c.code === code);
                                                return (
                                                    <div key={code} className="flex items-center justify-between p-2 rounded bg-background border border-border">
                                                        <span className="text-sm">{country?.name || code}</span>
                                                        <button
                                                            type="button"
                                                            onClick={() => setSelectedCountries(prev => prev.filter(c => c !== code))}
                                                            className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                                        >
                                                            <X className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <p className="text-sm text-muted-foreground italic text-center py-4">No countries added</p>
                                    )}
                                </div>
                                <select
                                    className="w-full px-4 py-2 rounded-lg bg-muted border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        if (val && !selectedCountries.includes(val)) {
                                            setSelectedCountries(prev => [...prev, val]);
                                        }
                                        e.target.value = '';
                                    }}
                                >
                                    <option value="">+ Add Country</option>
                                    {availableCountries.map(c => (
                                        <option key={c.code} value={c.code} disabled={selectedCountries.includes(c.code)}>
                                            {c.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex justify-end gap-3 mt-6">
                                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg bg-muted text-foreground hover:bg-muted/80 transition-colors">
                                    Cancel
                                </button>
                                <button type="submit" disabled={saving} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors font-medium disabled:opacity-50 flex items-center gap-2">
                                    {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                                    {saving ? 'Saving...' : 'Save'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
