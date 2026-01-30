import { useState, useEffect } from 'react';
import { Phone, CheckCircle, AlertTriangle, Clock, Building2, LayoutGrid } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

const statusStyles: Record<string, string> = {
    active: 'bg-green-500/10 text-green-500 border-green-500/20',
    completed: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    escalated: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
};

export default function DashboardPage() {
    const { user } = useAuth();
    const [sessions, setSessions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState([
        { label: 'Active Now', value: 0, icon: Phone, color: 'text-green-500' },
        { label: 'Completed Today', value: 0, icon: CheckCircle, color: 'text-blue-500' },
        { label: 'Escalated', value: 0, icon: AlertTriangle, color: 'text-yellow-500' },
    ]);
    const [aggregatedData, setAggregatedData] = useState<any[]>([]);

    useEffect(() => {
        if (user) {
            fetchData();
            const interval = setInterval(fetchData, 10000); // 10s refresh
            return () => clearInterval(interval);
        }
    }, [user]);

    async function fetchData() {
        try {
            if (!supabase || !user) return;

            // 1. Determine time range (Today)
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            // 2. Build Query
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
                .gte('created_at', today.toISOString())
                .order('created_at', { ascending: false });

            // RBAC Filtering
            if (user.role === 'admin' || user.role === 'coordinator') {
                if (user.company_id) {
                    // For Admin, we MUST join to users to filter by company_id. 
                    // Switch to !inner to enforce filter
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
                        .gte('created_at', today.toISOString())
                        .eq('users.company_id', user.company_id)
                        .order('created_at', { ascending: false });
                }
            } else if (user.role === 'user' || user.role === 'agent') {
                query = query.eq('user_id', user.id);
            }

            const { data, error } = await query;
            if (error) throw error;

            const fetchedSessions = data || [];

            // Only show last 10 in the list, but calculate stats from ALL "today" sessions
            setSessions(fetchedSessions);

            // 3. Calculate Stats
            const active = fetchedSessions.filter(s => s.status === 'active').length;
            const completed = fetchedSessions.filter(s => s.status === 'completed').length;
            const escalated = fetchedSessions.filter(s => s.status === 'escalated').length;

            setStats([
                { label: 'Active Now', value: active, icon: Phone, color: 'text-green-500' },
                { label: 'Completed Today', value: completed, icon: CheckCircle, color: 'text-blue-500' },
                { label: 'Escalated', value: escalated, icon: AlertTriangle, color: 'text-yellow-500' },
            ]);

            // 4. Calculate Aggregations
            calculateAggregation(fetchedSessions, user.role);

        } catch (err) {
            console.error('Error fetching dashboard data:', err);
        } finally {
            setLoading(false);
        }
    }

    function calculateAggregation(data: any[], role: string) {
        if (role === 'superadmin') {
            // Group by Client (Company)
            const groups: Record<string, any> = {};

            data.forEach(s => {
                const companyName = s.users?.companies?.name || 'Unknown Client';
                if (!groups[companyName]) {
                    groups[companyName] = {
                        name: companyName,
                        active: 0,
                        completed: 0,
                        escalated: 0,
                        totalDuration: 0,
                        count: 0
                    };
                }
                groups[companyName].count++;
                if (s.status === 'active') groups[companyName].active++;
                if (s.status === 'completed') groups[companyName].completed++;
                if (s.status === 'escalated') groups[companyName].escalated++;
                groups[companyName].totalDuration += (s.duration || 0);
            });

            setAggregatedData(Object.values(groups));

        } else if (role === 'admin' || role === 'coordinator') {
            // Group by Brand/Team
            const groups: Record<string, any> = {};

            data.forEach(s => {
                const brand = s.users?.teams?.brands?.name || 'Unknown Brand';
                const team = s.users?.teams?.name || 'Unknown Team';
                const key = `${brand} - ${team}`;

                if (!groups[key]) {
                    groups[key] = {
                        name: key,
                        brand,
                        team,
                        active: 0,
                        completed: 0,
                        escalated: 0,
                        totalDuration: 0,
                        count: 0
                    };
                }
                groups[key].count++;
                if (s.status === 'active') groups[key].active++;
                if (s.status === 'completed') groups[key].completed++;
                if (s.status === 'escalated') groups[key].escalated++;
                groups[key].totalDuration += (s.duration || 0);
            });

            setAggregatedData(Object.values(groups));
        } else {
            setAggregatedData([]);
        }
    }

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">
                        {user?.role === 'user' ? `Hello, ${user.name.split(' ')[0]}` : 'Dashboard'}
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        {user?.role === 'user'
                            ? "Here's your activity for today"
                            : "System configuration and real-time monitoring"}
                    </p>
                </div>
                <div className="flex gap-2 text-sm text-muted-foreground bg-muted/50 px-3 py-1 rounded-md border border-border">
                    <Clock className="w-4 h-4" />
                    Today's Stats
                </div>
            </div>

            {/* Stats Cards - Global/Personal Context */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {stats.map((stat) => (
                    <div
                        key={stat.label}
                        className="p-6 rounded-xl bg-card border border-border hover:border-primary/20 transition-all shadow-sm"
                    >
                        <div className="flex items-center gap-4">
                            <div className={cn('p-3 rounded-lg bg-background border border-border', stat.color)}>
                                <stat.icon className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-3xl font-bold text-foreground">{stat.value}</p>
                                <p className="text-sm text-muted-foreground">{stat.label}</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Aggregation Table (Super Admin & Admin) */}
            {aggregatedData.length > 0 && (
                <div className="space-y-4">
                    <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                        {user?.role === 'superadmin' ? <Building2 className="w-5 h-5" /> : <LayoutGrid className="w-5 h-5" />}
                        {user?.role === 'superadmin' ? 'Client Overview' : 'Campaign Performance'}
                    </h2>
                    <div className="rounded-xl border border-border bg-card overflow-hidden">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-border text-left text-sm text-muted-foreground bg-muted/30">
                                    <th className="px-5 py-3 font-medium">
                                        {user?.role === 'superadmin' ? 'CLIENT' : 'BRAND / TEAM'}
                                    </th>
                                    <th className="px-5 py-3 font-medium text-center">ACTIVE</th>
                                    <th className="px-5 py-3 font-medium text-center">COMPLETED</th>
                                    <th className="px-5 py-3 font-medium text-center">ESCALATED</th>
                                    <th className="px-5 py-3 font-medium text-right">AVG DURATION</th>
                                </tr>
                            </thead>
                            <tbody>
                                {aggregatedData.map((row, i) => (
                                    <tr key={i} className="border-b border-border hover:bg-muted/50 transition-colors">
                                        <td className="px-5 py-3 font-medium text-foreground">
                                            {row.name}
                                        </td>
                                        <td className="px-5 py-3 text-center">
                                            {row.active > 0 ? (
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-500/10 text-green-500">
                                                    {row.active}
                                                </span>
                                            ) : '-'}
                                        </td>
                                        <td className="px-5 py-3 text-center text-muted-foreground">{row.completed}</td>
                                        <td className="px-5 py-3 text-center">
                                            {row.escalated > 0 ? (
                                                <span className="text-yellow-500 font-medium">{row.escalated}</span>
                                            ) : '-'}
                                        </td>
                                        <td className="px-5 py-3 text-right text-muted-foreground font-mono">
                                            {row.completed > 0
                                                ? `${Math.floor((row.totalDuration / row.count) / 60)}m ${Math.floor((row.totalDuration / row.count) % 60)}s`
                                                : '-'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Recent Live Sessions (Everyone) */}
            <div className="space-y-4">
                <div className="flex justify-between items-center">
                    <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                        Recent Live Activity
                    </h2>
                    <button
                        onClick={() => window.location.href = '/sessions'}
                        className="text-sm text-primary hover:underline font-medium"
                    >
                        View All History &rarr;
                    </button>
                </div>

                <div className="rounded-xl border border-border bg-card overflow-hidden">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-border text-left text-sm text-muted-foreground">
                                <th className="px-4 py-3 font-medium">SESSION</th>
                                <th className="px-4 py-3 font-medium">CALLER</th>
                                <th className="px-4 py-3 font-medium">STATUS</th>
                                <th className="px-4 py-3 font-medium">INTENT</th>
                                <th className="px-4 py-3 font-medium">DURATION</th>
                                <th className="px-4 py-3 font-medium text-right">ACTIONS</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={6} className="text-center py-8 text-muted-foreground">Loading...</td></tr>
                            ) : sessions.length === 0 ? (
                                <tr><td colSpan={6} className="text-center py-8 text-muted-foreground">No sessions today</td></tr>
                            ) : sessions.slice(0, 5).map((session) => (
                                <tr key={session.id} className="border-b border-border hover:bg-muted/50 transition-colors">
                                    <td className="px-4 py-3 font-mono text-sm text-muted-foreground">
                                        {session.id.slice(0, 8)}
                                        {session.status === 'active' && <span className="ml-2 inline-block w-2 h-2 rounded-full bg-green-500 animate-pulse" />}
                                    </td>
                                    <td className="px-4 py-3 text-sm">{session.caller_id || 'Unknown'}</td>
                                    <td className="px-4 py-3">
                                        <span className={cn('px-2 py-0.5 rounded-full text-xs border uppercase', statusStyles[session.status])}>
                                            {session.status}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-sm text-foreground">{session.intent}</td>
                                    <td className="px-4 py-3 text-sm text-muted-foreground font-mono">
                                        {Math.floor((session.duration || 0) / 60)}:{((session.duration || 0) % 60).toString().padStart(2, '0')}
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <button
                                            onClick={() => window.location.href = `/sessions/${session.id}`}
                                            className="text-primary hover:underline text-sm"
                                        >
                                            View
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
