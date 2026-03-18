import { useState, useEffect } from 'react';
import { Settings, RefreshCw, Loader2, Check, X, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const defaultProviderCatalog = [
    { id: 'vosk', type: 'stt', name: 'Vosk (Local Streaming)', status: 'experimental', is_enabled: true },
    { id: 'whisper', type: 'stt', name: 'Whisper (OpenAI)', status: 'production', is_enabled: true },
    { id: 'deepgram', type: 'stt', name: 'Deepgram', status: 'production', is_enabled: true },
    { id: 'elevenlabs', type: 'tts', name: 'ElevenLabs', status: 'production', is_enabled: true },
    { id: 'openai-tts', type: 'tts', name: 'OpenAI TTS', status: 'production', is_enabled: true },
    { id: 'coqui', type: 'tts', name: 'Coqui XTTS-v2', status: 'production', is_enabled: true },
    { id: 'ui-automation', type: 'rpa', name: 'UI Automation', status: 'production', is_enabled: true },
    { id: 'browser-control', type: 'rpa', name: 'Browser Control', status: 'experimental', is_enabled: false },
];

export default function ManagementProvidersPage() {
    const [catalog, setCatalog] = useState(defaultProviderCatalog);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchCatalog();
    }, []);

    const fetchCatalog = async () => {
        try {
            setLoading(true);
            const response = await fetch('/api/provider-catalog');
            if (response.ok) {
                const data = await response.json();
                if (data && data.length > 0) setCatalog(data);
            }
        } catch (error) {
            console.error('Failed to fetch catalog:', error);
        } finally {
            setLoading(false);
        }
    };

    const toggleProvider = async (id: string) => {
        const updated = catalog.map(p => 
            p.id === id ? { ...p, is_enabled: !p.is_enabled } : p
        );
        setCatalog(updated);
        
        try {
            await fetch('/api/provider-catalog', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updated)
            });
            toast.success('Provider updated');
        } catch (error) {
            toast.error('Failed to update provider');
        }
    };

    const sttProviders = catalog.filter(p => p.type === 'stt');
    const ttsProviders = catalog.filter(p => p.type === 'tts');
    const rpaProviders = catalog.filter(p => p.type === 'rpa');

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'production': return 'bg-green-500/20 text-green-400';
            case 'experimental': return 'bg-yellow-500/20 text-yellow-400';
            default: return 'bg-muted text-muted-foreground';
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Settings className="w-6 h-6 text-primary" />
                    <div>
                        <h1 className="text-2xl font-bold">Providers</h1>
                        <p className="text-muted-foreground">Configure STT, TTS, and RPA providers</p>
                    </div>
                </div>
                <button onClick={fetchCatalog} className="p-2 hover:bg-muted rounded-lg transition-colors" title="Refresh">
                    <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
                </button>
            </div>

            {/* STT Providers */}
            <div className="rounded-xl border border-border bg-card p-6">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                    <Globe className="w-5 h-5" />
                    Speech-to-Text (STT)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {sttProviders.map((provider) => (
                        <div key={provider.id} className={cn(
                            "p-4 rounded-lg border transition-colors",
                            provider.is_enabled ? "border-primary/50 bg-primary/5" : "border-border bg-muted/50"
                        )}>
                            <div className="flex items-start justify-between mb-2">
                                <div>
                                    <span className="font-medium">{provider.name}</span>
                                    <span className={cn("ml-2 px-2 py-0.5 text-xs rounded", getStatusBadge(provider.status))}>
                                        {provider.status}
                                    </span>
                                </div>
                                <button
                                    onClick={() => toggleProvider(provider.id)}
                                    className={cn(
                                        "p-1 rounded transition-colors",
                                        provider.is_enabled ? "text-primary" : "text-muted-foreground"
                                    )}
                                >
                                    {provider.is_enabled ? <Check className="w-5 h-5" /> : <X className="w-5 h-5" />}
                                </button>
                            </div>
                            <p className="text-sm text-muted-foreground">ID: {provider.id}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* TTS Providers */}
            <div className="rounded-xl border border-border bg-card p-6">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                    <Globe className="w-5 h-5" />
                    Text-to-Speech (TTS)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {ttsProviders.map((provider) => (
                        <div key={provider.id} className={cn(
                            "p-4 rounded-lg border transition-colors",
                            provider.is_enabled ? "border-primary/50 bg-primary/5" : "border-border bg-muted/50"
                        )}>
                            <div className="flex items-start justify-between mb-2">
                                <div>
                                    <span className="font-medium">{provider.name}</span>
                                    <span className={cn("ml-2 px-2 py-0.5 text-xs rounded", getStatusBadge(provider.status))}>
                                        {provider.status}
                                    </span>
                                </div>
                                <button
                                    onClick={() => toggleProvider(provider.id)}
                                    className={cn(
                                        "p-1 rounded transition-colors",
                                        provider.is_enabled ? "text-primary" : "text-muted-foreground"
                                    )}
                                >
                                    {provider.is_enabled ? <Check className="w-5 h-5" /> : <X className="w-5 h-5" />}
                                </button>
                            </div>
                            <p className="text-sm text-muted-foreground">ID: {provider.id}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* RPA Providers */}
            <div className="rounded-xl border border-border bg-card p-6">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                    <Globe className="w-5 h-5" />
                    RPA Providers
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {rpaProviders.map((provider) => (
                        <div key={provider.id} className={cn(
                            "p-4 rounded-lg border transition-colors",
                            provider.is_enabled ? "border-primary/50 bg-primary/5" : "border-border bg-muted/50"
                        )}>
                            <div className="flex items-start justify-between mb-2">
                                <div>
                                    <span className="font-medium">{provider.name}</span>
                                    <span className={cn("ml-2 px-2 py-0.5 text-xs rounded", getStatusBadge(provider.status))}>
                                        {provider.status}
                                    </span>
                                </div>
                                <button
                                    onClick={() => toggleProvider(provider.id)}
                                    className={cn(
                                        "p-1 rounded transition-colors",
                                        provider.is_enabled ? "text-primary" : "text-muted-foreground"
                                    )}
                                >
                                    {provider.is_enabled ? <Check className="w-5 h-5" /> : <X className="w-5 h-5" />}
                                </button>
                            </div>
                            <p className="text-sm text-muted-foreground">ID: {provider.id}</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
