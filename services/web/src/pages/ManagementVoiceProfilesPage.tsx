import { useState, useEffect } from 'react';
import { Mic, Plus, RefreshCw, Loader2, Pencil, Trash2, Settings, Volume2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';

export default function ManagementVoiceProfilesPage() {
    const { user } = useAuth();
    const [voiceProfiles, setVoiceProfiles] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        provider_id: 'elevenlabs',
        language: 'en',
        is_enabled: true,
        is_default: false,
        config: {}
    });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchVoiceProfiles();
    }, []);

    const fetchVoiceProfiles = async () => {
        try {
            setLoading(true);
            if (user?.companyId) {
                const response = await fetch(`/api/tenant/voice-profiles?companyId=${user.companyId}`);
                if (response.ok) {
                    const data = await response.json();
                    setVoiceProfiles(data || []);
                }
            }
        } catch (error) {
            console.error('Failed to fetch voice profiles:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async () => {
        if (!formData.name.trim()) {
            toast.error('Name is required');
            return;
        }
        setSaving(true);
        try {
            const response = await fetch('/api/tenant/voice-profiles', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...formData,
                    companyId: user?.companyId
                })
            });
            if (response.ok) {
                toast.success('Voice profile created');
                setShowForm(false);
                setFormData({ name: '', provider_id: 'elevenlabs', language: 'en', is_enabled: true, is_default: false, config: {} });
                fetchVoiceProfiles();
            } else {
                toast.error('Failed to create voice profile');
            }
        } catch (error) {
            toast.error('Failed to create voice profile');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this voice profile?')) return;
        try {
            await fetch(`/api/tenant/voice-profiles/${id}`, { method: 'DELETE' });
            toast.success('Voice profile deleted');
            fetchVoiceProfiles();
        } catch (error) {
            toast.error('Failed to delete');
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Mic className="w-6 h-6 text-primary" />
                    <div>
                        <h1 className="text-2xl font-bold">Voice Profiles</h1>
                        <p className="text-muted-foreground">Configure voice settings for text-to-speech</p>
                    </div>
                </div>
                <button
                    onClick={() => setShowForm(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                >
                    <Plus className="w-4 h-4" />
                    Add Profile
                </button>
            </div>

            {showForm && (
                <div className="rounded-xl border border-border bg-card p-6">
                    <h3 className="font-semibold mb-4">New Voice Profile</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">Name</label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="w-full px-3 py-2 border border-border rounded-lg bg-muted/50"
                                placeholder="My Voice Profile"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Provider</label>
                            <select
                                value={formData.provider_id}
                                onChange={(e) => setFormData({ ...formData, provider_id: e.target.value })}
                                className="w-full px-3 py-2 border border-border rounded-lg bg-muted/50"
                            >
                                <option value="elevenlabs">ElevenLabs</option>
                                <option value="openai">OpenAI</option>
                                <option value="coqui">Coqui</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Language</label>
                            <select
                                value={formData.language}
                                onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                                className="w-full px-3 py-2 border border-border rounded-lg bg-muted/50"
                            >
                                <option value="en">English</option>
                                <option value="es">Spanish</option>
                                <option value="fr">French</option>
                                <option value="de">German</option>
                                <option value="pt">Portuguese</option>
                            </select>
                        </div>
                        <div className="flex items-center gap-4">
                            <label className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    checked={formData.is_default}
                                    onChange={(e) => setFormData({ ...formData, is_default: e.target.checked })}
                                />
                                Default
                            </label>
                        </div>
                    </div>
                    <div className="flex justify-end gap-3 mt-4">
                        <button onClick={() => setShowForm(false)} className="px-4 py-2 border border-border rounded-lg hover:bg-muted">Cancel</button>
                        <button onClick={handleCreate} disabled={saving} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 flex items-center gap-2">
                            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                            Create
                        </button>
                    </div>
                </div>
            )}

            <div className="rounded-xl border border-border bg-card overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    </div>
                ) : voiceProfiles.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                        <Volume2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>No voice profiles configured</p>
                        <button onClick={() => setShowForm(true)} className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors">
                            Add First Profile
                        </button>
                    </div>
                ) : (
                    <div className="divide-y divide-border">
                        {voiceProfiles.map((profile) => (
                            <div key={profile.id} className="p-4 flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="p-2 bg-primary/10 rounded-lg">
                                        <Volume2 className="w-5 h-5 text-primary" />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium">{profile.name}</span>
                                            {profile.is_default && (
                                                <span className="px-2 py-0.5 bg-primary/20 text-primary text-xs rounded">Default</span>
                                            )}
                                        </div>
                                        <div className="text-sm text-muted-foreground">
                                            {profile.provider_id} • {profile.language}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => handleDelete(profile.id)} className="p-2 hover:bg-destructive/10 text-destructive rounded transition-colors">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
