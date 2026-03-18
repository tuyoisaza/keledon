import { useState, useEffect } from 'react';
import { User, Plus, RefreshCw, Loader2, Pencil, Trash2, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { getUsers, getCompanies, getBrands, getTeams, createUser, updateUser, deleteUser, type User as UserType, type Company, type Brand, type Team } from '@/lib/crud-api';
import { EntityForm } from '@/components/superadmin/EntityForm';

export default function ManagementUsersPage() {
    const [users, setUsers] = useState<any[]>([]);
    const [companies, setCompanies] = useState<Company[]>([]);
    const [brands, setBrands] = useState<Brand[]>([]);
    const [teams, setTeams] = useState<Team[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [editingUser, setEditingUser] = useState<UserType | null>(null);
    const [formLoading, setFormLoading] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [usersData, companiesData, brandsData, teamsData] = await Promise.all([
                getUsers(),
                getCompanies(),
                getBrands(),
                getTeams()
            ]);
            setUsers(usersData);
            setCompanies(companiesData);
            setBrands(brandsData);
            setTeams(teamsData);
        } catch (error) {
            console.error('Failed to fetch users:', error);
            toast.error('Failed to fetch users');
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async (data: any) => {
        setFormLoading(true);
        try {
            await createUser(data);
            toast.success('User created successfully');
            setShowForm(false);
            fetchData();
        } catch (error) {
            console.error('Failed to create user:', error);
            toast.error('Failed to create user');
        } finally {
            setFormLoading(false);
        }
    };

    const handleUpdate = async (data: any) => {
        if (!editingUser) return;
        setFormLoading(true);
        try {
            await updateUser(editingUser.id, data);
            toast.success('User updated successfully');
            setEditingUser(null);
            fetchData();
        } catch (error) {
            console.error('Failed to update user:', error);
            toast.error('Failed to update user');
        } finally {
            setFormLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this user?')) return;
        try {
            await deleteUser(id);
            toast.success('User deleted successfully');
            fetchData();
        } catch (error) {
            console.error('Failed to delete user:', error);
            toast.error('Failed to delete user');
        }
    };

    const filteredUsers = users.filter(u =>
        u.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const getCompanyName = (companyId?: string) => {
        if (!companyId) return '—';
        return companies.find(c => c.id === companyId)?.name || '—';
    };

    const getBrandName = (brandId?: string) => {
        if (!brandId) return '—';
        return brands.find(b => b.id === brandId)?.name || '—';
    };

    const getTeamName = (teamId?: string) => {
        if (!teamId) return '—';
        return teams.find(t => t.id === teamId)?.name || '—';
    };

    const getRoleBadgeStyle = (role?: string) => {
        switch (role) {
            case 'superadmin': return 'bg-red-500/20 text-red-400';
            case 'admin': return 'bg-primary/20 text-primary';
            case 'coordinator': return 'bg-yellow-500/20 text-yellow-400';
            case 'agent': return 'bg-blue-500/20 text-blue-400';
            default: return 'bg-muted text-muted-foreground';
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <User className="w-6 h-6 text-primary" />
                    <div>
                        <h1 className="text-2xl font-bold">Users</h1>
                        <p className="text-muted-foreground">Manage users for your organization</p>
                    </div>
                </div>
                <button
                    onClick={() => setShowForm(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                >
                    <Plus className="w-4 h-4" />
                    Add User
                </button>
            </div>

            <div className="flex items-center gap-4">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search users..."
                        className="w-full pl-10 pr-4 py-2 border border-border rounded-lg bg-muted/50 focus:border-primary/50 focus:ring-1 focus:ring-primary/50 outline-none"
                    />
                </div>
                <button onClick={fetchData} className="p-2 hover:bg-muted rounded-lg transition-colors" title="Refresh">
                    <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
                </button>
            </div>

            {showForm && (
                <EntityForm
                    activeTab="users"
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
                ) : filteredUsers.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                        <User className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>No users found</p>
                        <button onClick={() => setShowForm(true)} className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors">
                            Add First User
                        </button>
                    </div>
                ) : (
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-border text-left text-sm text-muted-foreground">
                                <th className="px-4 py-3 font-medium">NAME</th>
                                <th className="px-4 py-3 font-medium">EMAIL</th>
                                <th className="px-4 py-3 font-medium">COMPANY</th>
                                <th className="px-4 py-3 font-medium">BRAND</th>
                                <th className="px-4 py-3 font-medium">TEAM</th>
                                <th className="px-4 py-3 font-medium">ROLE</th>
                                <th className="px-4 py-3 font-medium">ACTIONS</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredUsers.map((user) => (
                                <tr key={user.id} className="border-b border-border hover:bg-muted/50">
                                    <td className="px-4 py-3 font-medium">{user.name}</td>
                                    <td className="px-4 py-3 text-muted-foreground">{user.email}</td>
                                    <td className="px-4 py-3 text-muted-foreground">{getCompanyName(user.company_id)}</td>
                                    <td className="px-4 py-3 text-muted-foreground">{getBrandName(user.brand_id)}</td>
                                    <td className="px-4 py-3 text-muted-foreground">{getTeamName(user.team_id)}</td>
                                    <td className="px-4 py-3">
                                        <span className={cn('px-2 py-1 rounded text-xs font-medium', getRoleBadgeStyle(user.role))}>
                                            {user.role || 'user'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex gap-2">
                                            <button onClick={() => setEditingUser(user)} className="p-1.5 hover:bg-muted rounded transition-colors" title="Edit">
                                                <Pencil className="w-4 h-4" />
                                            </button>
                                            <button onClick={() => handleDelete(user.id)} className="p-1.5 hover:bg-destructive/10 text-destructive rounded transition-colors" title="Delete">
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

            {editingUser && (
                <EntityForm
                    activeTab="users"
                    editingEntity={editingUser}
                    onSubmit={handleUpdate}
                    onClose={() => setEditingUser(null)}
                    isSuperAdmin={true}
                    saving={formLoading}
                />
            )}
        </div>
    );
}
