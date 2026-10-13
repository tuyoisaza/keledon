import ManagementModal from '@/components/common/ManagementModal';
import RecordDetails from '@/components/common/RecordDetails';
import { useTranslation } from '@/context/I18nContext';
import { useState, useEffect } from 'react';
import { Tag, Plus, RefreshCw, Loader2, Pencil, Trash2, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { getBrands, getCompanies, createBrand, updateBrand, deleteBrand, type Brand, type Company } from '@/lib/crud-api';

export default function ManagementBrandsPage() {
    const { t } = useTranslation();
    const [brands, setBrands] = useState<Brand[]>([]);
    const [companies, setCompanies] = useState<Company[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [editingBrand, setEditingBrand] = useState<Brand | null>(null);
    const [saving, setSaving] = useState(false);

    const [formData, setFormData] = useState({
        name: '',
        companyId: '',
        color: '#6366f1'
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [brandsData, companiesData] = await Promise.all([
                getBrands(),
                getCompanies()
            ]);
            setBrands(brandsData);
            setCompanies(companiesData);
        } catch (error) {
            console.error('Failed to fetch brands:', error);
            toast.error(t('records.fetchFailedEntity').replace('{entity}', t('records.brandPlural')));
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setFormData({ name: '', companyId: '', color: '#6366f1' });
    };

    const openCreateForm = () => {
        resetForm();
        setEditingBrand(null);
        setShowForm(true);
    };

    const openEditForm = (brand: Brand) => {
        setFormData({
            name: brand.name || '',
            companyId: brand.companyId || '',
            color: brand.color || '#6366f1'
        });
        setEditingBrand(brand);
        setShowForm(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            if (editingBrand) {
                await updateBrand(editingBrand.id, formData);
                toast.success(t('records.updatedEntity').replace('{entity}', t('records.brand')));
            } else {
                await createBrand(formData);
                toast.success(t('records.createdEntity').replace('{entity}', t('records.brand')));
            }
            setShowForm(false);
            fetchData();
        } catch (error) {
            console.error('Failed to save brand:', error);
            toast.error(t('records.saveFailedEntity').replace('{entity}', t('records.brand')));
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm(t('records.confirmDeleteEntity').replace('{entity}', t('records.brand')))) return;
        try {
            await deleteBrand(id);
            toast.success(t('records.deletedEntity').replace('{entity}', t('records.brand')));
            fetchData();
        } catch (error) {
            console.error('Failed to delete brand:', error);
            toast.error(t('records.deleteFailedEntity').replace('{entity}', t('records.brand')));
        }
    };

    const filteredBrands = brands.filter(b =>
        b.name?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const getCompanyName = (companyId: string) => {
        const company = companies.find(c => c.id === companyId);
        return company?.name || companyId;
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Tag className="w-6 h-6 text-primary" />
                    <div>
                        <h1 className="text-2xl font-bold capitalize">{t('records.brandPlural')}</h1>
                        <p className="text-muted-foreground">{t('records.manageBrands')}</p>
                    </div>
                </div>
                <button
                    onClick={openCreateForm}
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                >
                    <Plus className="w-4 h-4" />
                    {t('records.addBrand')}
                </button>
            </div>

            <div className="flex items-center gap-4">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder={t('records.searchEntity').replace('{entity}', t('records.brandPlural'))}
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
                ) : filteredBrands.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                        <Tag className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>{t('records.noEntityFound').replace('{entity}', t('records.brandPlural'))}</p>
                        <button onClick={openCreateForm} className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors">
                            {t('records.addFirst').replace('{entity}', t('records.brand'))}
                        </button>
                    </div>
                ) : (
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-border text-left text-sm text-muted-foreground">
                                <th className="px-4 py-3 font-medium">{t('records.name').toUpperCase()}</th>
                                <th className="px-4 py-3 font-medium">{t('records.company').toUpperCase()}</th>
                                <th className="px-4 py-3 font-medium">{t('records.color').toUpperCase()}</th>
                                <th className="px-4 py-3 font-medium">{t('records.actions').toUpperCase()}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredBrands.map((brand) => (
                                <tr key={brand.id} className="border-b border-border hover:bg-muted/50">
                                    <td className="px-4 py-3 font-medium">{brand.name}</td>
                                    <td className="px-4 py-3 text-muted-foreground">{getCompanyName(brand.companyId)}</td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 rounded" style={{ backgroundColor: brand.color || '#6366f1' }} />
                                            <span className="text-sm">{brand.color || '#6366f1'}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex gap-2">
                                            <RecordDetails name={brand.name || brand.id} fields={[
                                                { label: t('records.id'), value: brand.id },
                                                { label: t('records.name'), value: brand.name },
                                                { label: t('records.company'), value: getCompanyName(brand.companyId) },
                                                { label: t('records.color'), value: brand.color },
                                                { label: t('records.created'), value: brand.createdAt },
                                                { label: t('records.updated'), value: brand.updatedAt }
                                            ]} />
                                            <button onClick={() => openEditForm(brand)} className="p-1.5 hover:bg-muted rounded transition-colors" title={t('records.edit')}>
                                                <Pencil className="w-4 h-4" />
                                            </button>
                                            <button onClick={() => handleDelete(brand.id)} className="p-1.5 hover:bg-destructive/10 text-destructive rounded transition-colors" title={t('records.delete')}>
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
                <ManagementModal title={t('records.brand')} onClose={() => setShowForm(false)}>
                    <div className="bg-card border border-border rounded-xl p-6 w-full max-w-md">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold">
                                {editingBrand ? t('records.edit') : t('records.add')} {t('records.brand')}
                            </h3>
                            <button type="button" aria-label={t('records.close')} onClick={() => setShowForm(false)} className="p-1 hover:bg-muted rounded">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label htmlFor="management-brands-field-1" className="block text-sm text-muted-foreground mb-1">{t('records.brandName')}</label>
                                <input id="management-brands-field-1"
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    required
                                    className="w-full px-4 py-2 rounded-lg bg-muted border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                                />
                            </div>
                            <div>
                                <label htmlFor="management-brands-field-2" className="block text-sm text-muted-foreground mb-1">{t('records.company')}</label>
                                <select id="management-brands-field-2"
                                    value={formData.companyId}
                                    onChange={(e) => setFormData({ ...formData, companyId: e.target.value })}
                                    required
                                    className="w-full px-4 py-2 rounded-lg bg-muted border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                                >
                                    <option value="">{t('records.selectCompany')}</option>
                                    {companies.map(c => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label htmlFor="management-brands-field-3" className="block text-sm text-muted-foreground mb-1">{t('records.color')}</label>
                                <input id="management-brands-field-3"
                                    type="color"
                                    value={formData.color}
                                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                                    className="w-full h-10 p-1 rounded bg-muted border border-border cursor-pointer"
                                />
                            </div>
                            <div className="flex justify-end gap-3 mt-6">
                                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg bg-muted text-foreground hover:bg-muted/80 transition-colors">
                                    {t('records.cancel')}
                                </button>
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
