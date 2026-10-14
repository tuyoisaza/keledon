import { useCallback, useEffect, useId, useState } from 'react';
import { useTranslation } from '@/context/I18nContext';
import ManagementModal from '@/components/common/ManagementModal';
import { Bot, Plus, RefreshCw, Loader2, Pencil, Trash2, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { getKeledons, createKeledon, updateKeledon, deleteKeledon, getTeams, getCompanies, getBrands, getUsers, type Keledon, type Team, type Company, type CompanyCountry, type Brand, type User, type KeledonMutationInput } from '@/lib/crud-api';

function parseUiInterfaces(value?: string): string[] {
    if (!value) return [];
    try {
        const parsed: unknown = JSON.parse(value);
        return Array.isArray(parsed) && parsed.every(item => typeof item === 'string') ? parsed : [];
    } catch {
        return [];
    }
}

export default function ManagementKeledonsPage() {
    const { t } = useTranslation();
    const idPrefix = useId();
    const [keledons, setKeledons] = useState<Keledon[]>([]);
    const [teams, setTeams] = useState<Team[]>([]);
    const [companies, setCompanies] = useState<Company[]>([]);
    const [brands, setBrands] = useState<Brand[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<Keledon | null>(null);
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

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            setLoadError(false);
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
        } catch {
            setLoadError(true);
            toast.error(t('keledons.loadFailed'));
        } finally {
            setLoading(false);
        }
    }, [t]);

    useEffect(() => {
        void fetchData();
    }, [fetchData]);

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
            uiInterfaces: parseUiInterfaces(keledon.uiInterfaces),
        });
        setEditingKeledon(keledon);
        setShowForm(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            // Build submit data
            const submitData: KeledonMutationInput & { name: string } = {
                name: formData.name,
                email: formData.email,
                role: formData.role,
                autonomyLevel: formData.autonomyLevel || 5,
                countryCode: formData.countryCode || undefined,
                uiInterfaces: formData.uiInterfaces.length > 0 ? formData.uiInterfaces : undefined
            };

            // Add teamId if selected
            if (formData.teamId) {
                submitData.teamId = formData.teamId;
            }

            // Add brand if selected
            if (formData.brandId) {
                submitData.brandId = formData.brandId;
            }

            if (editingKeledon) {
                await updateKeledon(editingKeledon.id, submitData);
                toast.success(t('keledons.updateSuccess'));
            } else {
                await createKeledon({ ...submitData, teamId: formData.teamId });
                toast.success(t('keledons.createSuccess'));
            }
            setShowForm(false);
            await fetchData();
        } catch {
            toast.error(t('keledons.saveFailed'));
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        try {
            await deleteKeledon(deleteTarget.id);
            toast.success(t('keledons.deleteSuccess'));
            setDeleteTarget(null);
            await fetchData();
        } catch {
            toast.error(t('keledons.deleteFailed'));
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
        return formData.companyId || '';
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
                        <h1 className="text-2xl font-bold">{t('keledons.title')}</h1>
                        <p className="text-muted-foreground">{t('keledons.description')}</p>
                    </div>
                </div>
                <button type="button" onClick={openCreateForm} className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
                    <Plus className="w-4 h-4" />
                    {t('keledons.addKeledon')}
                </button>
            </div>

            <div className="flex items-center gap-4">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <label htmlFor={`${idPrefix}-search`} className="sr-only">{t('keledons.searchLabel')}</label>
                    <input
                        id={`${idPrefix}-search`}
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder={t('keledons.search')}
                        className="w-full pl-10 pr-4 py-2 border border-border rounded-lg bg-muted/50 focus:border-primary/50 focus:ring-1 focus:ring-primary/50 outline-none"
                    />
                </div>
                <button type="button" onClick={() => void fetchData()} className="rounded-lg p-2 transition-colors hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary" title={t('keledons.refresh')} aria-label={t('keledons.refreshLabel')}>
                    <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
                </button>
            </div>

            <div className="rounded-xl border border-border bg-card overflow-hidden">
                {loading ? (
                    <div role="status" aria-live="polite" className="flex items-center justify-center gap-3 py-12">
                        <Loader2 aria-hidden="true" className="w-8 h-8 animate-spin text-primary" /><span className="sr-only">{t('keledons.loading')}</span>
                    </div>
                ) : loadError ? (
                    <div role="alert" className="p-8 text-center text-destructive">
                        <p>{t('keledons.loadFailed')}</p>
                        <button type="button" onClick={() => void fetchData()} className="mt-4 rounded-lg border border-border px-4 py-2 text-foreground hover:bg-muted">{t('common.retry')}</button>
                    </div>
                ) : filteredKeledons.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                        <Bot className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>{t('keledons.noKeledons')}</p>
                        <button onClick={openCreateForm} className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors">
                            {t('keledons.addFirst')}
                        </button>
                    </div>
                ) : (
                    <table className="w-full">
                        <caption className="sr-only">{t('keledons.tableCaption')}</caption>
                        <thead>
                            <tr className="border-b border-border text-left text-sm text-muted-foreground">
                                <th scope="col" className="px-4 py-3 font-medium">{t('keledons.nameColumn')}</th>
                                <th scope="col" className="px-4 py-3 font-medium">{t('keledons.companyBrand')}</th>
                                <th scope="col" className="px-4 py-3 font-medium">{t('keledons.teamColumn')}</th>
                                <th scope="col" className="px-4 py-3 font-medium">{t('keledons.countryColumn')}</th>
                                <th scope="col" className="px-4 py-3 font-medium">{t('keledons.autonomy')}</th>
                                <th scope="col" className="px-4 py-3 font-medium">{t('keledons.statusColumn')}</th>
                                <th scope="col" className="px-4 py-3 font-medium">{t('keledons.actions')}</th>
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
                                                <p className="text-xs text-muted-foreground">{keledon.email || t('keledons.noEmail')}</p>
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
                                            keledon.isActive ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-muted-foreground'
                                        )}>
                                            {keledon.isActive ? t('keledons.status.active') : t('keledons.status.inactive')}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex gap-2">
                                            <button type="button" onClick={() => openEditForm(keledon)} className="rounded p-1.5 transition-colors hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary" title={t('keledons.edit')} aria-label={`${t('keledons.editNamed')}: ${keledon.name}`}>
                                                <Pencil className="w-4 h-4" />
                                            </button>
                                            <button type="button" onClick={() => setDeleteTarget(keledon)} className="rounded p-1.5 text-destructive transition-colors hover:bg-destructive/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary" title={t('keledons.delete')} aria-label={`${t('keledons.deleteNamed')}: ${keledon.name}`}>
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
                <ManagementModal title={editingKeledon ? t('keledons.editKeledon') : t('keledons.addKeledon')} onClose={() => setShowForm(false)}>
                    <div className="bg-card border border-border rounded-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold">{editingKeledon ? t('keledons.editKeledon') : t('keledons.addKeledon')}</h3>
                            <button type="button" onClick={() => setShowForm(false)} className="rounded p-2 hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary" aria-label={t('keledons.close')} title={t('keledons.close')}>
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label htmlFor={`${idPrefix}-name`} className="mb-1 block text-sm text-muted-foreground">{t('keledons.name')}</label>
                                <input
                                    id={`${idPrefix}-name`}
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    required
                                    className="w-full px-4 py-2 rounded-lg bg-muted border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                                />
                            </div>
                            <div>
                                <label htmlFor={`${idPrefix}-email`} className="mb-1 block text-sm text-muted-foreground">{t('keledons.emailOptional')}</label>
                                <input
                                    id={`${idPrefix}-email`}
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    className="w-full px-4 py-2 rounded-lg bg-muted border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                                />
                            </div>
                            <div>
                                <label htmlFor={`${idPrefix}-company`} className="mb-1 block text-sm text-muted-foreground">{t('keledons.company')}</label>
                                <select
                                    id={`${idPrefix}-company`}
                                    value={formDataCompanyId}
                                    onChange={(e) => setFormData({ ...formData, companyId: e.target.value, brandId: '', teamId: '' })}
                                    className="w-full px-4 py-2 rounded-lg bg-muted border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                                >
                                    <option value="">{t('keledons.selectCompany')}…</option>
                                    {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label htmlFor={`${idPrefix}-brand`} className="mb-1 block text-sm text-muted-foreground">{t('keledons.brand')}</label>
                                <select
                                    id={`${idPrefix}-brand`}
                                    value={formData.brandId}
                                    onChange={(e) => setFormData({ ...formData, brandId: e.target.value, teamId: '' })}
                                    disabled={!formDataCompanyId}
                                    className="w-full px-4 py-2 rounded-lg bg-muted border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50"
                                >
                                    <option value="">{t('keledons.selectBrand')}…</option>
                                    {filteredBrands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label htmlFor={`${idPrefix}-country`} className="mb-1 block text-sm text-muted-foreground">{t('keledons.country')}</label>
                                <select
                                    id={`${idPrefix}-country`}
                                    value={formData.countryCode}
                                    onChange={(e) => setFormData({ ...formData, countryCode: e.target.value })}
                                    disabled={!formDataCompanyId}
                                    className="w-full px-4 py-2 rounded-lg bg-muted border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50"
                                >
                                    <option value="">{t('keledons.selectCountry')}…</option>
                                    {getCountryOptions().map((c: CompanyCountry) => (
                                        <option key={c.countryCode} value={c.countryCode}>{c.countryCode}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label htmlFor={`${idPrefix}-team`} className="mb-1 block text-sm text-muted-foreground">{t('keledons.team')}</label>
                                <select
                                    id={`${idPrefix}-team`}
                                    value={formData.teamId}
                                    onChange={(e) => setFormData({ ...formData, teamId: e.target.value })}
                                    disabled={!formData.brandId && !formDataCompanyId}
                                    required
                                    className="w-full px-4 py-2 rounded-lg bg-muted border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50"
                                >
                                    <option value="">{t('keledons.selectTeam')}…</option>
                                    {filteredTeams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label htmlFor={`${idPrefix}-user`} className="mb-1 block text-sm text-muted-foreground">{t('keledons.assignedUserOptional')}</label>
                                <select
                                    id={`${idPrefix}-user`}
                                    value={formData.userId}
                                    onChange={(e) => setFormData({ ...formData, userId: e.target.value })}
                                    className="w-full px-4 py-2 rounded-lg bg-muted border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                                >
                                    <option value="">{t('keledons.noUserAssigned')}</option>
                                    {users.filter(u => u.role === 'admin' || u.role === 'coordinator' || u.role === 'team_leader').map(u => (
                                        <option key={u.id} value={u.id}>{u.name || u.email}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label htmlFor={`${idPrefix}-role`} className="mb-1 block text-sm text-muted-foreground">{t('keledons.role')}</label>
                                <select
                                    id={`${idPrefix}-role`}
                                    value={formData.role}
                                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                    className="w-full px-4 py-2 rounded-lg bg-muted border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                                >
                                    <option value="agent">{t('keledons.agentRole')}</option>
                                    <option value="coordinator">{t('keledons.coordinatorRole')}</option>
                                    <option value="supervisor">{t('keledons.supervisorRole')}</option>
                                </select>
                            </div>
                            <div>
                                <label htmlFor={`${idPrefix}-autonomy`} className="mb-1 block text-sm text-muted-foreground">{t('keledons.autonomyLevel')}: {formData.autonomyLevel}</label>
                                <input
                                    id={`${idPrefix}-autonomy`}
                                    type="range"
                                    aria-valuetext={`${formData.autonomyLevel} / 10`}
                                    min="1"
                                    max="10"
                                    value={formData.autonomyLevel}
                                    onChange={(e) => setFormData({ ...formData, autonomyLevel: parseInt(e.target.value) })}
                                    className="w-full"
                                />
                                <div className="flex justify-between text-xs text-muted-foreground">
                                    <span>{t('keledons.asksApproval')}</span>
                                    <span>{t('keledons.fullyAutonomous')}</span>
                                </div>
                            </div>
                            <div className="flex justify-end gap-3 mt-6">
                                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg bg-muted text-foreground hover:bg-muted/80 transition-colors">
                                    {t('keledons.cancel')}
                                </button>
                                <button type="submit" disabled={saving} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors font-medium disabled:opacity-50 flex items-center gap-2">
                                    {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                                    {saving ? t('keledons.saving') : t('keledons.save')}
                                </button>
                            </div>
                        </form>
                    </div>
                </ManagementModal>
            )}
            {deleteTarget && (
                <ManagementModal title={t('keledons.deleteTitle')} onClose={() => setDeleteTarget(null)}>
                    <div className="w-full max-w-lg rounded-xl border border-border bg-card p-6">
                        <h2 className="text-lg font-semibold">{t('keledons.deleteTitle')}</h2>
                        <p className="mt-3 text-muted-foreground">{t('keledons.deletePrompt')}</p>
                        <p className="mt-2 font-medium">{deleteTarget.name}</p>
                        <div className="mt-6 flex justify-end gap-3">
                            <button type="button" onClick={() => setDeleteTarget(null)} className="rounded-lg border border-border px-4 py-2 hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">{t('keledons.cancel')}</button>
                            <button type="button" onClick={() => void handleDelete()} className="rounded-lg bg-destructive px-4 py-2 text-destructive-foreground hover:bg-destructive/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">{t('keledons.delete')}</button>
                        </div>
                    </div>
                </ManagementModal>
            )}
        </div>
    );
}
