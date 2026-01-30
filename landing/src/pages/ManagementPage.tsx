import { useEffect, useMemo, useState } from 'react';
import type { ElementType } from 'react';
import { Activity, AlertTriangle, Cpu, Database, Server, Settings2, Wifi } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TechStackItem {
    name: string;
    version: string;
    category: 'frontend' | 'backend' | 'realtime' | 'other';
    icon?: string;
}

interface DependencyInfo {
    name: string;
    currentVersion: string;
    latestVersion: string;
    hasUpdate: boolean;
    module: 'cloud' | 'landing' | 'agent';
}

interface ServerStatus {
    status: 'online' | 'offline' | 'degraded';
    uptime: number;
    nodeVersion: string;
    memoryUsage: {
        used: number;
        total: number;
        percentage: number;
    };
}

interface TechStatusResponse {
    server: ServerStatus;
    techStack: TechStackItem[];
    dependencies: DependencyInfo[];
}

type ProviderType = 'stt' | 'tts' | 'rpa';

interface ProviderCatalogEntry {
    id: string;
    type: ProviderType;
    name: string;
    description?: string;
    status?: string;
    is_enabled?: boolean;
    metadata?: Record<string, any>;
}

import { API_URL, LAUNCHER_URL } from '@/lib/config';
const CLOUD_URL = API_URL;

const statusStyles: Record<string, string> = {
    online: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
    offline: 'bg-red-500/10 text-red-500 border-red-500/20',
    degraded: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
};

const providerStateStyles: Record<string, string> = {
    ready: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
    'needs-config': 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
    disabled: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
    deprecated: 'bg-red-500/10 text-red-500 border-red-500/20'
};

const providerTypeLabel: Record<ProviderType, string> = {
    stt: 'Speech-to-Text',
    tts: 'Text-to-Speech',
    rpa: 'RPA Execution'
};

const providerTypeIcons: Record<ProviderType, ElementType> = {
    stt: Activity,
    tts: Wifi,
    rpa: Settings2
};

const formatUptime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    if (hrs > 0) return `${hrs}h ${mins}m`;
    if (mins > 0) return `${mins}m ${secs}s`;
    return `${secs}s`;
};

const formatBytes = (bytes: number) => {
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let value = bytes;
    let unitIndex = 0;
    while (value >= 1024 && unitIndex < units.length - 1) {
        value /= 1024;
        unitIndex += 1;
    }
    return `${value.toFixed(1)} ${units[unitIndex]}`;
};

const resolveProviderState = (provider: ProviderCatalogEntry, readyIds: Set<string>) => {
    if (provider.status === 'deprecated') return 'deprecated';
    if (provider.is_enabled === false) return 'disabled';
    return readyIds.has(provider.id) ? 'ready' : 'needs-config';
};

const getProviderMeta = (provider: ProviderCatalogEntry) => {
    const metadata = provider.metadata || {};
    const endpoint = metadata.endpoint || metadata.url;
    const requiresEnv = metadata.required_env || metadata.requiredEnv || metadata.api_key_env;
    const requiresApiKey = metadata.requires_api_key || metadata.requiresApiKey;
    return { endpoint, requiresEnv, requiresApiKey };
};

export default function ManagementPage() {
    const [techStatus, setTechStatus] = useState<TechStatusResponse | null>(null);
    const [providers, setProviders] = useState<ProviderCatalogEntry[]>([]);
    const [readyProviders, setReadyProviders] = useState<ProviderCatalogEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'error'>('idle');
    const [startHint, setStartHint] = useState<'idle' | 'copied'>('idle');
    const [startState, setStartState] = useState<'idle' | 'starting' | 'started' | 'error'>('idle');
    const [startError, setStartError] = useState<string | null>(null);

    useEffect(() => {
        const loadStatus = async () => {
            setLoading(true);
            setError(null);
            try {
                const [techRes, providerRes, readyRes] = await Promise.all([
                    fetch(`${CLOUD_URL}/api/tech-status`),
                    fetch(`${CLOUD_URL}/api/provider-catalog`),
                    fetch(`${CLOUD_URL}/api/provider-catalog?localOnly=true`)
                ]);

                if (!techRes.ok) throw new Error('Backend status unavailable');
                if (!providerRes.ok) throw new Error('Provider catalog unavailable');
                if (!readyRes.ok) throw new Error('Provider readiness unavailable');

                const techData = await techRes.json();
                const providerData = await providerRes.json();
                const readyData = await readyRes.json();

                setTechStatus(techData);
                setProviders(Array.isArray(providerData) ? providerData : []);
                setReadyProviders(Array.isArray(readyData) ? readyData : []);
                setLastUpdated(new Date());
            } catch (err) {
                console.error('Failed to load management status:', err);
                setError('Status service is offline or unreachable.');
            } finally {
                setLoading(false);
            }
        };

        loadStatus();
    }, []);

    const handleCopyStatus = async () => {
        const snapshot = {
            generatedAt: new Date().toISOString(),
            server: techStatus?.server || null,
            techStack: techStatus?.techStack || [],
            dependencies: techStatus?.dependencies || [],
            providers,
            readyProviders,
            audioTabs: {
                audio: providersByType.stt.length,
                tts: providersByType.tts.length,
                rpa: providersByType.rpa.length
            }
        };

        try {
            await navigator.clipboard.writeText(JSON.stringify(snapshot, null, 2));
            setCopyStatus('copied');
            setTimeout(() => setCopyStatus('idle'), 1500);
        } catch (err) {
            console.error('Failed to copy status:', err);
            setCopyStatus('error');
            setTimeout(() => setCopyStatus('idle'), 1500);
        }
    };

    const handleCopyStartCommand = async () => {
        const command = 'cd C:\\Keldon\\cloud && npm run dev';
        try {
            await navigator.clipboard.writeText(command);
            setStartHint('copied');
            setTimeout(() => setStartHint('idle'), 1500);
        } catch (err) {
            console.error('Failed to copy start command:', err);
        }
    };

    const handleStartCloud = async () => {
        setStartState('starting');
        setStartError(null);
        try {
            const response = await fetch(`${LAUNCHER_URL}/start-cloud`, { method: 'POST' });
            if (!response.ok) {
                const payload = await response.json().catch(() => ({}));
                throw new Error(payload?.error || `Launcher responded ${response.status}`);
            }
            setStartState('started');
            setTimeout(() => setStartState('idle'), 2000);
        } catch (err: any) {
            console.error('Failed to start cloud:', err);
            setStartState('error');
            setStartError(err?.message || 'Launcher unreachable');
            setTimeout(() => setStartState('idle'), 2500);
        }
    };

    const handleStartAll = async () => {
        setStartState('starting');
        setStartError(null);
        try {
            const response = await fetch(`${LAUNCHER_URL}/start-all`, { method: 'POST' });
            if (!response.ok) {
                const payload = await response.json().catch(() => ({}));
                throw new Error(payload?.error || `Launcher responded ${response.status}`);
            }
            setStartState('started');
            setTimeout(() => setStartState('idle'), 2000);
        } catch (err: any) {
            console.error('Failed to start all services:', err);
            setStartState('error');
            setStartError(err?.message || 'Launcher unreachable');
            setTimeout(() => setStartState('idle'), 2500);
        }
    };

    const readyIds = useMemo(() => new Set(readyProviders.map(provider => provider.id)), [readyProviders]);

    const providersByType = useMemo(() => {
        return providers.reduce<Record<ProviderType, ProviderCatalogEntry[]>>((acc, provider) => {
            acc[provider.type] = acc[provider.type] || [];
            acc[provider.type].push(provider);
            return acc;
        }, { stt: [], tts: [], rpa: [] });
    }, [providers]);

    return (
        <div className="space-y-8">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Management Status</h1>
                    <p className="text-muted-foreground mt-1">Backend health, runtime diagnostics, and provider readiness.</p>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2 bg-muted/50 px-4 py-2 rounded-full border border-border">
                        <Server className="w-4 h-4" />
                        {lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString()}` : 'Awaiting status'}
                    </div>
                    <button
                        type="button"
                        onClick={handleCopyStatus}
                        className="px-4 py-2 rounded-full border border-border bg-card text-foreground text-sm font-medium hover:border-primary/40 transition"
                    >
                        {copyStatus === 'copied' ? 'Status Copied' : copyStatus === 'error' ? 'Copy Failed' : 'Copy Status'}
                    </button>
                    <button
                        type="button"
                        onClick={handleStartAll}
                        disabled={startState === 'starting'}
                        className="px-4 py-2 rounded-full border border-border bg-primary/15 text-foreground text-sm font-medium hover:border-primary/40 transition disabled:opacity-60"
                    >
                        {startState === 'starting'
                            ? 'Starting All...'
                            : startState === 'started'
                                ? 'All Started'
                                : startState === 'error'
                                    ? 'Start Failed'
                                    : 'Start All'}
                    </button>
                    <button
                        type="button"
                        onClick={handleStartCloud}
                        disabled={startState === 'starting'}
                        className="px-4 py-2 rounded-full border border-border bg-emerald-500/15 text-foreground text-sm font-medium hover:border-emerald-500/40 transition disabled:opacity-60"
                    >
                        {startState === 'starting'
                            ? 'Starting Cloud...'
                            : startState === 'started'
                                ? 'Cloud Started'
                                : startState === 'error'
                                    ? 'Start Failed'
                                    : 'Start Cloud'}
                    </button>
                    <button
                        type="button"
                        onClick={handleCopyStartCommand}
                        className="px-4 py-2 rounded-full border border-border bg-muted/60 text-foreground text-sm font-medium hover:border-primary/40 transition"
                    >
                        {startHint === 'copied' ? 'Start Command Copied' : 'Copy Start Command'}
                    </button>
                </div>
            </div>

            {startError && (
                <div className="text-xs text-red-500">{startError}</div>
            )}

            {error && (
                <div className="flex items-center gap-3 p-4 rounded-xl border border-red-500/30 bg-red-500/10 text-red-500">
                    <AlertTriangle className="w-5 h-5" />
                    <span className="text-sm font-medium">{error}</span>
                </div>
            )}

            {loading && (
                <div className="text-muted-foreground">Loading system status...</div>
            )}

            {!loading && techStatus && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="p-6 rounded-xl border border-border bg-card shadow-sm">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Cloud Server</p>
                                <p className="text-lg font-semibold text-foreground">Keledon Cloud</p>
                            </div>
                            <span className={cn('px-3 py-1 rounded-full text-xs border font-medium uppercase', statusStyles[techStatus.server.status])}>
                                {techStatus.server.status}
                            </span>
                        </div>
                        <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <p className="text-muted-foreground">Uptime</p>
                                <p className="font-medium text-foreground">{formatUptime(techStatus.server.uptime)}</p>
                            </div>
                            <div>
                                <p className="text-muted-foreground">Node</p>
                                <p className="font-medium text-foreground">{techStatus.server.nodeVersion}</p>
                            </div>
                        </div>
                        <div className="mt-4">
                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                                <span>Memory Usage</span>
                                <span>{techStatus.server.memoryUsage.percentage}%</span>
                            </div>
                            <div className="w-full h-2 rounded-full bg-muted mt-2">
                                <div
                                    className="h-2 rounded-full bg-primary"
                                    style={{ width: `${techStatus.server.memoryUsage.percentage}%` }}
                                />
                            </div>
                            <div className="mt-2 text-xs text-muted-foreground">
                                {formatBytes(techStatus.server.memoryUsage.used)} / {formatBytes(techStatus.server.memoryUsage.total)}
                            </div>
                        </div>
                    </div>

                    <div className="p-6 rounded-xl border border-border bg-card shadow-sm">
                        <div className="flex items-center gap-2">
                            <Cpu className="w-4 h-4 text-muted-foreground" />
                            <p className="text-sm text-muted-foreground">Tech Stack</p>
                        </div>
                        <div className="mt-4 space-y-3">
                            {techStatus.techStack.map((item) => (
                                <div key={item.name} className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-sm text-foreground">
                                        <span>{item.icon || '⚙️'}</span>
                                        <span>{item.name}</span>
                                    </div>
                                    <span className="text-xs text-muted-foreground font-mono">v{item.version}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="p-6 rounded-xl border border-border bg-card shadow-sm">
                        <div className="flex items-center gap-2">
                            <Database className="w-4 h-4 text-muted-foreground" />
                            <p className="text-sm text-muted-foreground">Dependencies</p>
                        </div>
                        <div className="mt-4 space-y-3 text-sm">
                            <div className="flex items-center justify-between">
                                <span className="text-foreground">Packages tracked</span>
                                <span className="font-medium text-foreground">{techStatus.dependencies.length}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-foreground">Updates flagged</span>
                                <span className="font-medium text-foreground">
                                    {techStatus.dependencies.filter(dep => dep.hasUpdate).length}
                                </span>
                            </div>
                            <div className="text-xs text-muted-foreground">
                                Run with <span className="font-mono">?checkUpdates=true</span> to refresh npm versions.
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {!loading && providers.length > 0 && (
                <div className="space-y-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-semibold text-foreground">Provider Readiness</h2>
                        <div className="text-xs text-muted-foreground">
                            Ready providers have required env keys configured in the cloud.
                        </div>
                    </div>

                    {(Object.keys(providersByType) as ProviderType[]).map((type) => {
                        const Icon = providerTypeIcons[type];
                        const group = providersByType[type];
                        if (!group.length) return null;
                        return (
                            <div key={type} className="space-y-3">
                                <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                                    <Icon className="w-4 h-4" />
                                    {providerTypeLabel[type]}
                                </div>
                                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                                    {group.map((provider) => {
                                        const state = resolveProviderState(provider, readyIds);
                                        const { endpoint, requiresEnv, requiresApiKey } = getProviderMeta(provider);
                                        return (
                                            <div key={provider.id} className="p-5 rounded-xl border border-border bg-card">
                                                <div className="flex items-start justify-between gap-4">
                                                    <div>
                                                        <h3 className="text-sm font-semibold text-foreground">{provider.name}</h3>
                                                        {provider.description && (
                                                            <p className="text-xs text-muted-foreground mt-1">{provider.description}</p>
                                                        )}
                                                    </div>
                                                    <span className={cn('px-2.5 py-1 rounded-full text-xs border font-medium uppercase', providerStateStyles[state])}>
                                                        {state.replace('-', ' ')}
                                                    </span>
                                                </div>
                                                <div className="mt-4 flex flex-wrap gap-2 text-xs text-muted-foreground">
                                                    {provider.status && (
                                                        <span className="px-2 py-1 rounded-full border border-border bg-muted/40">{provider.status}</span>
                                                    )}
                                                    {endpoint && (
                                                        <span className="px-2 py-1 rounded-full border border-border bg-muted/40 font-mono">{endpoint}</span>
                                                    )}
                                                    {requiresApiKey && (
                                                        <span className="px-2 py-1 rounded-full border border-border bg-muted/40">API key required</span>
                                                    )}
                                                    {requiresEnv && (
                                                        <span className="px-2 py-1 rounded-full border border-border bg-muted/40">Env keys required</span>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {!loading && providers.length === 0 && (
                <div className="p-4 rounded-xl border border-border bg-card text-sm text-muted-foreground">
                    No providers are registered in the catalog yet.
                </div>
            )}
        </div>
    );
}
