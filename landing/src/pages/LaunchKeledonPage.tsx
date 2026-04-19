import { useEffect, useState } from 'react';
import { Play, Loader2, Monitor, Shield, AlertCircle, RefreshCw, Copy, Check, Download, Building2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { getKeledons, getVendors, type Keledon, type Vendor } from '@/lib/crud-api';
import { toast } from 'sonner';

export default function LaunchKeledonPage() {
    const { user } = useAuth();
    const [keledons, setKeledons] = useState<Keledon[]>([]);
    const [vendorsMap, setVendorsMap] = useState<Record<string, Vendor[]>>({});
    const [loading, setLoading] = useState(true);
    const [launching, setLaunching] = useState<string | null>(null);
    const [copiedId, setCopiedId] = useState<string | null>(null);

    useEffect(() => {
        loadKeledons();
    }, [user]);

    const loadKeledons = async () => {
        setLoading(true);
        try {
            const data = await getKeledons();
            setKeledons(data);
            
            const vendorsByTeam: Record<string, Vendor[]> = {};
            for (const keledon of data) {
                if (keledon.teamId && !vendorsMap[keledon.teamId]) {
                    try {
                        const vendors = await getVendors(keledon.teamId);
                        vendorsByTeam[keledon.teamId] = vendors;
                    } catch (e) {
                        console.error('Failed to load vendors for team:', keledon.teamId);
                    }
                }
            }
            if (Object.keys(vendorsByTeam).length > 0) {
                setVendorsMap(prev => ({ ...prev, ...vendorsByTeam }));
            }
        } catch (error) {
            console.error('Failed to load keledons:', error);
            toast.error('Failed to load Keledons');
        } finally {
            setLoading(false);
        }
    };

    const handleLaunch = async (keledonId: string) => {
        if (!user) {
            toast.error('Please log in to launch');
            return;
        }
        
        setLaunching(keledonId);
        try {
            console.log('Launching keledon:', keledonId, 'with userId:', user.id);
            
            const response = await fetch(`/api/crud/keledons/${keledonId}/launch`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user.id })
            });
            
            const data = await response.json();
            console.log('Launch response:', response.status, data);
            
            if (!response.ok) {
                throw new Error(data.message || `Failed to launch (${response.status})`);
            }
            
            // Open deep link
            if (data.deep_link) {
                const deepLink = data.deep_link;
                const currentUrl = window.location.href;
                
                // Try to open deep link
                window.location.href = deepLink;
                
                // Check if protocol handler exists (page didn't change = no handler)
                await new Promise(resolve => setTimeout(resolve, 1500));
                
                if (window.location.href === currentUrl) {
                    // Protocol not registered - prompt download
                    toast.error('Browser not detected. Downloading...');
                    window.open('https://github.com/tuyoisaza/keledon/releases', '_blank');
                } else {
                    toast.success(`Launching ${data.keledon_name || keledonId}...`);
                }
            }
        } catch (error: any) {
            console.error('Failed to launch keledon:', error);
            toast.error(error.message || 'Failed to launch Keledon');
        } finally {
            setLaunching(null);
        }
    };

    const copyPairingCode = async (code: string, keledonId: string) => {
        try {
            await navigator.clipboard.writeText(code);
            setCopiedId(keledonId);
            setTimeout(() => setCopiedId(null), 2000);
            toast.success('Pairing code copied!');
        } catch {
            toast.error('Failed to copy');
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    const isSuperAdmin = user?.role === 'superadmin';

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Monitor className="w-8 h-8 text-primary" />
                    <div>
                        <h1 className="text-2xl font-bold">Launch Keledon</h1>
                        <p className="text-muted-foreground">
                            Select a Keledon to launch as a desktop agent
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <a 
                        href="https://github.com/tuyoisaza/keledon/releases/download/v0.1.17/KELEDON.Browser.Setup.0.1.17.exe"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                    >
                        <Download className="w-4 h-4" />
                        Download App
                    </a>
                    <button 
                        onClick={() => {
                            // Try to trigger protocol registration by opening deep link
                            window.location.href = 'keledon://register';
                            setTimeout(() => {
                                toast.info('If browser opened, protocol is registered. Restart app if not.');
                            }, 1000);
                        }}
                        className="px-3 py-2 text-sm bg-muted hover:bg-muted/80 rounded-lg transition-colors"
                        title="Test protocol registration"
                    >
                        Test Protocol
                    </button>
                    <button 
                        onClick={loadKeledons}
                        className="p-2 hover:bg-muted rounded-lg transition-colors"
                        title="Refresh"
                    >
                        <RefreshCw className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {keledons.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                    <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No Keledons available</p>
                    <p className="text-sm mt-2">Create a Keledon in Management → Keledons</p>
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
                                            {keledon.team?.name || 'No team'}
                                        </p>
                                    </div>
                                </div>
                                <span className={`px-2 py-1 rounded text-xs font-medium ${
                                    keledon.isActive 
                                        ? 'bg-green-500/20 text-green-400' 
                                        : 'bg-muted text-muted-foreground'
                                }`}>
                                    {keledon.isActive ? 'Active' : 'Inactive'}
                                </span>
                            </div>

                            <div className="space-y-2 mb-4">
                                <div className="text-sm flex items-center gap-2">
                                    <Building2 className="w-4 h-4 text-muted-foreground" />
                                    <span className="text-muted-foreground">Company:</span>
                                    <span className="font-medium">{keledon.team?.brand?.company?.name || 'N/A'}</span>
                                </div>
                                <div className="text-sm">
                                    <span className="text-muted-foreground">Team:</span>{' '}
                                    <span className="font-medium">{keledon.team?.name || 'No team'}</span>
                                </div>
                                {vendorsMap[keledon.teamId]?.length > 0 && (
                                    <div className="text-sm">
                                        <span className="text-muted-foreground">Vendors:</span>{' '}
                                        <span className="font-medium">
                                            {vendorsMap[keledon.teamId].map(v => v.name).join(', ')}
                                        </span>
                                    </div>
                                )}
                                <div className="text-sm">
                                    <span className="text-muted-foreground">Autonomy:</span>{' '}
                                    <span className="font-medium">{keledon.autonomyLevel}/5</span>
                                </div>
                                <div className="text-sm">
                                    <span className="text-muted-foreground">Role:</span>{' '}
                                    <span className="font-medium">{keledon.role || 'agent'}</span>
                                </div>
                                {keledon.callsHandled !== undefined && (
                                    <div className="text-sm">
                                        <span className="text-muted-foreground">Calls:</span>{' '}
                                        <span className="font-medium">{keledon.callsHandled}</span>
                                    </div>
                                )}
                            </div>

                            {isSuperAdmin && (
                                <div className="mb-4 p-3 bg-muted rounded-lg">
                                    <p className="text-xs text-muted-foreground mb-2">Pairing Code</p>
                                    <div className="flex items-center gap-2">
                                        <code className="flex-1 font-mono text-sm">{'XXXX-XXXX'}</code>
                                        <button
                                            onClick={() => copyPairingCode('manual', keledon.id)}
                                            className="p-1 hover:bg-background rounded"
                                            title="Copy code"
                                        >
                                            {copiedId === keledon.id ? (
                                                <Check className="w-4 h-4 text-green-500" />
                                            ) : (
                                                <Copy className="w-4 h-4" />
                                            )}
                                        </button>
                                    </div>
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
                                {launching === keledon.id ? 'Launching...' : 'Launch'}
                            </button>
                        </div>
                    ))}
                </div>
            )}

            <div className="mt-8 p-4 bg-muted/50 rounded-lg">
                <h3 className="font-medium mb-2">How it works</h3>
                <ol className="text-sm text-muted-foreground space-y-1">
                    <li>1. Click Launch on a Keledon</li>
                    <li>2. The Keledon desktop app will open</li>
                    <li>3. It will automatically pair and connect</li>
                    <li>4. The Keledon is now live and ready to receive tasks</li>
                </ol>
            </div>
        </div>
    );
}