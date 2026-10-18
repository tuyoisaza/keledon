import { useCallback, useEffect, useState } from 'react';
import { Play, Loader2, Monitor, Shield, AlertCircle, RefreshCw, Copy, Check, Download, Building2, ArrowRightCircle, ListChecks } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { getKeledons, getVendors, type Keledon, type Vendor } from '@/lib/crud-api';
import { getBrowserDownloadUrl, getBrowserInstallerUrl, DEFAULT_BROWSER_DOWNLOAD_URL, BROWSER_RELEASES_API } from '@/lib/knowledge-source-utils.js';
import { toast } from 'sonner';
import { useTranslation } from '@/context/I18nContext';
import { requestKeledonLaunch } from '@/lib/launch-protocol.js';
import { apiFetch, apiJson } from '@/lib/api-fetch';

export default function LaunchKeledonPage() {
    const { user } = useAuth();
    const { t, locale } = useTranslation();
    const [keledons, setKeledons] = useState<Keledon[]>([]);
    const [vendorsMap, setVendorsMap] = useState<Record<string, Vendor[]>>({});
    const [loading, setLoading] = useState(true);
    const [launching, setLaunching] = useState<string | null>(null);
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [browserVersion, setBrowserVersion] = useState<string | null>(null);
    const [browserReleaseTag, setBrowserReleaseTag] = useState<string | null>(null);
    const [versionLoading, setVersionLoading] = useState(true);
    const [launchDetails, setLaunchDetails] = useState<null | {
        keledonId: string;
        teamId: string | null;
        keledonName: string;
        vendors: Vendor[];
        nextSteps: Array<{ title: string; detail: string }>;
    }>(null);
    const [pairingCodes, setPairingCodes] = useState<Record<string, { code: string | null; expiresAt: string } | null>>({});
    const [resettingCode, setResettingCode] = useState<string | null>(null);
    const [loadingPairingCodes, setLoadingPairingCodes] = useState<Record<string, boolean>>({});

    // Load pairing codes for superadmin when keledons change
    useEffect(() => {
        if (user?.role === 'superadmin' && keledons.length > 0) {
            keledons.forEach(k => fetchPairingCode(k.id));
        }
    }, [keledons, user?.role]);

    // Fetch latest browser version from GitHub
    useEffect(() => {
        const controller = new AbortController();
        fetch(BROWSER_RELEASES_API, { signal: controller.signal })
            .then(r => r.ok ? r.json() : null)
            .then(d => {
                const tagName = typeof d?.tag_name === 'string' && /^v?\d+\.\d+\.\d+$/.test(d.tag_name)
                    ? d.tag_name
                    : null;
                setBrowserReleaseTag(tagName);
                setBrowserVersion(tagName?.replace(/^v/, '') || null);
            })
            .catch(() => setBrowserVersion(null))
            .finally(() => setVersionLoading(false));
        return () => controller.abort();
    }, []);

    const loadKeledons = useCallback(async () => {
        setLoading(true);
        try {
            const data = await getKeledons();
            setKeledons(data);
            
            const vendorsByTeam: Record<string, Vendor[]> = {};
            const teamIds = new Set(data.map(keledon => keledon.teamId).filter((id): id is string => Boolean(id)));
            for (const teamId of teamIds) {
                    try {
                        const vendors = await getVendors(teamId);
                        vendorsByTeam[teamId] = vendors;
                    } catch (_e) {
                        console.error('Failed to load vendors for team:', teamId);
                    }
            }
            if (Object.keys(vendorsByTeam).length > 0) {
                setVendorsMap(prev => ({ ...prev, ...vendorsByTeam }));
            }
        } catch (error) {
            console.error('Failed to load keledons:', error);
            toast.error(t('launch.loadFailed'));
        } finally {
            setLoading(false);
        }
    }, [t]);

    useEffect(() => {
        void loadKeledons();
    }, [loadKeledons]);

    const handleLaunch = async (keledonId: string) => {
        if (!user) {
            toast.error(t('launch.loginRequired'));
            return;
        }
        
        setLaunching(keledonId);
        try {
            
            const response = await apiFetch(`/api/crud/keledons/${keledonId}/launch`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user.id })
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.message || `Failed to launch (${response.status})`);
            }

            setLaunchDetails({
                keledonId,
                teamId: data.team_id || null,
                keledonName: data.keledon_name || keledonId,
                vendors: data.vendors || (data.team_id ? vendorsMap[data.team_id] : []) || [],
                nextSteps: data.next_steps || [],
            });
            
            // OS handoff is a request; page navigation cannot prove installation or launch.
            if (!requestKeledonLaunch(data.deep_link, url => window.location.assign(url))) {
                toast.error(t('launch.invalidLink'));
                return;
            }
            toast.info(t('launch.requested'));
        } catch {
            console.error('[Launch] Request failed');
            toast.error(t('launch.failed'));
        } finally {
            setLaunching(null);
        }
    };

    const fetchPairingCode = async (keledonId: string) => {
        setLoadingPairingCodes(prev => ({ ...prev, [keledonId]: true }));
        try {
            const data = await apiJson<{ pairing_code: string; expires_at: string }>(`/api/crud/keledons/${keledonId}/pairing-code`);
            setPairingCodes(prev => ({
                ...prev,
                [keledonId]: { code: data.pairing_code, expiresAt: data.expires_at }
            }));
        } catch (e) {
            console.error('Failed to fetch pairing code:', e);
            setPairingCodes(prev => ({ ...prev, [keledonId]: null }));
        } finally {
            setLoadingPairingCodes(prev => ({ ...prev, [keledonId]: false }));
        }
    };

    const resetPairingCode = async (keledonId: string) => {
        setResettingCode(keledonId);
        try {
            const data = await apiJson<{ pairing_code: string; expires_at: string }>(`/api/crud/keledons/${keledonId}/pairing-code`, { method: 'POST' });
            setPairingCodes(prev => ({
                ...prev,
                [keledonId]: { code: data.pairing_code, expiresAt: data.expires_at }
            }));
            toast.success(t('launch.pairingCodeGenerated'));
        } catch (error) {
            toast.error(error instanceof Error ? error.message : t('launch.pairingCodeFailed'));
        } finally {
            setResettingCode(null);
        }
    };

    const copyPairingCode = async (code: string, keledonId: string) => {
        try {
            await navigator.clipboard.writeText(code);
            setCopiedId(keledonId);
            setTimeout(() => setCopiedId(null), 2000);
            toast.success(t('launch.pairingCodeCopied'));
        } catch {
            toast.error(t('launch.copyFailed'));
        }
    };

    if (loading) {
        return (
                <div role="status" aria-label={t('launch.loading')} className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    const isSuperAdmin = user?.role === 'superadmin';
    const configuredDownloadUrl = getBrowserDownloadUrl(import.meta.env);
    const hasCustomDownloadUrl = configuredDownloadUrl !== DEFAULT_BROWSER_DOWNLOAD_URL;
    const configuredBrowserVersion = import.meta.env.VITE_KELEDON_BROWSER_VERSION?.trim();
    const browserDownloadUrl = !hasCustomDownloadUrl && browserReleaseTag
        ? getBrowserInstallerUrl(browserReleaseTag)
        : configuredDownloadUrl;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Monitor className="w-8 h-8 text-primary" />
                    <div>
                        <h1 className="text-2xl font-bold">{t('launch.title')}</h1>
                        <p className="text-muted-foreground">
                            {t('launch.subtitle')}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {/* The displayed release and default installer URL use the same GitHub release tag. */}
                    <a
                        href={browserDownloadUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={browserVersion && !hasCustomDownloadUrl
                            ? `${t('launch.downloadApp')}, KELEDON Browser v${browserVersion}`
                            : t('launch.downloadApp')}
                        className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                    >
                        <Download className="w-4 h-4" />
                        {t('launch.downloadApp')}
                        {browserVersion && !hasCustomDownloadUrl && (
                            <span className="ml-1 px-1.5 py-0.5 text-[10px] font-bold bg-primary-foreground/15 rounded">
                                v{browserVersion}
                            </span>
                        )}
                        {hasCustomDownloadUrl && (
                            <span className="ml-1 px-1.5 py-0.5 text-[10px] font-bold bg-primary-foreground/15 rounded">
                                {configuredBrowserVersion ? `v${configuredBrowserVersion}` : t('launch.customDownload')}
                            </span>
                        )}
                        {!hasCustomDownloadUrl && !browserVersion && !versionLoading && (
                            <span className="ml-1 px-1.5 py-0.5 text-[10px] font-bold bg-primary-foreground/15 rounded">
                                {t('launch.downloadVersionUnavailable')}
                            </span>
                        )}
                        {versionLoading && (
                            <Loader2 className="w-3 h-3 animate-spin ml-1" />
                        )}
                    </a>
                    <button 
                        onClick={() => {
                            // Try to trigger protocol registration by opening deep link
                            window.location.href = 'keledon://register';
                            setTimeout(() => {
                                toast.info(t('launch.protocolResult'));
                            }, 1000);
                        }}
                        className="px-3 py-2 text-sm bg-muted hover:bg-muted/80 rounded-lg transition-colors"
                        title={t('launch.testProtocolTitle')}
                    >
                        {t('launch.testProtocol')}
                    </button>
                    <button 
                        onClick={loadKeledons}
                        className="p-2 hover:bg-muted rounded-lg transition-colors"
                        title={t('launch.refresh')}
                        aria-label={t('launch.refresh')}
                    >
                        <RefreshCw className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {keledons.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                    <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>{t('launch.noKeledons')}</p>
                    <p className="text-sm mt-2">{t('launch.createKeledon')}</p>
                </div>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {keledons.map((keledon) => (
                        <div 
                            key={keledon.id}
                            className="border border-border rounded-xl p-5 bg-card hover:border-primary/50 transition-colors"
                        >
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                                        <Shield className="w-5 h-5 text-primary" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold">{keledon.name}</h3>
                                        <p className="text-xs text-muted-foreground">
                                            {keledon.team?.name || t('launch.noTeam')}
                                        </p>
                                    </div>
                                </div>
                                <span className={`px-2 py-1 rounded text-xs font-medium ${
                                    keledon.isActive 
                                        ? 'bg-green-500/20 text-green-400' 
                                        : 'bg-muted text-muted-foreground'
                                }`}>
                                    {keledon.isActive ? t('launch.active') : t('launch.inactive')}
                                </span>
                            </div>

                            <div className="space-y-2 mb-4">
                                <div className="text-sm flex items-center gap-2">
                                    <Building2 className="w-4 h-4 text-muted-foreground" />
                                    <span className="text-muted-foreground">{t('launch.company')}:</span>
                                    <span className="font-medium">{keledon.team?.brand?.companyId || t('launch.notAvailable')}</span>
                                </div>
                                <div className="text-sm">
                                    <span className="text-muted-foreground">{t('launch.team')}:</span>{' '}
                                    <span className="font-medium">{keledon.team?.name || t('launch.noTeam')}</span>
                                </div>
                                {vendorsMap[keledon.teamId]?.length > 0 && (
                                    <div className="text-sm">
                                        <span className="text-muted-foreground">{t('launch.vendors')}:</span>{' '}
                                        <span className="font-medium">
                                            {vendorsMap[keledon.teamId].map(v => v.name).join(', ')}
                                        </span>
                                    </div>
                                )}
                                <div className="text-sm">
                                    <span className="text-muted-foreground">{t('launch.autonomy')}:</span>{' '}
                                    <span className="font-medium">{keledon.autonomyLevel}/5</span>
                                </div>
                                <div className="text-sm">
                                    <span className="text-muted-foreground">{t('launch.role')}:</span>{' '}
                                    <span className="font-medium">{keledon.role || t('launch.agent')}</span>
                                </div>
                                {keledon.callsHandled !== undefined && (
                                    <div className="text-sm">
                                        <span className="text-muted-foreground">{t('launch.calls')}:</span>{' '}
                                        <span className="font-medium">{keledon.callsHandled}</span>
                                    </div>
                                )}
                            </div>

                            {launchDetails?.keledonId === keledon.id && (
                                <div className="mb-4 p-4 bg-muted/70 rounded-lg border border-border">
                                    <div className="flex items-center justify-between gap-2 mb-3">
                                        <div className="flex items-center gap-2">
                                            <ListChecks className="w-4 h-4 text-primary" />
                                            <p className="text-sm font-semibold">{t('launch.nextSteps')}</p>
                                        </div>
                                        <ArrowRightCircle className="w-4 h-4 text-muted-foreground" />
                                    </div>
                                    <div className="space-y-3 text-sm">
                                        <div>
                                            <p className="text-xs text-muted-foreground mb-1">{t('launch.fromKeledon')}</p>
                                            <p className="font-medium">{launchDetails.keledonName}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-muted-foreground mb-1">{t('launch.vendorsToOpen')}</p>
                                            <p className="font-medium">
                                                {launchDetails.vendors.length > 0
                                                    ? launchDetails.vendors.map(v => v.name).join(', ')
                                                    : t('launch.noVendorsReturned')}
                                            </p>
                                        </div>
                                        <ol className="space-y-2 list-decimal list-inside text-muted-foreground">
                                            {launchDetails.nextSteps.map(step => (
                                                <li key={`${launchDetails.keledonId}-${step.title}`}>
                                                    <span className="text-foreground font-medium">{step.title}.</span>{' '}
                                                    {step.detail}
                                                </li>
                                            ))}
                                        </ol>
                                    </div>
                                </div>
                            )}

                            {isSuperAdmin && (
                                <div className="mb-4 p-3 bg-muted rounded-lg">
                                    <div className="flex items-center justify-between mb-2">
                                        <p className="text-xs text-muted-foreground">{t('launch.pairingCode')}</p>
                                        <button
                                            onClick={() => resetPairingCode(keledon.id)}
                                            disabled={resettingCode === keledon.id}
                                            className="text-xs px-2 py-1 bg-primary/10 hover:bg-primary/20 text-primary rounded transition-colors disabled:opacity-50"
                                            title={t('launch.generatePairingCode')}
                                        >
                                            {resettingCode === keledon.id ? (
                                                <Loader2 className="w-3 h-3 animate-spin" />
                                            ) : t('launch.reset')}
                                        </button>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <code className="flex-1 font-mono text-sm break-all">
                                            {loadingPairingCodes[keledon.id]
                                                ? t('launch.loading')
                                                : pairingCodes[keledon.id]?.code || t('launch.noCode')}
                                        </code>
                                        {pairingCodes[keledon.id]?.code && (
                                            <button
                                                onClick={() => copyPairingCode(pairingCodes[keledon.id]!.code!, keledon.id)}
                                                className="p-1 hover:bg-background rounded shrink-0"
                                                title={t('launch.copyCode')}
                                                aria-label={t('launch.copyCode')}
                                            >
                                                {copiedId === keledon.id ? (
                                                    <Check className="w-4 h-4 text-green-500" />
                                                ) : (
                                                    <Copy className="w-4 h-4" />
                                                )}
                                            </button>
                                        )}
                                    </div>
                                    {pairingCodes[keledon.id]?.expiresAt && (
                                        <p className="text-[10px] text-muted-foreground mt-1">
                                            {t('launch.expires')}: {new Date(pairingCodes[keledon.id]!.expiresAt).toLocaleString(locale)}
                                        </p>
                                    )}
                                </div>
                            )}

                            <button
                                onClick={() => handleLaunch(keledon.id)}
                                disabled={launching === keledon.id || !keledon.isActive}
                                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium disabled:opacity-50"
                            >
                                {launching === keledon.id ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <Play className="w-4 h-4" />
                                )}
                                {launching === keledon.id ? t('launch.launching') : t('launch.launch')}
                            </button>
                        </div>
                    ))}
                </div>
            )}

            <div className="mt-8 p-4 bg-muted/50 rounded-lg">
                <h3 className="font-medium mb-2">{t('launch.howItWorks')}</h3>
                <ol className="text-sm text-muted-foreground space-y-1">
                    <li>{t('launch.step1')}</li>
                    <li>{t('launch.step2')}</li>
                    <li>{t('launch.step3')}</li>
                    <li>{t('launch.step4')}</li>
                </ol>
            </div>
        </div>
    );
}
