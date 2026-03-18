import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Filter, RefreshCw, Radio } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';

export default function SessionsLivePage() {
    const { user } = useAuth();
    const [sessions, setSessions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedCompany, setSelectedCompany] = useState<string>('');
    const [selectedUser, setSelectedUser] = useState<string>('');
    const [companies, setCompanies] = useState<any[]>([]);
    const [users, setUsers] = useState<any[]>([]);

    useEffect(() => {
        if (user) {
            fetchSessions();
            if (user.role === 'superadmin') {
                fetchFilterOptions();
            }
        }
    }, [user]);

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
                .eq('status', 'active')
                .order('created_at', { ascending: false });

            if (user.role === 'superadmin') {
                // No filter
            } else if (user.role === 'admin' || user.role === 'coordinator') {
                if (user.company_id) {
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
                        .eq('status', 'active')
                        .order('created_at', { ascending: false });
                }
            } else if (user.role === 'user' || user.role === 'agent') {
                const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
                if (uuidRegex.test(user.id)) {
                    query = query.eq('user_id', user.id);
                } else {
                    setSessions([]);
                    setLoading(false);
                    return;
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

    const filteredSessions = sessions.filter(session => {
        if (user?.role !== 'superadmin') return true;
        const sessionUser = session.users;
        if (selectedCompany && sessionUser?.company_id !== selectedCompany) return false;
        if (selectedUser && session.user_id !== selectedUser) return false;
        return true;
    });

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-2">
                <Radio className="w-5 h-5 text-green-500 animate-pulse" />
                <h1 className="text-2xl font-bold text-foreground">Live Sessions</h1>
                <span className="px-2 py-1 bg-green-500/10 text-green-500 text-xs rounded-full">
                    {filteredSessions.length} active
                </span>
            </div>

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
                    <button onClick={fetchSessions} className="ml-auto p-2 hover:bg-muted rounded-full" title="Refresh">
                        <RefreshCw className="w-4 h-4" />
                    </button>
                </div>
            )}

            <div className="rounded-xl border border-border bg-card overflow-hidden">
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-border text-left text-sm text-muted-foreground">
                            <th className="px-4 py-3 font-medium">SESSION ID</th>
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
                            <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">Loading sessions...</td></tr>
                        ) : filteredSessions.length === 0 ? (
                            <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">No active sessions</td></tr>
                        ) : filteredSessions.map(session => {
                            const sessionUser = session.users;
                            const companyName = sessionUser?.companies?.name || '—';
                            const brandName = sessionUser?.teams?.brands?.name || '—';
                            const userName = sessionUser?.name || 'Unknown';
                            return (
                                <tr key={session.id} className="border-b border-border hover:bg-muted/50">
                                    <td className="px-4 py-3 font-mono text-sm">{session.id.slice(0, 8)}</td>
                                    <td className="px-4 py-3 text-sm">{companyName}</td>
                                    <td className="px-4 py-3 text-sm">{brandName}</td>
                                    <td className="px-4 py-3 text-sm">{userName}</td>
                                    <td className="px-4 py-3 text-sm">{session.intent || '—'}</td>
                                    <td className="px-4 py-3 text-sm text-muted-foreground">{session.duration}s</td>
                                    <td className="px-4 py-3">
                                        <a href={`/sessions/${session.id}`} className="text-primary hover:underline text-sm">View Details</a>
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
