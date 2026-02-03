import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Filter, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';

export default function SessionsPage() {
    const { user } = useAuth();
    const [sessions, setSessions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'live' | 'history'>('history');

    // Filters for Super Admin
    const [selectedCompany, setSelectedCompany] = useState<string>('');
    const [selectedUser, setSelectedUser] = useState<string>('');

    // Filter Options
    const [companies, setCompanies] = useState<any[]>([]);
    const [users, setUsers] = useState<any[]>([]);

    useEffect(() => {
        if (user) {
            fetchSessions();
            if (user.role === 'superadmin') {
                fetchFilterOptions();
            }
        }
    }, [activeTab, user]); // Refetch when tab or user changes (e.g. simulation)

    // Effect to apply local filters when dropdowns change (if we fetch all)
    // OR we can refetch. For simplicity and RBAC safety, let's refetch or filter locally.
    // Given the requirement "Super Admin needs filters", doing it client-side after fetching ALL (or filtered list) is easier for now.
    // But better to verify access.

    async function fetchFilterOptions() {
        if (!supabase) return;
        const { data: c } = await supabase.from('companies').select('id, name');
        if (c) setCompanies(c);

        const { data: u } = await supabase.from('users').select('id, name, company_id');
        if (u) setUsers(u);
    }

    async function fetchSessions() {
        setLoading(true);
        try {
            if (!supabase || !user) return;

            // Base query with joins
            // We join users to get context.
            // users!left to include sessions without users (if any, though rare)
            // But for RBAC, !inner might be safer for Admin/User roles.
            // SuperAdmin can see all.

            let query = supabase
                .from('sessions')
                .select(`
                    *,
                    users!left (
                        id,
                        name,
                        email,
                        company_id,
                        companies:companies(name),
                        teams:teams(name, brands(name))
                    )
                `)
                .order('created_at', { ascending: false });

            // 1. Tab Filter
            if (activeTab === 'live') {
                query = query.eq('status', 'active');
            } else {
                query = query.neq('status', 'active');
            }

            // 2. RBAC Filter
            if (user.role === 'superadmin') {
                // No implicit filter
            } else if (user.role === 'admin' || user.role === 'coordinator') {
                if (user.company_id) {
                    // Filter by users belonging to my company
                    // Note: This requires filtering on the joined table 'users'.
                    // Supabase syntax for this: !inner is required to filter on joined table.
                    // So we must switch to !inner if we are Admin.
                    query = supabase
                        .from('sessions')
                        .select(`
                            *,
                            users!inner (
                                id,
                                name,
                                email,
                                company_id,
                                companies:companies(name),
                                teams:teams(name, brands(name))
                            )
                        `)
                        .eq('users.company_id', user.company_id)
                        .order('created_at', { ascending: false });

                    // Re-apply tab filter to new query object
                    if (activeTab === 'live') {
                        query = query.eq('status', 'active');
                    } else {
                        query = query.neq('status', 'active');
                    }
                }
            } else if (user.role === 'user' || user.role === 'agent') {
                // Filter by my user_id
                const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(user.id);
                if (isUuid) {
                    query = query.eq('user_id', user.id);
                } else {
                    // Fallback for demo users (non-uuid): don't match anything or match dummy
                    query = query.eq('user_id', '00000000-0000-0000-0000-000000000000');
                }
            }

            const { data, error } = await query;

            if (error) throw error;
            setSessions(data || []);

        } catch (error) {
            console.error('Error fetching sessions:', error);
        } finally {
            setLoading(false);
        }
    }

    // Apply client-side filters for Super Admin
    const filteredSessions = sessions.filter(session => {
        if (user?.role !== 'superadmin') return true;

        const sessionUser = session.users;
        const companyId = sessionUser?.company_id;

        // teams(name, brands(name)) -> brands is object if single relation? Teams usually belong to 1 brand?
        // Schema: teams -> brand_id. One to many. Team belongs to one brand.
        // So brands is single object.

        // Adjust for select structure: teams(brands(id))?
        // My select was: teams(name, brands(name))
        // Client side filtering by ID requires fetching ID in select.
        // I will assume name matching or update select.
        // Let's match by NAME or ID if I fetch ID. 
        // I'll update the filter logic to be simple for now.

        if (selectedCompany && companyId !== selectedCompany) return false;
        // Brand filter might require brand_id in select.
        // For now, let's skip strict brand ID filtering unless I fetch it.
        // Or I can filter by User ID.
        if (selectedUser && session.user_id !== selectedUser) return false;

        return true;
    });

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h1 className="text-2xl font-bold text-foreground">Sessions History</h1>

                {/* Tabs */}
                <div className="flex p-1 bg-muted rounded-lg">
                    <button
                        onClick={() => setActiveTab('live')}
                        className={cn(
                            "px-4 py-2 text-sm font-medium rounded-md transition-all",
                            activeTab === 'live' ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        <span className="flex items-center gap-2">
                            <div className={cn("w-2 h-2 rounded-full", activeTab === 'live' ? "bg-green-500 animate-pulse" : "bg-transparent")} />
                            Live
                        </span>
                    </button>
                    <button
                        onClick={() => setActiveTab('history')}
                        className={cn(
                            "px-4 py-2 text-sm font-medium rounded-md transition-all",
                            activeTab === 'history' ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        History
                    </button>
                </div>
            </div>

            {/* Filters (Super Admin Only) */}
            {user?.role === 'superadmin' && (
                <div className="flex flex-wrap gap-4 p-4 bg-card border border-border rounded-xl">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Filter className="w-4 h-4" />
                        <span>Filters:</span>
                    </div>

                    <select
                        className="bg-background border border-border rounded-md px-3 py-1.5 text-sm"
                        value={selectedCompany}
                        onChange={(e) => setSelectedCompany(e.target.value)}
                    >
                        <option value="">All Companies</option>
                        {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>

                    <select
                        className="bg-background border border-border rounded-md px-3 py-1.5 text-sm"
                        value={selectedUser}
                        onChange={(e) => setSelectedUser(e.target.value)}
                    >
                        <option value="">All Users</option>
                        {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                    </select>

                    <button
                        onClick={fetchSessions}
                        className="ml-auto p-2 hover:bg-muted rounded-full"
                        title="Refresh"
                    >
                        <RefreshCw className="w-4 h-4" />
                    </button>
                </div>
            )}

            <div className="rounded-xl border border-border bg-card overflow-hidden">
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-border text-left text-sm text-muted-foreground">
                            <th className="px-4 py-3 font-medium">SESSION ID</th>
                            <th className="px-4 py-3 font-medium">STATUS</th>
                            <th className="px-4 py-3 font-medium">CLIENT</th>
                            <th className="px-4 py-3 font-medium">BRAND</th>
                            <th className="px-4 py-3 font-medium">USER</th>
                            <th className="px-4 py-3 font-medium">INTENT</th>
                            <th className="px-4 py-3 font-medium">DURATION</th>
                            <th className="px-4 py-3 font-medium">ACTIONS</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={8} className="p-8 text-center text-muted-foreground">Loading sessions...</td></tr>
                        ) : filteredSessions.length === 0 ? (
                            <tr><td colSpan={8} className="p-8 text-center text-muted-foreground">No sessions found</td></tr>
                        ) : filteredSessions.map(session => {
                            // Extract join data safely
                            const user = session.users;
                            const companyName = user?.companies?.name || '—';
                            const brandName = user?.teams?.brands?.name || '—';
                            const userName = user?.name || 'Unknown';

                            return (
                                <tr key={session.id} className="border-b border-border hover:bg-muted/50">
                                    <td className="px-4 py-3 font-mono text-sm">{session.id.slice(0, 8)}</td>
                                    <td className="px-4 py-3">
                                        <span className={cn('px-2 py-1 rounded-full text-xs capitalize',
                                            session.status === 'active' ? 'bg-green-500/10 text-green-500 border border-green-500/20' :
                                                session.status === 'completed' ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20' :
                                                    'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20')}>
                                            {session.status}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-sm">{companyName}</td>
                                    <td className="px-4 py-3 text-sm">{brandName}</td>
                                    <td className="px-4 py-3 text-sm flex items-center gap-2">
                                        {user?.avatar && <img src={user.avatar} className="w-5 h-5 rounded-full" />}
                                        {userName}
                                    </td>
                                    <td className="px-4 py-3 text-sm">{session.intent}</td>
                                    <td className="px-4 py-3 text-sm text-muted-foreground">{session.duration}s</td>
                                    <td className="px-4 py-3">
                                        <button
                                            onClick={() => window.location.href = `/sessions/${session.id}`}
                                            className="text-primary hover:underline text-sm"
                                        >
                                            View Details
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
