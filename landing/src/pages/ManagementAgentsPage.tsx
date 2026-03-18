import { useState, useEffect } from 'react';
import { UserCircle, Plus, RefreshCw, Loader2, Pencil, Trash2, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { getUsers, getTeams, createUser, updateUser, deleteUser, type User as UserType, type Team } from '@/lib/crud-api';
import EntityForm from '@/components/superadmin/EntityForm';

export default function ManagementAgentsPage() {
    const [agents, setAgents] = useState<any[]>([]);
    const [users, setUsers] = useState<UserType[]>([]);
    const [teams, setTeams] = useState<Team[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [editingAgent, setEditingAgent] = useState<UserType | null>(null);
    const [formLoading, setFormLoading] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [usersData, teamsData] = await Promise.all([
                getUsers(),
                getTeams()
            ]);
            setUsers(usersData);
            setTeams(teamsData);
            setAgents(usersData.filter(u => u.role === 'agent' || u.role === 'coordinator' || u.role === 'supervisor'));
        } catch (error) {
            console.error('Failed to fetch agents:', error);
            toast.error('Failed to fetch agents');
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async (data: any) => {
        setFormLoading(true);
        try {
            await createUser({ ...data, role: 'agent' });
            toast.success('Agent created successfully');
            setShowForm(false);
            fetchData();
        } catch (error) {
            console.error('Failed to create agent:', error);
            toast.error('Failed to create agent');
        } finally {
            setFormLoading(false);
        }
    };

    const handleUpdate = async (data: any) => {
        if (!editingAgent) return;
        setFormLoading(true);
        try {
            await updateUser(editingAgent.id, data);
            toast.success('Agent updated successfully');
            setEditingAgent(null);
            fetchData();
        } catch (error) {
            console.error('Failed to update agent:', error);
            toast.error('Failed to update agent');
        } finally {
            setFormLoading(false);
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

    const getAssignedUserName = (userId?: string) => {
        if (!userId) return 'Unassigned';
        const user = users.find(u => u.id === userId);
        return user?.name || '—';
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
                <button
                    onClick={() => setShowForm(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                >
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

            {showForm && (
                <EntityForm
                    activeTab="agents"
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
                ) : filteredAgents.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                        <UserCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>No agents found</p>
                        <button onClick={() => setShowForm(true)} className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors">
                            Add First Agent
                        </button>
                    </div>
                ) : (
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-border text-left text-sm text-muted-foreground">
                                <th className="px-4 py-3 font-medium">NAME</th>
                                <th className="px-4 py-3 font-medium">EMAIL</th>
                                <th className="px-4 py-3 font-medium">TEAM</th>
                                <th className="px-4 py-3 font-medium">ASSIGNED USER</th>
                                <th className="px-4 py-3 font-medium">ROLE</th>
                                <th className="px-4 py-3 font-medium">AUTONOMY</th>
                                <th className="px-4 py-3 font-medium">ACTIONS</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredAgents.map((agent) => (
                                <tr key={agent.id} className="border-b border-border hover:bg-muted/50">
                                    <td className="px-4 py-3 font-medium">{agent.name}</td>
                                    <td className="px-4 py-3 text-muted-foreground">{agent.email}</td>
                                    <td className="px-4 py-3 text-muted-foreground">{getTeamName(agent.team_id)}</td>
                                    <td className="px-4 py-3 text-muted-foreground">{getAssignedUserName(agent.user_id)}</td>
                                    <td className="px-4 py-3">
                                        <span className={cn('px-2 py-1 rounded text-xs font-medium', 
                                            agent.role === 'supervisor' ? 'bg-purple-500/20 text-purple-400' :
                                            agent.role === 'coordinator' ? 'bg-yellow-500/20 text-yellow-400' :
                                            'bg-blue-500/20 text-blue-400'
                                        )}>
                                            {agent.role}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-muted-foreground">
                                        {agent.autonomy_level ? `${agent.autonomy_level}/5` : '—'}
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex gap-2">
                                            <button onClick={() => setEditingAgent(agent)} className="p-1.5 hover:bg-muted rounded transition-colors" title="Edit">
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

            {editingAgent && (
                <EntityForm
                    activeTab="agents"
                    editingEntity={editingAgent}
                    onSubmit={handleUpdate}
                    onClose={() => setEditingAgent(null)}
                    isSuperAdmin={true}
                    saving={formLoading}
                />
            )}
        </div>
    );
}
