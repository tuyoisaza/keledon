import ManagementModal from '@/components/common/ManagementModal';
import RecordDetails from '@/components/common/RecordDetails';
import { useTranslation } from '@/context/I18nContext';
import { useCallback, useState, useEffect, useRef } from 'react';
import { Users, Plus, RefreshCw, Loader2, Pencil, Trash2, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { getTeams, getCompanies, getBrands, createTeam, updateTeam, deleteTeam, getManagedInterfaces, getTeamInterfaces, setTeamInterfaces, type Team, type Company, type CompanyCountry, type Brand, type ManagedInterface } from '@/lib/crud-api';
import { createRequestSequence } from '@/lib/request-sequence';

const availableCountries = [
    { code: 'US', name: 'United States' },
    { code: 'UK', name: 'United Kingdom' },
    { code: 'DE', name: 'Germany' },
    { code: 'FR', name: 'France' },
    { code: 'ES', name: 'Spain' },
    { code: 'MX', name: 'Mexico' },
    { code: 'BR', name: 'Brazil' },
];

const getCountryLabel = (code: string, locale: string) =>
    new Intl.DisplayNames([locale], { type: 'region' }).of(code) ||
    availableCountries.find(country => country.code === code)?.name || code;

export default function ManagementTeamsPage() {
    const { t, locale } = useTranslation();
    const [teams, setTeams] = useState<Team[]>([]);
    const [companies, setCompanies] = useState<Company[]>([]);
    const [brands, setBrands] = useState<Brand[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [editingTeam, setEditingTeam] = useState<Team | null>(null);
    const [saving, setSaving] = useState(false);
    const [savingInterfaces, setSavingInterfaces] = useState(false);
    const [loadingInterfaces, setLoadingInterfaces] = useState(false);
    const [tenantInterfaces, setTenantInterfaces] = useState<ManagedInterface[]>([]);
    const [selectedInterfaceIds, setSelectedInterfaceIds] = useState<string[]>([]);
    const [assignedInterfaceIds, setAssignedInterfaceIds] = useState<string[]>([]);
    const interfaceRequestSequence = useRef(createRequestSequence());

    const [formData, setFormData] = useState({
        name: '',
        companyId: '',
        brandId: '',
        country: ''
    });

    const fetchData = useCallback(async () => {
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
            toast.error(t('records.fetchFailedEntity').replace('{entity}', t('records.teamPlural')));
        } finally {
            setLoading(false);
        }
    }, [t]);

    useEffect(() => {
        void fetchData();
    }, [fetchData]);

    const resetForm = () => {
        setFormData({ name: '', companyId: '', brandId: '', country: '' });
    };

    const openCreateForm = () => {
        interfaceRequestSequence.current.invalidate();
        resetForm();
        setEditingTeam(null);
        setLoadingInterfaces(false);
        setSavingInterfaces(false);
        setTenantInterfaces([]);
        setSelectedInterfaceIds([]);
        setAssignedInterfaceIds([]);
        setShowForm(true);
    };

    const closeForm = () => {
        interfaceRequestSequence.current.invalidate();
        setLoadingInterfaces(false);
        setSavingInterfaces(false);
        setShowForm(false);
    };

    const openEditForm = async (team: Team) => {
        const requestSequence = interfaceRequestSequence.current.begin();
        const brand = brands.find(b => b.id === team.brandId);
        setFormData({
            name: team.name || '',
            companyId: brand?.companyId || '',
            brandId: team.brandId || '',
            country: team.country || ''
        });
        setEditingTeam(team);
        setShowForm(true);
        setSavingInterfaces(false);
        setTenantInterfaces([]);
        setSelectedInterfaceIds([]);
        setAssignedInterfaceIds([]);
        setLoadingInterfaces(true);
        try {
            const [available, assigned] = await Promise.all([
                getManagedInterfaces(),
                getTeamInterfaces(team.id),
            ]);
            if (!interfaceRequestSequence.current.isCurrent(requestSequence)) return;
            const assignedIds = assigned.map(item => item.id);
            setTenantInterfaces(available);
            setAssignedInterfaceIds(assignedIds);
            setSelectedInterfaceIds(assignedIds);
        } catch (error) {
            if (!interfaceRequestSequence.current.isCurrent(requestSequence)) return;
            console.error('Failed to load tenant interfaces:', error);
            toast.error(t('keledons.interfacesLoadFailed'));
            setTenantInterfaces([]);
            setAssignedInterfaceIds([]);
            setSelectedInterfaceIds([]);
        } finally {
            if (interfaceRequestSequence.current.isCurrent(requestSequence)) {
                setLoadingInterfaces(false);
            }
        }
    };

    const saveTeamInterfaces = async () => {
        if (!editingTeam) return;
        const teamId = editingTeam.id;
        const interfaceIds = [...selectedInterfaceIds];
        const requestSequence = interfaceRequestSequence.current.begin();
        setSavingInterfaces(true);
        try {
            await setTeamInterfaces(teamId, interfaceIds);
            if (interfaceRequestSequence.current.isCurrent(requestSequence)) {
                setAssignedInterfaceIds(interfaceIds);
                toast.success(t('keledons.interfacesUpdated'));
            }
        } catch (error) {
            if (interfaceRequestSequence.current.isCurrent(requestSequence)) {
                console.error('Failed to save tenant interfaces:', error);
                toast.error(t('keledons.interfacesSaveFailed'));
            }
        } finally {
            if (interfaceRequestSequence.current.isCurrent(requestSequence)) {
                setSavingInterfaces(false);
            }
        }
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
                toast.success(t('records.updatedEntity').replace('{entity}', t('records.team')));
            } else {
                const result = await createTeam(submitData);
                console.log('Create result:', result);
                toast.success(t('records.createdEntity').replace('{entity}', t('records.team')));
            }
            closeForm();
            fetchData();
        } catch (error: unknown) {
            console.error('Failed to save team:', error);
            toast.error(t('records.saveFailedEntity').replace('{entity}', t('records.team')));
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm(t('records.confirmDeleteEntity').replace('{entity}', t('records.team')))) return;
        try {
            await deleteTeam(id);
            toast.success(t('records.deletedEntity').replace('{entity}', t('records.team')));
            fetchData();
        } catch (error) {
            console.error('Failed to delete team:', error);
            toast.error(t('records.deleteFailedEntity').replace('{entity}', t('records.team')));
        }
    };

    const filteredTeams = teams.filter(t =>
        t.name?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const getCompanyName = (team: Team) => {
        // First try direct company field from API
        if (team.company?.name) return team.company.name;
        // Fall back to brand.company
        if (team.brand?.company?.name) return team.brand.company.name;
        // Fall back to brand.companyId lookup
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
        return getCountryLabel(code, locale);
    };

    const selectedCompany = companies.find(c => c.id === formData.companyId);
    const companyCountries: Array<CompanyCountry | typeof availableCountries[number]> = (selectedCompany?.countries?.length ?? 0) > 0
        ? selectedCompany!.countries!
        : availableCountries;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Users className="w-6 h-6 text-primary" />
                    <div>
                        <h1 className="text-2xl font-bold capitalize">{t('records.teamPlural')}</h1>
                        <p className="text-muted-foreground">{t('records.manageTeams')}</p>
                    </div>
                </div>
                <button
                    onClick={openCreateForm}
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                >
                    <Plus className="w-4 h-4" />
                    {t('records.addTeam')}
                </button>
            </div>

            <div className="flex items-center gap-4">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder={t('records.searchEntity').replace('{entity}', t('records.teamPlural'))}
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
                ) : filteredTeams.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                        <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>{t('records.noEntityFound').replace('{entity}', t('records.teamPlural'))}</p>
                        <button onClick={openCreateForm} className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors">
                            {t('records.addFirst').replace('{entity}', t('records.team'))}
                        </button>
                    </div>
                ) : (
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-border text-left text-sm text-muted-foreground">
                                <th className="px-4 py-3 font-medium">{t('records.name').toUpperCase()}</th>
                                <th className="px-4 py-3 font-medium">{t('records.company').toUpperCase()}</th>
                                <th className="px-4 py-3 font-medium">{t('records.brand').toUpperCase()}</th>
                                <th className="px-4 py-3 font-medium">{t('records.country').toUpperCase()}</th>
                                <th className="px-4 py-3 font-medium">{t('records.actions').toUpperCase()}</th>
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
                                            <RecordDetails name={team.name || team.id} fields={[
                                                { label: t('records.id'), value: team.id },
                                                { label: t('records.name'), value: team.name },
                                                { label: t('records.company'), value: getCompanyName(team) },
                                                { label: t('records.brand'), value: getBrandName(team.brandId) },
                                                { label: t('records.country'), value: getCountryName(team.country) },
                                                { label: t('records.created'), value: team.createdAt },
                                                { label: t('records.updated'), value: team.updatedAt }
                                            ]} />
                                            <button onClick={() => openEditForm(team)} className="p-1.5 hover:bg-muted rounded transition-colors" title={t('records.edit')}>
                                                <Pencil className="w-4 h-4" />
                                            </button>
                                            <button onClick={() => handleDelete(team.id)} className="p-1.5 hover:bg-destructive/10 text-destructive rounded transition-colors" title={t('records.delete')}>
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
                <ManagementModal title={t('records.team')} onClose={closeForm}>
                    <div className="bg-card border border-border rounded-xl p-6 w-full max-w-md">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold">
                                {editingTeam ? t('records.edit') : t('records.add')} {t('records.team')}
                            </h3>
                            <button type="button" aria-label={t('records.close')} onClick={closeForm} className="p-1 hover:bg-muted rounded">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label htmlFor="management-teams-field-1" className="block text-sm text-muted-foreground mb-1">{t('records.company')}</label>
                                <select id="management-teams-field-1"
                                    value={formData.companyId}
                                    onChange={(e) => setFormData({ ...formData, companyId: e.target.value, brandId: '', country: '' })}
                                    className="w-full px-4 py-2 rounded-lg bg-muted border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                                >
                                    <option value="">{t('records.selectCompany')}</option>
                                    {companies.map(c => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label htmlFor="management-teams-field-2" className="block text-sm text-muted-foreground mb-1">{t('records.brand')}</label>
                                <select id="management-teams-field-2"
                                    value={formData.brandId}
                                    onChange={(e) => setFormData({ ...formData, brandId: e.target.value, country: '' })}
                                    required
                                    disabled={!formData.companyId}
                                    className="w-full px-4 py-2 rounded-lg bg-muted border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50"
                                >
                                    <option value="">{t('records.selectBrand')}</option>
                                    {brands.filter(b => b.companyId === formData.companyId).map(b => (
                                        <option key={b.id} value={b.id}>{b.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label htmlFor="management-teams-field-3" className="block text-sm text-muted-foreground mb-1">{t('records.country')}</label>
                                <select id="management-teams-field-3"
                                    value={formData.country}
                                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                                    required
                                    className="w-full px-4 py-2 rounded-lg bg-muted border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                                >
                                    <option value="">{t('records.selectCountry')}</option>
                                    {companyCountries.map((country) => {
                                        const code = 'countryCode' in country ? country.countryCode : country.code;
                                        return <option key={code} value={code}>{getCountryLabel(code, locale)}</option>;
                                    })}
                                </select>
                            </div>
                            <div>
                                <label htmlFor="management-teams-field-4" className="block text-sm text-muted-foreground mb-1">{t('records.teamName')}</label>
                                <input id="management-teams-field-4"
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    required
                                    className="w-full px-4 py-2 rounded-lg bg-muted border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                                />
                            </div>
                            {editingTeam && (
                                <fieldset className="space-y-3 rounded-lg border border-border p-4">
                                    <legend className="px-1 text-sm font-medium">{t('keledons.uiInterfaces')}</legend>
                                    <p className="text-sm text-muted-foreground">{t('keledons.tenantInterfacesOnly')}</p>
                                    {loadingInterfaces ? (
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground" role="status">
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            {t('keledons.interfacesLoading')}
                                        </div>
                                    ) : tenantInterfaces.length === 0 ? (
                                        <p className="text-sm text-muted-foreground">{t('keledons.interfacesEmpty')}</p>
                                    ) : (
                                        <div className="space-y-2">
                                            {tenantInterfaces.map((item) => (
                                                <label key={item.id} className="flex min-h-11 items-center gap-3 text-sm">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedInterfaceIds.includes(item.id)}
                                                        onChange={(event) => setSelectedInterfaceIds((current) =>
                                                            event.target.checked
                                                                ? [...current, item.id]
                                                                : current.filter((id) => id !== item.id),
                                                        )}
                                                        className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                                                    />
                                                    <span>{item.name}</span>
                                                    <span className="text-xs text-muted-foreground">{item.category || item.status}</span>
                                                </label>
                                            ))}
                                        </div>
                                    )}
                                    <div className="flex justify-end">
                                        <button
                                            type="button"
                                            onClick={saveTeamInterfaces}
                                            disabled={loadingInterfaces || savingInterfaces || tenantInterfaces.length === 0 || selectedInterfaceIds.slice().sort().join('|') === assignedInterfaceIds.slice().sort().join('|')}
                                            className="min-h-11 rounded-lg bg-secondary px-4 py-2 text-secondary-foreground hover:bg-secondary/80 disabled:opacity-50"
                                        >
                                            {savingInterfaces ? t('records.saving') : t('records.save')}
                                        </button>
                                    </div>
                                </fieldset>
                            )}
                            <div className="flex justify-end gap-3 mt-6">
                                <button
                                    type="button"
                                    onClick={closeForm}
                                    className="px-4 py-2 rounded-lg bg-muted text-foreground hover:bg-muted/80 transition-colors"
                                >
                                    {t('records.cancel')}
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors font-medium disabled:opacity-50 flex items-center gap-2"
                                >
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
