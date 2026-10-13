import ManagementModal from '@/components/common/ManagementModal';
import RecordDetails from '@/components/common/RecordDetails';
import { useTranslation } from '@/context/I18nContext';
import { useState, useEffect } from 'react';
import { Store, Plus, Loader2, Pencil, Trash2, Search, X, Key, Lock, ScrollText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { getVendors, createVendor, updateVendor, deleteVendor, getTeams, getBrands, type Vendor, type Team, type Brand } from '@/lib/crud-api';
import VendorConnectionChecklist from '@/components/phase4/VendorConnectionChecklist';

const VENDOR_TYPES = [
    { value: 'crm', labelKey: 'records.typeCrm' },
    { value: 'telephony', labelKey: 'records.telephony' },
    { value: 'helpdesk', labelKey: 'records.helpdesk' },
    { value: 'other', labelKey: 'records.other' },
];

export default function ManagementVendorsPage() {
    const { t } = useTranslation();
    const [vendors, setVendors] = useState<Vendor[]>([]);
    const [teams, setTeams] = useState<Team[]>([]);
    const [brands, setBrands] = useState<Brand[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
    const [saving, setSaving] = useState(false);
    const [selectedTeamId, setSelectedTeamId] = useState<string>('');

    const [formData, setFormData] = useState({
        name: '',
        type: 'crm',
        baseUrl: '',
        username: '',
        password: '',
        apiKey: '',
        startGoal: '',
    });

    useEffect(() => {
        fetchData();
    }, []);

    useEffect(() => {
        if (selectedTeamId) {
            fetchVendors(selectedTeamId);
        }
    }, [selectedTeamId]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [teamsData, brandsData] = await Promise.all([
                getTeams(),
                getBrands()
            ]);
            setTeams(teamsData);
            setBrands(brandsData);
            if (teamsData.length > 0) {
                setSelectedTeamId(teamsData[0].id);
            }
        } catch (error) {
            console.error('Failed to fetch data:', error);
            toast.error(t('records.fetchFailedEntity').replace('{entity}', t('records.vendorPlural')));
        } finally {
            setLoading(false);
        }
    };

    const fetchVendors = async (teamId: string) => {
        try {
            const vendorsData = await getVendors(teamId);
            setVendors(vendorsData);
        } catch (error) {
            console.error('Failed to fetch vendors:', error);
            setVendors([]);
        }
    };

    const resetForm = () => {
        setFormData({ name: '', type: 'crm', baseUrl: '', username: '', password: '', apiKey: '', startGoal: '' });
    };

    const openCreateForm = () => {
        resetForm();
        setEditingVendor(null);
        setShowForm(true);
    };

    const openEditForm = (vendor: Vendor) => {
        setFormData({
            name: vendor.name || '',
            type: vendor.type || 'crm',
            baseUrl: vendor.baseUrl || '',
            username: vendor.username || '',
            password: '',
            apiKey: '',
            startGoal: vendor.startGoal || '',
        });
        setEditingVendor(vendor);
        setShowForm(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedTeamId) {
            toast.error(t('records.selectTeamFirst'));
            return;
        }
        setSaving(true);
        try {
            const submitData: any = {
                teamId: selectedTeamId,
                name: formData.name,
                type: formData.type,
                baseUrl: formData.baseUrl || undefined,
            };
            if (formData.username) submitData.username = formData.username;
            if (formData.password) submitData.password = formData.password;
            if (formData.apiKey) submitData.apiKey = formData.apiKey;
            if (formData.startGoal) submitData.startGoal = formData.startGoal;

            if (editingVendor) {
                await updateVendor(editingVendor.id, submitData);
                toast.success(t('records.updatedEntity').replace('{entity}', t('records.vendor')));
            } else {
                await createVendor(submitData);
                toast.success(t('records.createdEntity').replace('{entity}', t('records.vendor')));
            }
            setShowForm(false);
            fetchVendors(selectedTeamId);
        } catch (error: any) {
            console.error('Failed to save vendor:', error);
            toast.error(t('records.saveFailedEntity').replace('{entity}', t('records.vendor')));
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm(t('records.confirmDeleteEntity').replace('{entity}', t('records.vendor')))) return;
        try {
            await deleteVendor(id);
            toast.success(t('records.deletedEntity').replace('{entity}', t('records.vendor')));
            fetchVendors(selectedTeamId);
        } catch (error) {
            console.error('Failed to delete vendor:', error);
            toast.error(t('records.deleteFailedEntity').replace('{entity}', t('records.vendor')));
        }
    };

    const filteredVendors = vendors.filter(v =>
        v.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.type?.toLowerCase().includes(searchQuery.toLowerCase())
    );


    const getBrandName = (brandId?: string) => {
        if (!brandId) return '—';
        return brands.find(b => b.id === brandId)?.name || '—';
    };

    const getTypeLabel = (type: string) => {
        const option = VENDOR_TYPES.find(item => item.value === type);
        return option ? t(option.labelKey) : type;
    };


    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-foreground capitalize">{t('records.vendorPlural')}</h1>
                    <p className="text-muted-foreground">{t('records.manageVendors')}</p>
                </div>
                <div className="flex gap-3">
                    <select
                        value={selectedTeamId}
                        onChange={(e) => setSelectedTeamId(e.target.value)}
                        aria-label={t('records.selectTeam')}
                        className="bg-gray-800 border border-gray-700 text-foreground rounded-lg px-4 py-2"
                    >
                        {teams.map(team => (
                            <option key={team.id} value={team.id}>
                                {getBrandName(team.brandId)} / {team.name}
                            </option>
                        ))}
                    </select>
                    <button
                        onClick={openCreateForm}
                        disabled={!selectedTeamId}
                        className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-foreground px-4 py-2 rounded-lg disabled:opacity-50"
                    >
                        <Plus className="w-4 h-4" />
                        {t('records.addVendor')}
                    </button>
                </div>
            </div>

            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                    type="text"
                    placeholder={t('records.searchEntity').replace('{entity}', t('records.vendorPlural'))}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 text-foreground rounded-lg pl-10 pr-4 py-2"
                />
            </div>

            <VendorConnectionChecklist />

            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
            ) : filteredVendors.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                    <Store className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    {selectedTeamId ? t('records.noVendorsForTeam') : t('records.selectTeamToView')}
                </div>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {filteredVendors.map(vendor => (
                        <div
                            key={vendor.id}
                            className="bg-gray-800 border border-gray-700 rounded-lg p-4"
                        >
                            <div className="flex items-start justify-between mb-2">
                                <div>
                                    <h3 className="font-semibold text-foreground">{vendor.name}</h3>
                                    <span className="text-sm text-muted-foreground">{getTypeLabel(vendor.type)}</span>
                                </div>
                                <div className="flex gap-2">
                                    <RecordDetails name={vendor.name || vendor.id} fields={[
                                        { label: t('records.id'), value: vendor.id },
                                        { label: t('records.name'), value: vendor.name },
                                        { label: t('records.type'), value: getTypeLabel(vendor.type) },
                                        { label: t('records.team'), value: teams.find(team => team.id === vendor.teamId)?.name },
                                        { label: t('records.status'), value: vendor.isActive ? t('records.active') : t('records.inactive') },
                                        { label: t('records.created'), value: vendor.createdAt },
                                        { label: t('records.updated'), value: vendor.updatedAt }
                                    ]} />
                                    <button
                                        onClick={() => openEditForm(vendor)}
                                        aria-label={t('records.edit')}
                                        title={t('records.edit')}
                                        className="p-1 hover:bg-gray-700 rounded"
                                    >
                                        <Pencil className="w-4 h-4 text-muted-foreground" />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(vendor.id)}
                                        aria-label={t('records.delete')}
                                        title={t('records.delete')}
                                        className="p-1 hover:bg-gray-700 rounded"
                                    >
                                        <Trash2 className="w-4 h-4 text-red-400" />
                                    </button>
                                </div>
                            </div>
                            {vendor.baseUrl && (
                                <p className="text-sm text-muted-foreground truncate mb-2">{vendor.baseUrl}</p>
                            )}
                            {vendor.startGoal && (
                                <div className="flex items-start gap-2 mb-3">
                                    <ScrollText className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
                                    <p className="text-sm text-muted-foreground line-clamp-2">{vendor.startGoal}</p>
                                </div>
                            )}
                            <div className="flex gap-4 text-sm">
                                <span className={cn(
                                    "flex items-center gap-1",
                                    vendor.isActive ? "text-green-400" : "text-muted-foreground"
                                )}>
                                    {vendor.isActive ? t('records.active') : t('records.inactive')}
                                </span>
                                {vendor.username && (
                                    <span className="flex items-center gap-1 text-muted-foreground">
                                        <Key className="w-3 h-3" />
                                        {vendor.username}
                                    </span>
                                )}
                                {vendor.hasPassword && (
                                    <span className="flex items-center gap-1 text-muted-foreground">
                                        <Lock className="w-3 h-3" />
                                        {t('records.password')}
                                    </span>
                                )}
                                {vendor.hasApiKey && (
                                    <span className="flex items-center gap-1 text-muted-foreground">
                                        <Lock className="w-3 h-3" />
                                        {t('records.apiKey')}
                                    </span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {showForm && (
                <ManagementModal title={t('records.vendor')} onClose={() => setShowForm(false)}>
                    <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 w-full max-w-md">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold text-foreground">
                                {editingVendor ? t('records.edit') : t('records.addVendor')}
                            </h2>
                            <button type="button" aria-label={t('records.close')} onClick={() => setShowForm(false)}>
                                <X className="w-5 h-5 text-muted-foreground" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label htmlFor="management-vendors-field-1" className="block text-sm font-medium text-muted-foreground mb-1">
                                    {t('records.vendorName')}
                                </label>
                                <input id="management-vendors-field-1"
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder={t('records.vendorNameExample')}
                                    className="w-full bg-gray-900 border border-gray-700 text-foreground rounded-lg px-4 py-2"
                                    required
                                />
                            </div>

                            <div>
                                <label htmlFor="management-vendors-field-2" className="block text-sm font-medium text-muted-foreground mb-1">
                                    {t('records.type')}
                                </label>
                                <select id="management-vendors-field-2"
                                    value={formData.type}
                                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                    className="w-full bg-gray-900 border border-gray-700 text-foreground rounded-lg px-4 py-2"
                                >
                                    {VENDOR_TYPES.map(type => (
                                        <option key={type.value} value={type.value}>
                                            {t(type.labelKey)}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label htmlFor="management-vendors-field-3" className="block text-sm font-medium text-muted-foreground mb-1">
                                    {t('records.baseUrl')}
                                </label>
                                <input id="management-vendors-field-3"
                                    type="url"
                                    value={formData.baseUrl}
                                    onChange={(e) => setFormData({ ...formData, baseUrl: e.target.value })}
                                    placeholder="https://login.example.com"
                                    className="w-full bg-gray-900 border border-gray-700 text-foreground rounded-lg px-4 py-2"
                                />
                            </div>

                            <div>
                                <label htmlFor="management-vendors-field-4" className="block text-sm font-medium text-muted-foreground mb-1">
                                    {t('records.username')}
                                </label>
                                <input id="management-vendors-field-4"
                                    type="text"
                                    value={formData.username}
                                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                    placeholder={`${t('records.username')} (${t('records.optional')})`}
                                    className="w-full bg-gray-900 border border-gray-700 text-foreground rounded-lg px-4 py-2"
                                />
                            </div>

                            <div>
                                <label htmlFor="management-vendors-field-5" className="block text-sm font-medium text-muted-foreground mb-1">
                                    {t('records.password')}
                                </label>
                                <input id="management-vendors-field-5"
                                    type="password"
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    placeholder={editingVendor ? t('records.keepCurrent') : t('records.passwordOptional')}
                                    className="w-full bg-gray-900 border border-gray-700 text-foreground rounded-lg px-4 py-2"
                                />
                            </div>

                            <div>
                                <label htmlFor="management-vendors-field-6" className="block text-sm font-medium text-muted-foreground mb-1">
                                    {t('records.apiKey')}
                                </label>
                                <input id="management-vendors-field-6"
                                    type="password"
                                    value={formData.apiKey}
                                    onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                                    placeholder={editingVendor ? t('records.keepCurrent') : t('records.apiKeyOptional')}
                                    className="w-full bg-gray-900 border border-gray-700 text-foreground rounded-lg px-4 py-2"
                                />
                            </div>

                            <div>
                                <label htmlFor="management-vendors-field-7" className="block text-sm font-medium text-muted-foreground mb-1">
                                    {t('records.startGoalInstructions')}
                                </label>
                                <textarea id="management-vendors-field-7"
                                    value={formData.startGoal}
                                    onChange={(e) => setFormData({ ...formData, startGoal: e.target.value })}
                                    placeholder={t('records.startGoalExample')}
                                    rows={3}
                                    className="w-full bg-gray-900 border border-gray-700 text-foreground rounded-lg px-4 py-2 resize-none"
                                />
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowForm(false)}
                                    className="flex-1 bg-gray-700 hover:bg-gray-600 text-foreground px-4 py-2 rounded-lg"
                                >
                                    {t('records.cancel')}
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="flex-1 bg-primary hover:bg-primary/90 text-foreground px-4 py-2 rounded-lg disabled:opacity-50"
                                >
                                    {saving ? (
                                        <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                                    ) : (
                                        editingVendor ? t('records.update') : t('records.create')
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </ManagementModal>
            )}
        </div>
    );
}
