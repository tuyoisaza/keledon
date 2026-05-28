import { useEffect, useMemo, useState } from 'react';
import { Plus, Pencil, Trash2, Radio } from 'lucide-react';
import { cn } from '@/lib/utils';
import { API_URL } from '@/lib/config';

const CLOUD_URL = API_URL;

type InterfaceStatus = 'connected' | 'disconnected' | 'error';
type InterfaceCategory = 'talk' | 'case';

interface ManagedInterface {
    id: string;
    name: string;
    baseUrl: string;
    category?: InterfaceCategory;
    providerKey?: string;
    capabilities?: Record<string, boolean>;
    status: InterfaceStatus;
    icon?: string;
}

const statusColors: Record<InterfaceStatus, string> = {
    connected: 'text-success',
    disconnected: 'text-muted-foreground',
    error: 'text-destructive',
};

const categoryColors: Record<InterfaceCategory, string> = {
    talk: 'bg-sky-500/20 text-sky-300',
    case: 'bg-emerald-500/20 text-emerald-300',
};

const talkProviders = [
    { value: 'genesys', label: 'Genesys' },
    { value: 'avaya', label: 'Avaya' },
    { value: 'meet', label: 'Google Meet' },
    { value: 'custom-voip', label: 'Custom VoIP' },
];

const caseProviders = [
    { value: 'salesforce', label: 'Salesforce' },
    { value: 'kustomer', label: 'Kustomer' },
    { value: 'hubspot', label: 'HubSpot' },
    { value: 'custom-crm', label: 'Custom CRM' },
];

export function InterfacesManager() {
    const [interfaces, setInterfaces] = useState<ManagedInterface[]>([]);
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        name: '',
        baseUrl: '',
        category: 'case' as InterfaceCategory,
        providerKey: 'salesforce',
        capabilities: {
            stt: false,
            tts: false,
            rpa: true
        }
    });

    const providerOptions = useMemo(() => {
        return formData.category === 'talk' ? talkProviders : caseProviders;
    }, [formData.category]);

    const loadInterfaces = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const res = await fetch(`${CLOUD_URL}/api/interfaces`);
            if (!res.ok) throw new Error('Failed to load interfaces');
            const data = await res.json();
            setInterfaces(data || []);
        } catch (err: any) {
            console.error('Failed to load interfaces:', err);
            setError(err.message || 'Failed to load interfaces');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadInterfaces();
    }, []);

    const handleSave = async () => {
        try {
            const payload = {
                name: formData.name,
                baseUrl: formData.baseUrl,
                category: formData.category,
                providerKey: formData.providerKey,
                capabilities: formData.capabilities,
            };

            if (editingId) {
                const res = await fetch(`${CLOUD_URL}/api/interfaces/${editingId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                });
                if (!res.ok) throw new Error('Failed to update interface');
            } else {
                const res = await fetch(`${CLOUD_URL}/api/interfaces`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                });
                if (!res.ok) throw new Error('Failed to create interface');
            }

            await loadInterfaces();
            setShowForm(false);
            setEditingId(null);
            setFormData({
                name: '',
                baseUrl: '',
                category: 'case',
                providerKey: 'salesforce',
                capabilities: { stt: false, tts: false, rpa: true }
            });
        } catch (err: any) {
            console.error('Failed to save interface:', err);
            setError(err.message || 'Failed to save interface');
        }
    };

    const handleEdit = (iface: ManagedInterface) => {
        setFormData({
            name: iface.name,
            baseUrl: iface.baseUrl,
            category: iface.category || 'case',
            providerKey: iface.providerKey || (iface.category === 'talk' ? 'genesys' : 'salesforce'),
            capabilities: {
                stt: !!iface.capabilities?.stt,
                tts: !!iface.capabilities?.tts,
                rpa: !!iface.capabilities?.rpa,
            }
        });
        setEditingId(iface.id);
        setShowForm(true);
    };

    const handleDelete = async (id: string) => {
        try {
            const res = await fetch(`${CLOUD_URL}/api/interfaces/${id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Failed to delete interface');
            await loadInterfaces();
        } catch (err: any) {
            console.error('Failed to delete interface:', err);
            setError(err.message || 'Failed to delete interface');
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-semibold text-white">Managed Interfaces</h2>
                    <p className="text-gray-400 text-sm">Map talk and case systems to approved providers.</p>
                </div>
                <button
                    onClick={() => setShowForm(true)}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-teal-500 text-black font-medium hover:bg-teal-400 transition-colors"
                >
                    <Plus className="w-4 h-4" />
                    Add Interface
                </button>
            </div>

            {error && (
                <div className="p-3 rounded-lg border border-red-500/30 bg-red-500/10 text-sm text-red-400">
                    {error}
                </div>
            )}

            {isLoading ? (
                <div className="text-gray-400 text-sm">Loading interfaces...</div>
            ) : (
                <div className="space-y-3">
                    {interfaces.map((iface) => (
                        <div
                            key={iface.id}
                            className="flex items-center justify-between p-4 rounded-xl border border-gray-700 bg-gray-800/50 hover:border-teal-500/30 transition-colors"
                        >
                            <div className="flex items-center gap-4">
                                <span className={cn('px-2.5 py-1 rounded text-xs font-medium uppercase', categoryColors[iface.category || 'case'])}>
                                    {iface.category || 'case'}
                                </span>
                                <div>
                                    <p className="font-medium text-white">{iface.name}</p>
                                    <p className="text-sm text-gray-500 font-mono">{iface.baseUrl}</p>
                                    <p className="text-xs text-gray-400">Provider: {iface.providerKey || 'custom'}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <span className={cn('flex items-center gap-1.5 text-sm', statusColors[iface.status])}>
                                    <Radio className="w-3.5 h-3.5" />
                                    {iface.status}
                                </span>
                                <button onClick={() => handleEdit(iface)} className="p-2 rounded-lg hover:bg-gray-700 text-gray-400 hover:text-white">
                                    <Pencil className="w-4 h-4" />
                                </button>
                                <button onClick={() => handleDelete(iface.id)} className="p-2 rounded-lg hover:bg-red-900/20 text-gray-400 hover:text-red-400">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {showForm && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
                    <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 w-full max-w-md">
                        <h3 className="text-lg font-semibold text-white mb-4">
                            {editingId ? 'Edit Interface' : 'Add New Interface'}
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm text-gray-400 mb-1">Name</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full px-4 py-2 rounded-lg bg-gray-900 border border-gray-600 text-white focus:outline-none focus:ring-2 focus:ring-teal-500/50"
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-gray-400 mb-1">Category</label>
                                <select
                                    value={formData.category}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            category: e.target.value as InterfaceCategory,
                                            providerKey: e.target.value === 'talk' ? 'genesys' : 'salesforce',
                                            capabilities: {
                                                stt: e.target.value === 'talk',
                                                tts: e.target.value === 'talk',
                                                rpa: e.target.value === 'case'
                                            }
                                        })
                                    }
                                    className="w-full px-4 py-2 rounded-lg bg-gray-900 border border-gray-600 text-white focus:outline-none focus:ring-2 focus:ring-teal-500/50"
                                >
                                    <option value="talk">Talk</option>
                                    <option value="case">Case</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm text-gray-400 mb-1">Provider</label>
                                <select
                                    value={formData.providerKey}
                                    onChange={(e) => setFormData({ ...formData, providerKey: e.target.value })}
                                    className="w-full px-4 py-2 rounded-lg bg-gray-900 border border-gray-600 text-white focus:outline-none focus:ring-2 focus:ring-teal-500/50"
                                >
                                    {providerOptions.map((option) => (
                                        <option key={option.value} value={option.value}>{option.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm text-gray-400 mb-1">Base URL</label>
                                <input
                                    type="text"
                                    value={formData.baseUrl}
                                    onChange={(e) => setFormData({ ...formData, baseUrl: e.target.value })}
                                    className="w-full px-4 py-2 rounded-lg bg-gray-900 border border-gray-600 text-white focus:outline-none focus:ring-2 focus:ring-teal-500/50"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="block text-sm text-gray-400">Capabilities</label>
                                <div className="flex flex-wrap gap-3 text-sm text-gray-200">
                                    <label className="flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            checked={formData.capabilities.stt}
                                            onChange={(e) => setFormData({
                                                ...formData,
                                                capabilities: { ...formData.capabilities, stt: e.target.checked }
                                            })}
                                        />
                                        STT
                                    </label>
                                    <label className="flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            checked={formData.capabilities.tts}
                                            onChange={(e) => setFormData({
                                                ...formData,
                                                capabilities: { ...formData.capabilities, tts: e.target.checked }
                                            })}
                                        />
                                        TTS
                                    </label>
                                    <label className="flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            checked={formData.capabilities.rpa}
                                            onChange={(e) => setFormData({
                                                ...formData,
                                                capabilities: { ...formData.capabilities, rpa: e.target.checked }
                                            })}
                                        />
                                        RPA
                                    </label>
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 mt-6">
                            <button
                                onClick={() => { setShowForm(false); setEditingId(null); }}
                                className="px-4 py-2 rounded-lg bg-gray-700 text-white hover:bg-gray-600"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                className="px-4 py-2 rounded-lg bg-teal-500 text-black hover:bg-teal-400"
                            >
                                Save
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
