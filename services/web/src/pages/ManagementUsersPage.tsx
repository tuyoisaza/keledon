import ManagementModal from '@/components/common/ManagementModal';
import RecordDetails from '@/components/common/RecordDetails';
import { useTranslation } from '@/context/I18nContext';
import { useState, useEffect } from 'react';
import { User, Plus, RefreshCw, Loader2, Pencil, Trash2, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { getUsers, getCompanies, getBrands, getTeams, createUser, updateUser, deleteUser, type User as UserType, type Company, type Brand, type Team } from '@/lib/crud-api';

export default function ManagementUsersPage() {
    const { t } = useTranslation();
    const { user: currentUser } = useAuth();
    const isSuperAdmin = currentUser?.role === 'superadmin';
    const canManageUser = (target: UserType) => isSuperAdmin || (['admin', 'coordinator'].includes(currentUser?.role || '') && target.role === 'user');

    const [users, setUsers] = useState<UserType[]>([]);
    const [companies, setCompanies] = useState<Company[]>([]);
    const [brands, setBrands] = useState<Brand[]>([]);
    const [teams, setTeams] = useState<Team[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [editingUser, setEditingUser] = useState<UserType | null>(null);
    const [saving, setSaving] = useState(false);

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        role: 'user',
        companyId: '',
        brandId: '',
        teamId: ''
    });

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
            toast.error(t('records.fetchFailedEntity').replace('{entity}', t('records.userPlural')));
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setFormData({ name: '', email: '', role: 'user', companyId: isSuperAdmin ? '' : currentUser?.companyId || '', brandId: '', teamId: '' });
    };

    const openCreateForm = () => {
        resetForm();
        setEditingUser(null);
        setShowForm(true);
    };

    const openEditForm = (user: UserType) => {
        if (!canManageUser(user)) return;
        setFormData({
            name: user.name || '',
            email: user.email || '',
            role: user.role || 'user',
            companyId: user.companyId || '',
            brandId: user.brandId || '',
            teamId: user.teamId || ''
        });
        setEditingUser(user);
        setShowForm(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const submitData: { name: string; email: string; role?: string; companyId?: string; teamId?: string } = {
                name: formData.name,
                email: formData.email,
            };
            if (isSuperAdmin) {
                submitData.role = formData.role;
                if (formData.companyId) submitData.companyId = formData.companyId;
                if (formData.teamId) submitData.teamId = formData.teamId;
            } else if (formData.teamId) {
                // The API validates every team against the actor's DB-derived tenant.
                submitData.teamId = formData.teamId;
            }
            if (editingUser && !canManageUser(editingUser)) return;
            if (editingUser) {
                await updateUser(editingUser.id, submitData);
                toast.success(t('records.updatedEntity').replace('{entity}', t('records.user')));
            } else {
                await createUser(submitData);
                toast.success(t('records.createdEntity').replace('{entity}', t('records.user')));
            }
            setShowForm(false);
            fetchData();
        } catch (error) {
            const denied = error instanceof Error && /API Error (400|403|404):/.test(error.message);
            toast.error(t(denied ? 'records.saveDenied' : 'records.saveFailed'));
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        const target = users.find(user => user.id === id);
        if (!target || !canManageUser(target)) return;
        if (!confirm(t('records.confirmDeleteEntity').replace('{entity}', t('records.user')))) return;
        try {
            await deleteUser(id);
            toast.success(t('records.deletedEntity').replace('{entity}', t('records.user')));
            fetchData();
        } catch (error) {
            console.error('Failed to delete user:', error);
            toast.error(t('records.deleteFailedEntity').replace('{entity}', t('records.user')));
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
                        <h1 className="text-2xl font-bold capitalize">{t('records.userPlural')}</h1>
                        <p className="text-muted-foreground">{t('records.manageUsers')}</p>
                    </div>
                </div>
                <button onClick={openCreateForm} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors">
                    <Plus className="w-4 h-4" />
                    {t('records.addUser')}
                </button>
            </div>

            <div className="flex items-center gap-4">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder={t('records.searchEntity').replace('{entity}', t('records.userPlural'))}
                        className="w-full pl-10 pr-4 py-2 border border-border rounded-lg bg-muted/50 focus:border-primary/50 focus:ring-1 focus:ring-primary/50 outline-none"
                    />
                </div>
                <button onClick={fetchData} aria-label={t('records.refresh')} className="p-2 hover:bg-muted rounded-lg transition-colors" title={t('records.refresh')}>
                    <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
                </button>
            </div>

            <div className="rounded-xl border border-border bg-card overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    </div>
                ) : filteredUsers.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                        <User className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>{t('records.noEntityFound').replace('{entity}', t('records.userPlural'))}</p>
                        <button onClick={openCreateForm} className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors">
                            {t('records.addFirst').replace('{entity}', t('records.user'))}
                        </button>
                    </div>
                ) : (
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-border text-left text-sm text-muted-foreground">
                                <th className="px-4 py-3 font-medium">{t('records.name').toUpperCase()}</th>
                                <th className="px-4 py-3 font-medium">{t('records.email').toUpperCase()}</th>
                                <th className="px-4 py-3 font-medium">{t('records.company').toUpperCase()}</th>
                                <th className="px-4 py-3 font-medium">{t('records.brand').toUpperCase()}</th>
                                <th className="px-4 py-3 font-medium">{t('records.team').toUpperCase()}</th>
                                <th className="px-4 py-3 font-medium">{t('records.role').toUpperCase()}</th>
                                <th className="px-4 py-3 font-medium">{t('records.actions').toUpperCase()}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredUsers.map((user) => (
                                <tr key={user.id} className="border-b border-border hover:bg-muted/50">
                                    <td className="px-4 py-3 font-medium">{user.name}</td>
                                    <td className="px-4 py-3 text-muted-foreground">{user.email}</td>
                                    <td className="px-4 py-3 text-muted-foreground">{getCompanyName(user.companyId)}</td>
                                    <td className="px-4 py-3 text-muted-foreground">{getBrandName(user.brandId)}</td>
                                    <td className="px-4 py-3 text-muted-foreground">{getTeamName(user.teamId)}</td>
                                    <td className="px-4 py-3">
                                        <span className={cn('px-2 py-1 rounded text-xs font-medium', getRoleBadgeStyle(user.role))}>
                                            {user.role || 'user'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex gap-2">
                                            <RecordDetails name={user.name || user.id} fields={[
                                                { label: t('records.id'), value: user.id },
                                                { label: t('records.name'), value: user.name },
                                                { label: t('records.email'), value: user.email },
                                                { label: t('records.role'), value: user.role },
                                                { label: t('records.company'), value: getCompanyName(user.companyId) },
                                                { label: t('records.brand'), value: getBrandName(user.brandId) },
                                                { label: t('records.team'), value: getTeamName(user.teamId) },
                                                { label: t('records.lastLogin'), value: user.lastLogin },
                                                { label: t('records.created'), value: user.createdAt }
                                            ]} />
                                            <button disabled={!canManageUser(user)} onClick={() => openEditForm(user)} className="p-1.5 hover:bg-muted rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed" title={t('records.edit')}>
                                                <Pencil className="w-4 h-4" />
                                            </button>
                                            <button disabled={!canManageUser(user)} onClick={() => handleDelete(user.id)} className="p-1.5 hover:bg-destructive/10 text-destructive rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed" title={t('records.delete')}>
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
                <ManagementModal title={t('records.user')} onClose={() => setShowForm(false)}>
                    <div className="bg-card border border-border rounded-xl p-6 w-full max-w-md">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold">{editingUser ? t('records.edit') : t('records.add')} {t('records.user')}</h3>
                            <button type="button" aria-label={t('records.close')} onClick={() => setShowForm(false)} className="p-1 hover:bg-muted rounded">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label htmlFor="management-users-field-1" className="block text-sm text-muted-foreground mb-1">{t('records.fullName')}</label>
                                <input id="management-users-field-1" type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required className="w-full px-4 py-2 rounded-lg bg-muted border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
                            </div>
                            <div>
                                <label htmlFor="management-users-field-2" className="block text-sm text-muted-foreground mb-1">{t('records.email')}</label>
                                <input id="management-users-field-2" type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} required className="w-full px-4 py-2 rounded-lg bg-muted border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
                            </div>
                            <div>
                                {isSuperAdmin ? (
                                    <>
                                        <label htmlFor="management-users-field-3" className="block text-sm text-muted-foreground mb-1">{t('records.company')}</label>
                                        <select id="management-users-field-3"
                                            value={formData.companyId}
                                            onChange={(e) => setFormData({ ...formData, companyId: e.target.value, brandId: '', teamId: '' })}
                                            className="w-full px-4 py-2 rounded-lg bg-muted border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                                        >
                                            <option value="">{t('records.allCompanies')}</option>
                                            {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                        </select>
                                    </>
                                ) : (
                                    <fieldset className="min-w-0">
                                        <legend className="block text-sm text-muted-foreground mb-1">{t('records.company')}</legend>
                                        <p id="management-users-field-3" className="w-full px-4 py-2 rounded-lg bg-muted border border-border text-muted-foreground">
                                            {companies.find(company => company.id === currentUser?.companyId)?.name || t('records.yourCompany')}
                                        </p>
                                    </fieldset>
                                )}
                            </div>
                            <div>
                                <label htmlFor="management-users-field-4" className="block text-sm text-muted-foreground mb-1">{t('records.brand')} {!isSuperAdmin && '*'}</label>
                                <select id="management-users-field-4"
                                    value={formData.brandId}
                                    onChange={(e) => setFormData({ ...formData, brandId: e.target.value, teamId: '' })}
                                    disabled={!isSuperAdmin && !formData.companyId}
                                    required={!isSuperAdmin && !editingUser}
                                    className="w-full px-4 py-2 rounded-lg bg-muted border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50"
                                >
                                    <option value="">{isSuperAdmin ? t('records.allBrands') : t('records.selectBrand')}</option>
                                    {brands.filter(b => isSuperAdmin ? (!formData.companyId || b.companyId === formData.companyId) : b.companyId === currentUser?.companyId).map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label htmlFor="management-users-field-5" className="block text-sm text-muted-foreground mb-1">{t('records.team')}</label>
                                <select id="management-users-field-5"
                                    value={formData.teamId}
                                    onChange={(e) => setFormData({ ...formData, teamId: e.target.value })}
                                    disabled={!isSuperAdmin && !formData.brandId}
                                    className="w-full px-4 py-2 rounded-lg bg-muted border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50"
                                >
                                    <option value="">{isSuperAdmin ? t('records.allTeams') : t('records.selectTeam')}</option>
                                    {teams.filter(t => (!formData.brandId || t.brandId === formData.brandId) && (isSuperAdmin ? (!formData.companyId || (t.company?.id ?? t.brand?.companyId) === formData.companyId) : (t.company?.id ?? t.brand?.companyId) === currentUser?.companyId)).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                </select>
                            </div>
                            {isSuperAdmin && <div>
                                <label htmlFor="management-users-field-6" className="block text-sm text-muted-foreground mb-1">{t('records.role')}</label>
                                <select id="management-users-field-6" value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value })} className="w-full px-4 py-2 rounded-lg bg-muted border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50">
                                    <option value="user">{t('records.user')}</option>
                                    <option value="guest">{t('records.guest')}</option>
                                    <option value="agent">{t('records.agent')}</option>
                                    <option value="coordinator">{t('records.coordinator')}</option>
                                    <option value="admin">{t('records.admin')}</option>
                                    <option value="superadmin">{t('records.superadmin')}</option>
                                </select>
                            </div>}
                            <div className="flex justify-end gap-3 mt-6">
                                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg bg-muted text-foreground hover:bg-muted/80 transition-colors">{t('records.cancel')}</button>
                                <button type="submit" disabled={saving} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors font-medium disabled:opacity-50 flex items-center gap-2">
                                    {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                                    {saving ? t('records.saving') : t('records.save')}
                                </button>
                            </div>
                        </form>
                    </div>
                </ManagementModal>
            )}
        </div>
    );
}
