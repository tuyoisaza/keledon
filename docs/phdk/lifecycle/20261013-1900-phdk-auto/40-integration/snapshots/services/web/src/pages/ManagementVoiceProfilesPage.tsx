import { useCallback, useEffect, useId, useState } from 'react';
import { Mic, Plus, Loader2, Trash2, Volume2 } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from '@/context/I18nContext';
import ManagementModal from '@/components/common/ManagementModal';
import { apiFetch } from '@/lib/api-fetch';

type VoiceProfile = {
    id: string;
    name: string;
    providerId: string;
    language?: string;
    isDefault?: boolean;
    isEnabled?: boolean;
};

function isVoiceProfile(value: unknown): value is VoiceProfile {
    if (!value || typeof value !== 'object') return false;
    const profile = value as Record<string, unknown>;
    return typeof profile.id === 'string' && typeof profile.name === 'string' && typeof profile.providerId === 'string';
}

export default function ManagementVoiceProfilesPage() {
    const { t } = useTranslation();
    const idPrefix = useId();
    const [voiceProfiles, setVoiceProfiles] = useState<VoiceProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [deleteProfile, setDeleteProfile] = useState<VoiceProfile | null>(null);
    const [createError, setCreateError] = useState(false);
    const [deleteError, setDeleteError] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        providerId: 'elevenlabs',
        language: 'en',
        isEnabled: true,
        isDefault: false,
        config: {},
    });
    const [saving, setSaving] = useState(false);

    const fetchVoiceProfiles = useCallback(async () => {
        setLoading(true);
        setLoadError(false);
        try {
            // The API derives tenant scope from the current DB actor.
            const response = await apiFetch('/api/tenant/voice-profiles');
            if (!response.ok) throw new Error('voice profile list request failed');
            const data: unknown = await response.json();
            if (!Array.isArray(data) || !data.every(isVoiceProfile)) throw new Error('voice profile response was invalid');
            setVoiceProfiles(data);
        } catch {
            setLoadError(true);
            toast.error(t('voiceProfiles.loadFailed'));
        } finally {
            setLoading(false);
        }
    }, [t]);

    useEffect(() => {
        void fetchVoiceProfiles();
    }, [fetchVoiceProfiles]);

    const handleCreate = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const name = formData.name.trim();
        if (!name) {
            toast.error(t('voiceProfiles.nameRequired'));
            return;
        }
        setSaving(true);
        setCreateError(false);
        try {
            const response = await apiFetch('/api/tenant/voice-profiles', {
                method: 'POST',
                body: JSON.stringify({ ...formData, name }),
            });
            if (!response.ok) throw new Error('voice profile create request failed');
            toast.success(t('voiceProfiles.created'));
            setShowForm(false);
            setFormData({ name: '', providerId: 'elevenlabs', language: 'en', isEnabled: true, isDefault: false, config: {} });
            await fetchVoiceProfiles();
        } catch {
            setCreateError(true);
            toast.error(t('voiceProfiles.createFailed'));
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!deleteProfile) return;
        setDeleteError(false);
        try {
            const response = await apiFetch(`/api/tenant/voice-profiles/${encodeURIComponent(deleteProfile.id)}`, { method: 'DELETE' });
            if (!response.ok) throw new Error('voice profile delete request failed');
            toast.success(t('voiceProfiles.deleted'));
            setDeleteProfile(null);
            await fetchVoiceProfiles();
        } catch {
            setDeleteError(true);
            toast.error(t('voiceProfiles.deleteFailed'));
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <Mic aria-hidden="true" className="w-6 h-6 text-primary" />
                    <div>
                        <h1 className="text-2xl font-bold">{t('voiceProfiles.title')}</h1>
                        <p className="text-muted-foreground">{t('voiceProfiles.description')}</p>
                    </div>
                </div>
                <button
                    type="button"
                    onClick={() => { setCreateError(false); setDeleteError(false); setDeleteProfile(null); setShowForm(true); }}
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                >
                    <Plus aria-hidden="true" className="w-4 h-4" />
                    {t('voiceProfiles.addProfile')}
                </button>
            </div>

            {loading ? (
                <div role="status" aria-live="polite" className="flex items-center justify-center gap-3 py-12 text-muted-foreground">
                    <Loader2 aria-hidden="true" className="w-6 h-6 animate-spin text-primary" />
                    <span>{t('voiceProfiles.loading')}</span>
                </div>
            ) : loadError ? (
                <div role="alert" className="rounded-xl border border-destructive/40 bg-card p-6 text-center">
                    <p className="text-foreground">{t('voiceProfiles.loadFailed')}</p>
                    <button type="button" onClick={() => void fetchVoiceProfiles()} className="mt-4 rounded-lg border border-border px-4 py-2 hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
                        {t('voiceProfiles.retry')}
                    </button>
                </div>
            ) : voiceProfiles.length === 0 ? (
                <div className="rounded-xl border border-border bg-card py-12 text-center text-muted-foreground">
                    <Volume2 aria-hidden="true" className="mx-auto mb-4 h-12 w-12 opacity-50" />
                    <p>{t('voiceProfiles.noProfiles')}</p>
                    <button type="button" onClick={() => setShowForm(true)} className="mt-4 rounded-lg bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
                        {t('voiceProfiles.addFirst')}
                    </button>
                </div>
            ) : (
                <ul aria-label={t('voiceProfiles.title')} className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
                    {voiceProfiles.map((profile) => (
                        <li key={profile.id} className="flex items-center justify-between gap-4 p-4">
                            <div className="flex min-w-0 items-center gap-4">
                                <div className="rounded-lg bg-primary/10 p-2">
                                    <Volume2 aria-hidden="true" className="h-5 w-5 text-primary" />
                                </div>
                                <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className="font-medium">{profile.name}</span>
                                        {profile.isDefault && <span className="rounded bg-primary/20 px-2 py-0.5 text-xs text-primary">{t('voiceProfiles.default')}</span>}
                                    </div>
                                    <div className="text-sm text-muted-foreground">
                                        {profile.providerId || '—'} · {profile.language || '—'}
                                    </div>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => { setDeleteError(false); setShowForm(false); setDeleteProfile(profile); }}
                                aria-label={`${t('voiceProfiles.deleteNamed')}: ${profile.name}`}
                                className="shrink-0 rounded p-2 text-destructive hover:bg-destructive/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                            >
                                <Trash2 aria-hidden="true" className="h-4 w-4" />
                            </button>
                        </li>
                    ))}
                </ul>
            )}

            {showForm && (
                <ManagementModal title={t('voiceProfiles.createTitle')} onClose={() => setShowForm(false)}>
                    <form onSubmit={handleCreate} className="rounded-xl border border-border bg-card p-6">
                        <h2 className="mb-4 text-lg font-semibold">{t('voiceProfiles.createTitle')}</h2>
                        {createError && <p role="alert" className="mb-4 text-sm text-destructive">{t('voiceProfiles.createFailed')}</p>}
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <div>
                                <label htmlFor={`${idPrefix}-name`} className="mb-1 block text-sm font-medium">{t('voiceProfiles.name')}</label>
                                <input
                                    id={`${idPrefix}-name`}
                                    type="text"
                                    value={formData.name}
                                    onChange={(event) => setFormData({ ...formData, name: event.target.value })}
                                    className="w-full rounded-lg border border-border bg-muted/50 px-3 py-2"
                                    placeholder={t('voiceProfiles.namePlaceholder')}
                                    required
                                />
                            </div>
                            <div>
                                <label htmlFor={`${idPrefix}-provider`} className="mb-1 block text-sm font-medium">{t('voiceProfiles.provider')}</label>
                                <select id={`${idPrefix}-provider`} value={formData.providerId} onChange={(event) => setFormData({ ...formData, providerId: event.target.value })} className="w-full rounded-lg border border-border bg-muted/50 px-3 py-2">
                                    <option value="elevenlabs">ElevenLabs</option>
                                    <option value="openai">OpenAI</option>
                                    <option value="coqui">Coqui</option>
                                </select>
                            </div>
                            <div>
                                <label htmlFor={`${idPrefix}-language`} className="mb-1 block text-sm font-medium">{t('voiceProfiles.language')}</label>
                                <select id={`${idPrefix}-language`} value={formData.language} onChange={(event) => setFormData({ ...formData, language: event.target.value })} className="w-full rounded-lg border border-border bg-muted/50 px-3 py-2">
                                    <option value="en">{t('voiceProfiles.languageEnglish')}</option>
                                    <option value="es">{t('voiceProfiles.languageSpanish')}</option>
                                    <option value="fr">{t('voiceProfiles.languageFrench')}</option>
                                    <option value="de">{t('voiceProfiles.languageGerman')}</option>
                                    <option value="pt">{t('voiceProfiles.languagePortuguese')}</option>
                                </select>
                            </div>
                            <div className="flex items-center gap-4">
                                <label htmlFor={`${idPrefix}-default`} className="flex items-center gap-2">
                                    <input id={`${idPrefix}-default`} type="checkbox" checked={formData.isDefault} onChange={(event) => setFormData({ ...formData, isDefault: event.target.checked })} />
                                    {t('voiceProfiles.default')}
                                </label>
                            </div>
                        </div>
                        <div className="mt-6 flex justify-end gap-3">
                                <button type="button" onClick={() => { setShowForm(false); setCreateError(false); }} className="rounded-lg border border-border px-4 py-2 hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
                                {t('voiceProfiles.cancel')}
                            </button>
                            <button type="submit" disabled={saving} className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
                                {saving && <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />}
                                {saving ? t('voiceProfiles.creating') : t('voiceProfiles.create')}
                            </button>
                        </div>
                    </form>
                </ManagementModal>
            )}

            {deleteProfile && (
                <ManagementModal title={t('voiceProfiles.deleteTitle')} onClose={() => setDeleteProfile(null)}>
                    <div className="rounded-xl border border-border bg-card p-6">
                        <h2 className="text-lg font-semibold">{t('voiceProfiles.deleteTitle')}</h2>
                        {deleteError && <p role="alert" className="mt-3 text-sm text-destructive">{t('voiceProfiles.deleteFailed')}</p>}
                        <p className="mt-3 text-muted-foreground">{t('voiceProfiles.deletePrompt')}</p>
                        <p className="mt-2 font-medium">{deleteProfile.name}</p>
                        <div className="mt-6 flex justify-end gap-3">
                            <button type="button" onClick={() => { setDeleteProfile(null); setDeleteError(false); }} className="rounded-lg border border-border px-4 py-2 hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
                                {t('voiceProfiles.cancel')}
                            </button>
                            <button type="button" onClick={() => void handleDelete()} className="rounded-lg bg-destructive px-4 py-2 text-destructive-foreground hover:bg-destructive/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
                                {t('voiceProfiles.delete')}
                            </button>
                        </div>
                    </div>
                </ManagementModal>
            )}
        </div>
    );
}
