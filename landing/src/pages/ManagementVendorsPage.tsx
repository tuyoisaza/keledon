import { useState, useEffect } from 'react';
import { Store, Plus, RefreshCw, Loader2, Pencil, Trash2, Search, X, Key, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { getVendors, createVendor, updateVendor, deleteVendor, getTeams, getBrands, type Vendor, type Team, type Brand } from '@/lib/crud-api';

const VENDOR_TYPES = [
    { value: 'crm', label: 'CRM' },
    { value: 'telephony', label: 'Telephony' },
    { value: 'helpdesk', label: 'Help Desk' },
    { value: 'other', label: 'Other' },
];

export default function ManagementVendorsPage() {
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
            toast.error('Failed to fetch data');
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
        setFormData({ name: '', type: 'crm', baseUrl: '', username: '', password: '', apiKey: '' });
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
        });
        setEditingVendor(vendor);
        setShowForm(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedTeamId) {
            toast.error('Please select a team first');
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

            if (editingVendor) {
                await updateVendor(editingVendor.id, submitData);
                toast.success('Vendor updated successfully');
            } else {
                await createVendor(submitData);
                toast.success('Vendor created successfully');
            }
            setShowForm(false);
            fetchVendors(selectedTeamId);
        } catch (error: any) {
            console.error('Failed to save vendor:', error);
            toast.error('Failed to save vendor: ' + (error?.message || error));
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this vendor?')) return;
        try {
            await deleteVendor(id);
            toast.success('Vendor deleted successfully');
            fetchVendors(selectedTeamId);
        } catch (error) {
            console.error('Failed to delete vendor:', error);
            toast.error('Failed to delete vendor');
        }
    };

    const filteredVendors = vendors.filter(v =>
        v.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.type?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const getTeamName = (teamId: string) => {
        return teams.find(t => t.id === teamId)?.name || '—';
    };

    const getBrandName = (brandId?: string) => {
        if (!brandId) return '—';
        return brands.find(b => b.id === brandId)?.name || '—';
    };

    const getTypeLabel = (type: string) => {
        return VENDOR_TYPES.find(t => t.value === type)?.label || type;
    };

    const selectedTeam = teams.find(t => t.id === selectedTeamId);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white">Vendors</h1>
                    <p className="text-gray-400">Manage external vendor integrations</p>
                </div>
                <div className="flex gap-3">
                    <select
                        value={selectedTeamId}
                        onChange={(e) => setSelectedTeamId(e.target.value)}
                        className="bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-2"
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
                        className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg disabled:opacity-50"
                    >
                        <Plus className="w-4 h-4" />
                        Add Vendor
                    </button>
                </div>
            </div>

            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                    type="text"
                    placeholder="Search vendors..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg pl-10 pr-4 py-2"
                />
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
            ) : filteredVendors.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                    <Store className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    {selectedTeamId ? 'No vendors yet for this team' : 'Select a team to view vendors'}
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
                                    <h3 className="font-semibold text-white">{vendor.name}</h3>
                                    <span className="text-sm text-gray-400">{getTypeLabel(vendor.type)}</span>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => openEditForm(vendor)}
                                        className="p-1 hover:bg-gray-700 rounded"
                                    >
                                        <Pencil className="w-4 h-4 text-gray-400" />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(vendor.id)}
                                        className="p-1 hover:bg-gray-700 rounded"
                                    >
                                        <Trash2 className="w-4 h-4 text-red-400" />
                                    </button>
                                </div>
                            </div>
                            {vendor.baseUrl && (
                                <p className="text-sm text-gray-400 truncate mb-2">{vendor.baseUrl}</p>
                            )}
                            <div className="flex gap-4 text-sm">
                                <span className={cn(
                                    "flex items-center gap-1",
                                    vendor.isActive ? "text-green-400" : "text-gray-500"
                                )}>
                                    {vendor.isActive ? 'Active' : 'Inactive'}
                                </span>
                                {vendor.username && (
                                    <span className="flex items-center gap-1 text-gray-400">
                                        <Key className="w-3 h-3" />
                                        {vendor.username}
                                    </span>
                                )}
                                {vendor.hasPassword && (
                                    <span className="flex items-center gap-1 text-gray-400">
                                        <Lock className="w-3 h-3" />
                                        Password
                                    </span>
                                )}
                                {vendor.hasApiKey && (
                                    <span className="flex items-center gap-1 text-gray-400">
                                        <Lock className="w-3 h-3" />
                                        API Key
                                    </span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {showForm && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 w-full max-w-md">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold text-white">
                                {editingVendor ? 'Edit Vendor' : 'Add Vendor'}
                            </h2>
                            <button onClick={() => setShowForm(false)}>
                                <X className="w-5 h-5 text-gray-400" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">
                                    Vendor Name
                                </label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="e.g., Salesforce, Genesys, HubSpot"
                                    className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg px-4 py-2"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">
                                    Type
                                </label>
                                <select
                                    value={formData.type}
                                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                    className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg px-4 py-2"
                                >
                                    {VENDOR_TYPES.map(type => (
                                        <option key={type.value} value={type.value}>
                                            {type.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">
                                    Base URL
                                </label>
                                <input
                                    type="url"
                                    value={formData.baseUrl}
                                    onChange={(e) => setFormData({ ...formData, baseUrl: e.target.value })}
                                    placeholder="https://login.salesforce.com"
                                    className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg px-4 py-2"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">
                                    Username
                                </label>
                                <input
                                    type="text"
                                    value={formData.username}
                                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                    placeholder="Username (optional)"
                                    className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg px-4 py-2"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">
                                    Password
                                </label>
                                <input
                                    type="password"
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    placeholder={editingVendor ? 'Leave blank to keep current' : 'Password (optional)'}
                                    className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg px-4 py-2"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">
                                    API Key
                                </label>
                                <input
                                    type="password"
                                    value={formData.apiKey}
                                    onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                                    placeholder={editingVendor ? 'Leave blank to keep current' : 'API Key (optional)'}
                                    className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg px-4 py-2"
                                />
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowForm(false)}
                                    className="flex-1 bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="flex-1 bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg disabled:opacity-50"
                                >
                                    {saving ? (
                                        <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                                    ) : (
                                        editingVendor ? 'Update' : 'Create'
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}