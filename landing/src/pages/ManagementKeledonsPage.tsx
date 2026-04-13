import { useState, useEffect } from 'react';
import { Bot, Plus, RefreshCw, Loader2, Pencil, Trash2, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { getKeledons, createKeledon, updateKeledon, deleteKeledon, getTeams, getCompanies, getBrands, getUsers, type Keledon, type Team, type Company, type Brand } from '@/lib/crud-api';

export default function ManagementKeledonsPage() {
    const [keledons, setKeledons] = useState<Keledon[]>([]);
    const [teams, setTeams] = useState<Team[]>([]);
    const [companies, setCompanies] = useState<Company[]>([]);
    const [brands, setBrands] = useState<Brand[]>([]);
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [editingKeledon, setEditingKeledon] = useState<Keledon | null>(null);
    const [saving, setSaving] = useState(false);

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        teamId: '',
        brandId: '',
        companyId: '',
        countryCode: '',
        userId: '',
        role: 'agent',
        autonomyLevel: 5,
        uiInterfaces: [] as string[],
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [keledonsData, teamsData, companiesData, brandsData, usersData] = await Promise.all([
                getKeledons(),
                getTeams(),
                getCompanies(),
                getBrands(),
                getUsers(),
            ]);
            setKeledons(keledonsData);
            setTeams(teamsData);
            setCompanies(companiesData);
            setBrands(brandsData);
            setUsers(usersData);
        } catch (error) {
            console.error('Failed to fetch keledons:', error);
            toast.error('Failed to fetch KELEDONS');
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setFormData({ name: '', email: '', teamId: '', brandId: '', companyId: '', countryCode: '', userId: '', role: 'agent', autonomyLevel: 5, uiInterfaces: [] });
    };

    const openCreateForm = () => {
        resetForm();
        setEditingKeledon(null);
        setShowForm(true);
    };

    const openEditForm = (keledon: Keledon) => {
        const brand = brands.find(b => b.id === keledon.brandId);
        setFormData({
            name: keledon.name || '',
            email: keledon.email || '',
            teamId: keledon.teamId || '',
            brandId: keledon.brandId || '',
            companyId: brand?.companyId || '',
            countryCode: keledon.countryCode || '',
            userId: keledon.userId || '',
            role: keledon.role || 'agent',
            autonomyLevel: keledon.autonomyLevel || 5,
            uiInterfaces: keledon.uiInterfaces ? JSON.parse(keledon.uiInterfaces) : [],
        });
        setEditingKeledon(keledon);
        setShowForm(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            if (editingKeledon) {
                await updateKeledon(editingKeledon.id, formData);
                toast.success('KELEDON updated successfully');
            } else {
                await createKeledon(formData);
                toast.success('KELEDON created successfully');
            }
            setShowForm(false);
            fetchData();
        } catch (error) {
            console.error('Failed to save keledon:', error);
            toast.error('Failed to save KELEDON');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this KELEDON?')) return;
        try {
            await deleteKeledon(id);
            toast.success('KELEDON deleted successfully');
            fetchData();
        } catch (error) {
            console.error('Failed to delete keledon:', error);
            toast.error('Failed to delete KELEDON');
        }
    };

    const filteredKeledons = keledons.filter(k =>
        k.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        k.email?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const getTeamName = (teamId?: string) => {
        if (!teamId) return '—';
        return teams.find(t => t.id === teamId)?.name || '—';
    };

    const getCompanyName = (keledon: Keledon) => {
        const team = teams.find(t => t.id === keledon.teamId);
        const brand = brands.find(b => b.id === team?.brandId);
        return brand?.name || companies.find(c => c.id === brand?.companyId)?.name || '—';
    };

    const filteredTeams = formData.brandId
        ? teams.filter(t => t.brandId === formData.brandId)
        : formData.companyId
            ? teams.filter(t => {
                const brand = brands.find(b => b.id === t.brandId);
                return brand?.companyId === formData.companyId;
            })
            : teams;

    const filteredBrands = formData.companyId
        ? brands.filter(b => b.companyId === formData.companyId)
        : brands;

    const formDataCompanyId = (() => {
        if (formData.brandId) {
            const brand = brands.find(b => b.id === formData.brandId);
            return brand?.companyId;
        }
        if (formData.teamId) {
            const team = teams.find(t => t.id === formData.teamId);
            const brand = brands.find(b => b.id === team?.brandId);
            return brand?.companyId;
        }
        return '';
    })();

    const getCountryOptions = () => {
        const company = companies.find(c => c.id === formDataCompanyId);
        if (company?.countries) {
            return company.countries;
        }
        return [];
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Bot className="w-6 h-6 text-primary" />
                    <div>
                        <h1 className="text-2xl font-bold">KELEDONS</h1>
                        <p className="text-muted-foreground">Manage AI KELEDONS and their assignments</p>
                    </div>
                </div>
                <button onClick={openCreateForm} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors">
                    <Plus className="w-4 h-4" />
                    Add KELEDON
                </button>
            </div>

            <div className="flex items-center gap-4">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search KELEDONS..."
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
                ) : filteredKeledons.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                        <Bot className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>No KELEDONS found</p>
                        <button onClick={openCreateForm} className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors">
                            Add First KELEDON
                        </button>
                    </div>
                ) : (
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-border text-left text-sm text-muted-foreground">
                                <th className="px-4 py-3 font-medium">NAME</th>
                                <th className="px-4 py-3 font-medium">COMPANY/BRAND</th>
                                <th className="px-4 py-3 font-medium">TEAM</th>
                                <th className="px-4 py-3 font-medium">COUNTRY</th>
                                <th className="px-4 py-3 font-medium">AUTONOMY</th>
                                <th className="px-4 py-3 font-medium">STATUS</th>
                                <th className="px-4 py-3 font-medium">ACTIONS</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredKeledons.map((keledon) => (
                                <tr key={keledon.id} className="border-b border-border hover:bg-muted/50">
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-3">
                                            <Bot className="w-5 h-5 text-primary" />
                                            <div>
                                                <p className="font-medium">{keledon.name}</p>
                                                <p className="text-xs text-muted-foreground">{keledon.email || 'No email'}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-muted-foreground">{getCompanyName(keledon)}</td>
                                    <td className="px-4 py-3 text-muted-foreground">{getTeamName(keledon.teamId)}</td>
                                    <td className="px-4 py-3 text-muted-foreground">{keledon.countryCode || '—'}</td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-2">
                                            <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-primary rounded-full"
                                                    style={{ width: `${(keledon.autonomyLevel || 5) * 10}%` }}
                                                />
                                            </div>
                                            <span className="text-xs text-muted-foreground">{keledon.autonomyLevel || 5}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={cn('px-2 py-1 rounded text-xs font-medium',
                                            keledon.isActive ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'
                                        )}>
                                            {keledon.isActive ? 'Active' : 'Inactive'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex gap-2">
                                            <button onClick={() => openEditForm(keledon)} className="p-1.5 hover:bg-muted rounded transition-colors" title="Edit">
                                                <Pencil className="w-4 h-4" />
                                            </button>
                                            <button onClick={() => handleDelete(keledon.id)} className="p-1.5 hover:bg-destructive/10 text-destructive rounded transition-colors" title="Delete">
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
                    <div className="bg-card border border-border rounded-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold">{editingKeledon ? 'Edit' : 'Add'} KELEDON</h3>
                            <button onClick={() => setShowForm(false)} className="p-1 hover:bg-muted rounded">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm text-muted-foreground mb-1">Name</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    required
                                    className="w-full px-4 py-2 rounded-lg bg-muted border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-muted-foreground mb-1">Email (optional)</label>
                                <input
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    className="w-full px-4 py-2 rounded-lg bg-muted border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-muted-foreground mb-1">Company</label>
                                <select
                                    value={formDataCompanyId}
                                    onChange={(e) => setFormData({ ...formData, companyId: e.target.value, brandId: '', teamId: '' })}
                                    className="w-full px-4 py-2 rounded-lg bg-muted border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                                >
                                    <option value="">Select Company...</option>
                                    {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm text-muted-foreground mb-1">Brand</label>
                                <select
                                    value={formData.brandId}
                                    onChange={(e) => setFormData({ ...formData, brandId: e.target.value, teamId: '' })}
                                    disabled={!formDataCompanyId}
                                    className="w-full px-4 py-2 rounded-lg bg-muted border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50"
                                >
                                    <option value="">Select Brand...</option>
                                    {filteredBrands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm text-muted-foreground mb-1">Country</label>
                                <select
                                    value={formData.countryCode}
                                    onChange={(e) => setFormData({ ...formData, countryCode: e.target.value })}
                                    disabled={!formDataCompanyId}
                                    className="w-full px-4 py-2 rounded-lg bg-muted border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50"
                                >
                                    <option value="">Select Country...</option>
                                    {getCountryOptions().map((c: any) => (
                                        <option key={c.countryCode} value={c.countryCode}>{c.countryCode}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm text-muted-foreground mb-1">Team</label>
                                <select
                                    value={formData.teamId}
                                    onChange={(e) => setFormData({ ...formData, teamId: e.target.value })}
                                    disabled={!formData.brandId && !formDataCompanyId}
                                    required
                                    className="w-full px-4 py-2 rounded-lg bg-muted border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50"
                                >
                                    <option value="">Select Team...</option>
                                    {filteredTeams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm text-muted-foreground mb-1">Assigned User (optional)</label>
                                <select
                                    value={formData.userId}
                                    onChange={(e) => setFormData({ ...formData, userId: e.target.value })}
                                    className="w-full px-4 py-2 rounded-lg bg-muted border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                                >
                                    <option value="">No user assigned</option>
                                    {users.filter(u => u.role === 'admin' || u.role === 'coordinator' || u.role === 'team_leader').map(u => (
                                        <option key={u.id} value={u.id}>{u.name || u.email}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm text-muted-foreground mb-1">Role</label>
                                <select
                                    value={formData.role}
                                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                    className="w-full px-4 py-2 rounded-lg bg-muted border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                                >
                                    <option value="agent">Agent</option>
                                    <option value="coordinator">Coordinator</option>
                                    <option value="supervisor">Supervisor</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm text-muted-foreground mb-1">Autonomy Level: {formData.autonomyLevel}</label>
                                <input
                                    type="range"
                                    min="1"
                                    max="10"
                                    value={formData.autonomyLevel}
                                    onChange={(e) => setFormData({ ...formData, autonomyLevel: parseInt(e.target.value) })}
                                    className="w-full"
                                />
                                <div className="flex justify-between text-xs text-muted-foreground">
                                    <span>Asks for approval</span>
                                    <span>Fully autonomous</span>
                                </div>
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
