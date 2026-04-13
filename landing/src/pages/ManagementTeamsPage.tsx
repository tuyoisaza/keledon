import { useState, useEffect } from 'react';
import { Users, Plus, RefreshCw, Loader2, Pencil, Trash2, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { getTeams, getCompanies, getBrands, createTeam, updateTeam, deleteTeam, type Team, type Company, type Brand } from '@/lib/crud-api';

const availableCountries = [
    { code: 'US', name: 'United States' },
    { code: 'UK', name: 'United Kingdom' },
    { code: 'DE', name: 'Germany' },
    { code: 'FR', name: 'France' },
    { code: 'ES', name: 'Spain' },
    { code: 'MX', name: 'Mexico' },
    { code: 'BR', name: 'Brazil' },
];

export default function ManagementTeamsPage() {
    const [teams, setTeams] = useState<Team[]>([]);
    const [companies, setCompanies] = useState<Company[]>([]);
    const [brands, setBrands] = useState<Brand[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [editingTeam, setEditingTeam] = useState<Team | null>(null);
    const [saving, setSaving] = useState(false);

    const [formData, setFormData] = useState({
        name: '',
        companyId: '',
        brandId: '',
        country: ''
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [teamsData, companiesData, brandsData] = await Promise.all([
                getTeams(),
                getCompanies(),
                getBrands()
            ]);
            setTeams(teamsData);
            setCompanies(companiesData);
            setBrands(brandsData);
        } catch (error) {
            console.error('Failed to fetch teams:', error);
            toast.error('Failed to fetch teams');
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setFormData({ name: '', companyId: '', brandId: '', country: '' });
    };

    const openCreateForm = () => {
        resetForm();
        setEditingTeam(null);
        setShowForm(true);
    };

    const openEditForm = (team: Team) => {
        const brand = brands.find(b => b.id === team.brandId);
        setFormData({
            name: team.name || '',
            companyId: brand?.companyId || '',
            brandId: team.brandId || '',
            country: team.country || ''
        });
        setEditingTeam(team);
        setShowForm(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const submitData = {
                name: formData.name,
                brandId: formData.brandId || undefined,
                country: formData.country || undefined
            };
            console.log('Submitting team data:', submitData);
            if (editingTeam) {
                const result = await updateTeam(editingTeam.id, submitData);
                console.log('Update result:', result);
                toast.success('Team updated successfully');
            } else {
                const result = await createTeam(submitData);
                console.log('Create result:', result);
                toast.success('Team created successfully');
            }
            setShowForm(false);
            fetchData();
        } catch (error: any) {
            console.error('Failed to save team:', error);
            toast.error('Failed to save team: ' + (error?.message || error));
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this team?')) return;
        try {
            await deleteTeam(id);
            toast.success('Team deleted successfully');
            fetchData();
        } catch (error) {
            console.error('Failed to delete team:', error);
            toast.error('Failed to delete team');
        }
    };

    const filteredTeams = teams.filter(t =>
        t.name?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const getCompanyName = (team: Team) => {
        if (team.brand?.company?.name) return team.brand.company.name;
        if (team.brand?.companyId) {
            const company = companies.find(c => c.id === team.brand?.companyId);
            return company?.name || '—';
        }
        return '—';
    };

    const getBrandName = (brandId?: string) => {
        if (!brandId) return '—';
        return brands.find(b => b.id === brandId)?.name || brandId;
    };

    const getCountryName = (code?: string) => {
        if (!code) return '—';
        return availableCountries.find(c => c.code === code)?.name || code;
    };

    const selectedCompany = companies.find(c => c.id === formData.companyId);
    const companyCountries = selectedCompany?.countries?.length > 0 
        ? selectedCompany.countries 
        : availableCountries;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Users className="w-6 h-6 text-primary" />
                    <div>
                        <h1 className="text-2xl font-bold">Teams</h1>
                        <p className="text-muted-foreground">Manage teams for your brands</p>
                    </div>
                </div>
                <button
                    onClick={openCreateForm}
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                >
                    <Plus className="w-4 h-4" />
                    Add Team
                </button>
            </div>

            <div className="flex items-center gap-4">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search teams..."
                        className="w-full pl-10 pr-4 py-2 border border-border rounded-lg bg-muted/50 focus:border-primary/50 focus:ring-1 focus:ring-primary/50 outline-none"
                    />
                </div>
                <button onClick={fetchData} className="p-2 hover:bg-muted rounded-lg transition-colors" title="Refresh">
                    <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
                </button>
            </div>

            <div className="rounded-xl border border-border bg-card overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    </div>
                ) : filteredTeams.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                        <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>No teams found</p>
                        <button onClick={openCreateForm} className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors">
                            Add First Team
                        </button>
                    </div>
                ) : (
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-border text-left text-sm text-muted-foreground">
                                <th className="px-4 py-3 font-medium">NAME</th>
                                <th className="px-4 py-3 font-medium">COMPANY</th>
                                <th className="px-4 py-3 font-medium">BRAND</th>
                                <th className="px-4 py-3 font-medium">COUNTRY</th>
                                <th className="px-4 py-3 font-medium">ACTIONS</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredTeams.map((team) => (
                                <tr key={team.id} className="border-b border-border hover:bg-muted/50">
                                    <td className="px-4 py-3 font-medium">{team.name}</td>
                                    <td className="px-4 py-3 text-muted-foreground">{getCompanyName(team)}</td>
                                    <td className="px-4 py-3 text-muted-foreground">{getBrandName(team.brandId)}</td>
                                    <td className="px-4 py-3 text-muted-foreground">{getCountryName(team.country)}</td>
                                    <td className="px-4 py-3">
                                        <div className="flex gap-2">
                                            <button onClick={() => openEditForm(team)} className="p-1.5 hover:bg-muted rounded transition-colors" title="Edit">
                                                <Pencil className="w-4 h-4" />
                                            </button>
                                            <button onClick={() => handleDelete(team.id)} className="p-1.5 hover:bg-destructive/10 text-destructive rounded transition-colors" title="Delete">
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
                                {editingTeam ? 'Edit' : 'Add'} Team
                            </h3>
                            <button onClick={() => setShowForm(false)} className="p-1 hover:bg-muted rounded">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm text-muted-foreground mb-1">Company</label>
                                <select
                                    value={formData.companyId}
                                    onChange={(e) => setFormData({ ...formData, companyId: e.target.value, brandId: '', country: '' })}
                                    className="w-full px-4 py-2 rounded-lg bg-muted border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                                >
                                    <option value="">Select Company...</option>
                                    {companies.map(c => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm text-muted-foreground mb-1">Brand</label>
                                <select
                                    value={formData.brandId}
                                    onChange={(e) => setFormData({ ...formData, brandId: e.target.value, country: '' })}
                                    required
                                    disabled={!formData.companyId}
                                    className="w-full px-4 py-2 rounded-lg bg-muted border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50"
                                >
                                    <option value="">Select Brand...</option>
                                    {brands.filter(b => b.companyId === formData.companyId).map(b => (
                                        <option key={b.id} value={b.id}>{b.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm text-muted-foreground mb-1">Country</label>
                                <select
                                    value={formData.country}
                                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                                    required
                                    className="w-full px-4 py-2 rounded-lg bg-muted border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                                >
                                    <option value="">Select Country...</option>
                                    {companyCountries.map((c: any) => {
                                        const code = typeof c === 'string' ? c : c.countryCode;
                                        const country = availableCountries.find(ac => ac.code === code);
                                        return <option key={code} value={code}>{country?.name || code}</option>;
                                    })}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm text-muted-foreground mb-1">Team Name</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    required
                                    className="w-full px-4 py-2 rounded-lg bg-muted border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                                />
                            </div>
                            <div className="flex justify-end gap-3 mt-6">
                                <button
                                    type="button"
                                    onClick={() => setShowForm(false)}
                                    className="px-4 py-2 rounded-lg bg-muted text-foreground hover:bg-muted/80 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors font-medium disabled:opacity-50 flex items-center gap-2"
                                >
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
