import { useState, useEffect } from 'react';
import { UserCircle, Plus, RefreshCw, Loader2, Pencil, Trash2, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { getUsers, getTeams, getCompanies, createUser, updateUser, deleteUser, type User as UserType, type Team, type Company } from '@/lib/crud-api';

export default function ManagementAgentsPage() {
    const [agents, setAgents] = useState<any[]>([]);
    const [users, setUsers] = useState<UserType[]>([]);
    const [teams, setTeams] = useState<Team[]>([]);
    const [companies, setCompanies] = useState<Company[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [editingAgent, setEditingAgent] = useState<UserType | null>(null);
    const [saving, setSaving] = useState(false);

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        role: 'agent',
        company_id: '',
        team_id: ''
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [usersData, teamsData, companiesData] = await Promise.all([
                getUsers(),
                getTeams(),
                getCompanies()
            ]);
            setUsers(usersData);
            setTeams(teamsData);
            setCompanies(companiesData);
            setAgents(usersData.filter(u => u.role === 'agent' || u.role === 'coordinator' || u.role === 'supervisor'));
        } catch (error) {
            console.error('Failed to fetch agents:', error);
            toast.error('Failed to fetch agents');
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setFormData({ name: '', email: '', role: 'agent', company_id: '', team_id: '' });
    };

    const openCreateForm = () => {
        resetForm();
        setEditingAgent(null);
        setShowForm(true);
    };

    const openEditForm = (agent: any) => {
        setFormData({
            name: agent.name || '',
            email: agent.email || '',
            role: agent.role || 'agent',
            company_id: agent.company_id || '',
            team_id: agent.team_id || ''
        });
        setEditingAgent(agent);
        setShowForm(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            if (editingAgent) {
                await updateUser(editingAgent.id, formData);
                toast.success('Agent updated successfully');
            } else {
                await createUser(formData);
                toast.success('Agent created successfully');
            }
            setShowForm(false);
            fetchData();
        } catch (error) {
            console.error('Failed to save agent:', error);
            toast.error('Failed to save agent');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this agent?')) return;
        try {
            await deleteUser(id);
            toast.success('Agent deleted successfully');
            fetchData();
        } catch (error) {
            console.error('Failed to delete agent:', error);
            toast.error('Failed to delete agent');
        }
    };

    const filteredAgents = agents.filter(a =>
        a.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.email?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const getTeamName = (teamId?: string) => {
        if (!teamId) return '—';
        return teams.find(t => t.id === teamId)?.name || '—';
    };

    const getCompanyName = (companyId?: string) => {
        if (!companyId) return '—';
        return companies.find(c => c.id === companyId)?.name || '—';
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <UserCircle className="w-6 h-6 text-primary" />
                    <div>
                        <h1 className="text-2xl font-bold">Agents</h1>
                        <p className="text-muted-foreground">Manage AI agents and their assignments</p>
                    </div>
                </div>
                <button onClick={openCreateForm} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors">
                    <Plus className="w-4 h-4" />
                    Add Agent
                </button>
            </div>

            <div className="flex items-center gap-4">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search agents..."
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
                ) : filteredAgents.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                        <UserCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>No agents found</p>
                        <button onClick={openCreateForm} className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors">
                            Add First Agent
                        </button>
                    </div>
                ) : (
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-border text-left text-sm text-muted-foreground">
                                <th className="px-4 py-3 font-medium">NAME</th>
                                <th className="px-4 py-3 font-medium">EMAIL</th>
                                <th className="px-4 py-3 font-medium">COMPANY</th>
                                <th className="px-4 py-3 font-medium">TEAM</th>
                                <th className="px-4 py-3 font-medium">ROLE</th>
                                <th className="px-4 py-3 font-medium">ACTIONS</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredAgents.map((agent) => (
                                <tr key={agent.id} className="border-b border-border hover:bg-muted/50">
                                    <td className="px-4 py-3 font-medium">{agent.name}</td>
                                    <td className="px-4 py-3 text-muted-foreground">{agent.email}</td>
                                    <td className="px-4 py-3 text-muted-foreground">{getCompanyName(agent.company_id)}</td>
                                    <td className="px-4 py-3 text-muted-foreground">{getTeamName(agent.team_id)}</td>
                                    <td className="px-4 py-3">
                                        <span className={cn('px-2 py-1 rounded text-xs font-medium', 
                                            agent.role === 'supervisor' ? 'bg-purple-500/20 text-purple-400' :
                                            agent.role === 'coordinator' ? 'bg-yellow-500/20 text-yellow-400' :
                                            'bg-blue-500/20 text-blue-400'
                                        )}>
                                            {agent.role}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex gap-2">
                                            <button onClick={() => openEditForm(agent)} className="p-1.5 hover:bg-muted rounded transition-colors" title="Edit">
                                                <Pencil className="w-4 h-4" />
                                            </button>
                                            <button onClick={() => handleDelete(agent.id)} className="p-1.5 hover:bg-destructive/10 text-destructive rounded transition-colors" title="Delete">
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
                            <h3 className="text-lg font-semibold">{editingAgent ? 'Edit' : 'Add'} Agent</h3>
                            <button onClick={() => setShowForm(false)} className="p-1 hover:bg-muted rounded">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm text-muted-foreground mb-1">Name</label>
                                <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required className="w-full px-4 py-2 rounded-lg bg-muted border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
                            </div>
                            <div>
                                <label className="block text-sm text-muted-foreground mb-1">Email</label>
                                <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} required className="w-full px-4 py-2 rounded-lg bg-muted border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
                            </div>
                            <div>
                                <label className="block text-sm text-muted-foreground mb-1">Company</label>
                                <select value={formData.company_id} onChange={(e) => setFormData({ ...formData, company_id: e.target.value, team_id: '' })} required className="w-full px-4 py-2 rounded-lg bg-muted border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50">
                                    <option value="">Select Company...</option>
                                    {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm text-muted-foreground mb-1">Team</label>
                                <select value={formData.team_id} onChange={(e) => setFormData({ ...formData, team_id: e.target.value })} disabled={!formData.company_id} className="w-full px-4 py-2 rounded-lg bg-muted border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50">
                                    <option value="">Select Team...</option>
                                    {teams.filter(t => t.company_id === formData.company_id).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm text-muted-foreground mb-1">Role</label>
                                <select value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value })} className="w-full px-4 py-2 rounded-lg bg-muted border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50">
                                    <option value="agent">Agent</option>
                                    <option value="coordinator">Coordinator</option>
                                    <option value="supervisor">Supervisor</option>
                                </select>
                            </div>
                            <div className="flex justify-end gap-3 mt-6">
                                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg bg-muted text-foreground hover:bg-muted/80 transition-colors">Cancel</button>
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
