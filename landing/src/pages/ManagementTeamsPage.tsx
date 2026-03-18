import { useState, useEffect } from 'react';
import { Users, Plus, RefreshCw, Loader2, Pencil, Trash2, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { getTeams, getCompanies, getBrands, createTeam, updateTeam, deleteTeam, type Team, type Company, type Brand } from '@/lib/crud-api';
import { EntityForm } from '@/components/superadmin/EntityForm';

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
    const [formLoading, setFormLoading] = useState(false);

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

    const handleCreate = async (data: any) => {
        setFormLoading(true);
        try {
            await createTeam({
                ...data,
                created_at: new Date().toISOString()
            });
            toast.success('Team created successfully');
            setShowForm(false);
            fetchData();
        } catch (error) {
            console.error('Failed to create team:', error);
            toast.error('Failed to create team');
        } finally {
            setFormLoading(false);
        }
    };

    const handleUpdate = async (data: any) => {
        if (!editingTeam) return;
        setFormLoading(true);
        try {
            await updateTeam(editingTeam.id, data);
            toast.success('Team updated successfully');
            setEditingTeam(null);
            fetchData();
        } catch (error) {
            console.error('Failed to update team:', error);
            toast.error('Failed to update team');
        } finally {
            setFormLoading(false);
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

    const getCompanyName = (companyId: string) => {
        return companies.find(c => c.id === companyId)?.name || companyId;
    };

    const getBrandName = (brandId?: string) => {
        if (!brandId) return '—';
        return brands.find(b => b.id === brandId)?.name || brandId;
    };

    const getCountryName = (code?: string) => {
        if (!code) return '—';
        return availableCountries.find(c => c.code === code)?.name || code;
    };

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
                    onClick={() => setShowForm(true)}
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

            {showForm && (
                <EntityForm
                    activeTab="teams"
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
                ) : filteredTeams.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                        <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>No teams found</p>
                        <button onClick={() => setShowForm(true)} className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors">
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
                                    <td className="px-4 py-3 text-muted-foreground">{getCompanyName(team.company_id)}</td>
                                    <td className="px-4 py-3 text-muted-foreground">{getBrandName(team.brand_id)}</td>
                                    <td className="px-4 py-3 text-muted-foreground">{getCountryName(team.country)}</td>
                                    <td className="px-4 py-3">
                                        <div className="flex gap-2">
                                            <button onClick={() => setEditingTeam(team)} className="p-1.5 hover:bg-muted rounded transition-colors" title="Edit">
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

            {editingTeam && (
                <EntityForm
                    activeTab="teams"
                    editingEntity={editingTeam}
                    onSubmit={handleUpdate}
                    onClose={() => setEditingTeam(null)}
                    isSuperAdmin={true}
                    saving={formLoading}
                />
            )}
        </div>
    );
}
