import { useEffect, useState } from 'react';
import { Play, Globe, Headphones, AlertCircle, Building2, Layers, UserCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { getTeamInterfaces, getTeamDetails, type ManagedInterface } from '@/lib/supabase';
import { cn } from '@/lib/utils';

export default function LaunchAgentPage() {
    const { user, isActuallySuperAdmin } = useAuth();
    const [interfaces, setInterfaces] = useState<ManagedInterface[]>([]);
    const [teamInfo, setTeamInfo] = useState<any>(null);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [isLoading, setIsLoading] = useState(true);

    // Organization selection state
    const [selectedCompany, setSelectedCompany] = useState<string>('');
    const [selectedBrand, setSelectedBrand] = useState<string>('');
    const [selectedTeam, setSelectedTeam] = useState<string>('');

    // Mock data (to be replaced by real API calls later)
    const mockCompanies = [
        { id: 'comp-1', name: 'Acme Corp' },
        { id: 'comp-2', name: 'Keldon Retail' },
    ];
    const mockBrands = [
        { id: 'brand-1', company_id: 'comp-1', name: 'Tech Division' },
        { id: 'brand-2', company_id: 'comp-2', name: 'Retail Solutions' },
    ];
    const mockTeams = [
        { id: 'team-1', brand_id: 'brand-1', name: 'Support Team A' },
        { id: 'team-2', brand_id: 'brand-2', name: 'Sales Ops' },
    ];

    useEffect(() => {
        async function loadData() {
            if (!user) return;
            setIsLoading(true);
            try {
                let data: ManagedInterface[] = [];
                let teamData: any = null;

                // Only query DB if it looks like a valid UUID to avoid Postgres 400 errors
                const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(user.team_id || '');

                if (user.team_id && isUuid) {
                    // Parallel fetch
                    const [ifaces, tDetails] = await Promise.all([
                        getTeamInterfaces(user.team_id).catch(_ => []),
                        getTeamDetails(user.team_id).catch(_ => null)
                    ]);
                    data = ifaces;
                    teamData = tDetails;
                }

                // fallback for demo user
                if ((data.length === 0 || !teamData) && (user.email.includes('demo') || isActuallySuperAdmin)) {
                    if (data.length === 0) {
                        data = [
                            { id: '1', name: 'Genesys Cloud', base_url: '', status: 'connected', icon: 'headphones' },
                            { id: '2', name: 'Salesforce', base_url: '', status: 'connected', icon: 'globe' }
                        ];
                    }
                    // Mock team info if missing
                    if (!teamData) {
                        teamData = {
                            name: 'Demo Team',
                            brands: {
                                name: 'Keldon Retail',
                                companies: {
                                    name: 'Acme Corp'
                                }
                            }
                        };
                    }
                }

                setInterfaces(data);
                setTeamInfo(teamData);
                // Default: Select all connected ones
                setSelectedIds(new Set(data.filter(i => i.status === 'connected').map(i => i.id)));

            } catch (error) {
                console.error('Failed to load launch data:', error);
            } finally {
                setIsLoading(false);
            }
        }

        loadData();
    }, [user, isActuallySuperAdmin]);

    const toggleSelection = (id: string) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        setSelectedIds(newSet);
    };

    const handleLaunch = () => {
        const selected = interfaces.filter(i => selectedIds.has(i.id));
        console.log("Launching with interfaces:", selected);
        // TODO: Trigger actual session launch
        alert(`Launching Agent with: ${selected.map(i => i.name).join(', ')}`);
    };

    const getIcon = (iconName?: string) => {
        if (iconName === 'globe') return <Globe className="w-6 h-6 text-blue-400" />;
        return <Headphones className="w-6 h-6 text-blue-500" />;
    };

    return (
        <div className="flex flex-col items-center justify-center h-[calc(100vh-4rem)] space-y-8 max-w-4xl mx-auto px-4">

            {/* Organization Selector */}
            {!isLoading && (
                <div className="space-y-4 mb-6">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <UserCircle className="w-3 h-3" />
                        <span className="font-semibold text-foreground">{user?.name || 'User'}</span>
                    </div>

                    {/* Company, Brand, Team Row */}
                    <div className="grid grid-cols-3 gap-4">
                        {/* Company Selector */}
                        <div>
                            <label className="block text-sm font-medium text-foreground mb-2">Company</label>
                            <select
                                value={selectedCompany || ''}
                                onChange={(e) => {
                                    setSelectedCompany(e.target.value);
                                    // Reset brand/team when company changes
                                    setSelectedBrand('');
                                    setSelectedTeam('');
                                }}
                                className="w-full px-3 py-2 border border-border rounded-lg bg-muted/50 focus:border-primary/50 focus:ring-1 focus:ring-primary/50 outline-none"
                            >
                                <option value="">Select company</option>
                                {mockCompanies.map(comp => (
                                    <option key={comp.id} value={comp.id}>{comp.name}</option>
                                ))}
                            </select>
                        </div>

                        {/* Brand Selector */}
                        <div>
                            <label className="block text-sm font-medium text-foreground mb-2">Brand</label>
                            <select
                                value={selectedBrand || ''}
                                onChange={(e) => {
                                    setSelectedBrand(e.target.value);
                                    setSelectedTeam('');
                                }}
                                disabled={!selectedCompany}
                                className="w-full px-3 py-2 border border-border rounded-lg bg-muted/50 focus:border-primary/50 focus:ring-1 focus:ring-primary/50 outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <option value="">Select brand</option>
                                {mockBrands
                                    .filter(b => b.company_id === selectedCompany)
                                    .map(brand => (
                                        <option key={brand.id} value={brand.id}>{brand.name}</option>
                                    ))}
                            </select>
                        </div>

                        {/* Team Selector */}
                        <div>
                            <label className="block text-sm font-medium text-foreground mb-2">Team</label>
                            <select
                                value={selectedTeam || ''}
                                onChange={(e) => setSelectedTeam(e.target.value)}
                                disabled={!selectedBrand}
                                className="w-full px-3 py-2 border border-border rounded-lg bg-muted/50 focus:border-primary/50 focus:ring-1 focus:ring-primary/50 outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <option value="">Select team</option>
                                {mockTeams
                                    .filter(t => t.brand_id === selectedBrand)
                                    .map(team => (
                                        <option key={team.id} value={team.id}>{team.name}</option>
                                    ))}
                            </select>
                        </div>
                    </div>
                </div>
            )}

            <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <Play className="w-8 h-8 text-primary" />
                </div>
                <h1 className="text-4xl font-bold tracking-tight text-foreground">Launch Your Agent</h1>
                <p className="text-xl text-muted-foreground max-w-2xl">
                    Select the active integrations for this session.
                </p>
            </div>

            {isLoading ? (
                <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
            ) : (
                <div className="grid md:grid-cols-2 gap-6 w-full">
                    {interfaces.map((iface) => {
                        const isSelected = selectedIds.has(iface.id);
                        return (
                            <div
                                key={iface.id}
                                onClick={() => toggleSelection(iface.id)}
                                className={cn(
                                    "group relative p-6 bg-card border rounded-xl transition-all cursor-pointer shadow-sm",
                                    isSelected
                                        ? "border-primary ring-1 ring-primary shadow-md bg-primary/5"
                                        : "border-border hover:border-primary/50 hover:shadow-md"
                                )}
                            >
                                <div className="flex items-center gap-4 mb-4">
                                    <div className={cn("p-3 rounded-lg transition-colors", isSelected ? "bg-primary/20" : "bg-muted")}>
                                        {getIcon(iface.icon)}
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-lg">{iface.name}</h3>
                                        <p className="text-sm text-muted-foreground">{iface.name.includes('Salesforce') ? 'CRM Integration' : 'Voice & Digital Options'}</p>
                                    </div>
                                    <div className="ml-auto">
                                        <div className={cn(
                                            "w-6 h-6 rounded-full border flex items-center justify-center transition-colors",
                                            isSelected ? "bg-primary border-primary" : "border-muted-foreground/30"
                                        )}>
                                            {isSelected && <div className="w-2.5 h-2.5 bg-primary-foreground rounded-full" />}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-green-600 bg-green-500/10 w-fit px-2 py-1 rounded">
                                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                                    {iface.status === 'connected' ? 'Connected' : iface.status}
                                </div>
                            </div>
                        );
                    })}

                    {interfaces.length === 0 && (
                        <div className="col-span-2 p-6 border border-dashed border-muted-foreground/30 rounded-xl flex flex-col items-center justify-center text-muted-foreground">
                            <AlertCircle className="w-8 h-8 mb-2 opacity-50" />
                            <p>No interfaces configured for your team.</p>
                        </div>
                    )}
                </div>
            )}

            <div className="w-full pt-8 border-t border-border mt-8">
                <button
                    onClick={handleLaunch}
                    disabled={selectedIds.size === 0 || isLoading}
                    className={cn(
                        "w-full py-4 rounded-xl font-bold text-lg transition-all shadow-lg flex items-center justify-center gap-2",
                        selectedIds.size > 0
                            ? "bg-primary text-primary-foreground hover:bg-primary/90"
                            : "bg-muted text-muted-foreground cursor-not-allowed"
                    )}
                >
                    <Play className="w-5 h-5 fill-current" />
                    {selectedIds.size > 0 ? `Launch Session (${selectedIds.size} Active)` : 'Select Interfaces to Launch'}
                </button>
                <p className="text-center text-xs text-muted-foreground mt-4">
                    By launching, you accept the <span className="underline cursor-pointer">Operational Principles</span> for autonomous agents.
                </p>
            </div>
        </div>
    );
}
