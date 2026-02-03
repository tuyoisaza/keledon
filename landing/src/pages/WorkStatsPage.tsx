import { useState, useEffect } from 'react';
import { Phone, Clock, TrendingUp, Users, Target, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

interface AgentStats {
    name: string;
    calls: number;
    avgDuration: number;
    completed: number;
    escalated: number;
    fcr: number; // First Call Resolution %
}

export default function WorkStatsPage() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [dateRange, setDateRange] = useState<'today' | 'week' | 'month'>('today');

    // Aggregate Stats
    const [totalCalls, setTotalCalls] = useState(0);
    const [avgHandleTime, setAvgHandleTime] = useState(0);
    const [fcrRate, setFcrRate] = useState(0);
    const [escalationRate, setEscalationRate] = useState(0);

    // Agent Breakdown
    const [agentStats, setAgentStats] = useState<AgentStats[]>([]);

    useEffect(() => {
        let isMounted = true;

        async function fetchStats() {
            if (!supabase || !user) return;
            setLoading(true);

            try {
                // Calculate date range
                const now = new Date();
                let startDate = new Date();
                if (dateRange === 'today') {
                    startDate.setHours(0, 0, 0, 0);
                } else if (dateRange === 'week') {
                    startDate.setDate(now.getDate() - 7);
                } else {
                    startDate.setMonth(now.getMonth() - 1);
                }

                // Build query with RBAC
                let query = supabase
                    .from('sessions')
                    .select(`
                        *,
                        users!left (
                            id,
                            name,
                            company_id
                        )
                    `)
                    .gte('created_at', startDate.toISOString())
                    .order('created_at', { ascending: false });

                // RBAC filtering
                if (user.role === 'admin' || user.role === 'coordinator') {
                    if (user.company_id) {
                        query = query.eq('users.company_id', user.company_id);
                    }
                } else if (user.role === 'user' || user.role === 'agent') {
                    query = query.eq('user_id', user.id);
                }

                const { data, error } = await query;
                if (error) throw error;
                if (!isMounted) return;

                const sessions = data || [];

                // Calculate aggregate stats
                setTotalCalls(sessions.length);

                const totalDuration = sessions.reduce((sum, s) => sum + (s.duration || 0), 0);
                setAvgHandleTime(sessions.length > 0 ? Math.round(totalDuration / sessions.length) : 0);

                const completed = sessions.filter(s => s.status === 'completed').length;
                const escalated = sessions.filter(s => s.status === 'escalated').length;

                setFcrRate(sessions.length > 0 ? Math.round((completed / sessions.length) * 100) : 0);
                setEscalationRate(sessions.length > 0 ? Math.round((escalated / sessions.length) * 100) : 0);

                // Agent-level breakdown (for admins)
                if (user.role === 'superadmin' || user.role === 'admin' || user.role === 'coordinator') {
                    const agentMap: Record<string, AgentStats> = {};

                    sessions.forEach(s => {
                        const agentName = s.users?.name || 'Unknown';
                        if (!agentMap[agentName]) {
                            agentMap[agentName] = {
                                name: agentName,
                                calls: 0,
                                avgDuration: 0,
                                completed: 0,
                                escalated: 0,
                                fcr: 0
                            };
                        }
                        agentMap[agentName].calls++;
                        agentMap[agentName].avgDuration += (s.duration || 0);
                        if (s.status === 'completed') agentMap[agentName].completed++;
                        if (s.status === 'escalated') agentMap[agentName].escalated++;
                    });

                    // Calculate averages
                    Object.values(agentMap).forEach(agent => {
                        agent.avgDuration = agent.calls > 0 ? Math.round(agent.avgDuration / agent.calls) : 0;
                        agent.fcr = agent.calls > 0 ? Math.round((agent.completed / agent.calls) * 100) : 0;
                    });

                    setAgentStats(Object.values(agentMap).sort((a, b) => b.calls - a.calls));
                } else {
                    setAgentStats([]);
                }

            } catch (err) {
                console.error('Error fetching work stats:', err);
            } finally {
                if (isMounted) setLoading(false);
            }
        }

        fetchStats();
        return () => { isMounted = false; };
    }, [user, dateRange]);

    const formatDuration = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}m ${secs}s`;
    };

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Work Stats</h1>
                    <p className="text-muted-foreground mt-1">Agent productivity and performance metrics</p>
                </div>

                {/* Date Range Selector */}
                <div className="flex p-1 bg-muted rounded-lg">
                    {(['today', 'week', 'month'] as const).map(range => (
                        <button
                            key={range}
                            onClick={() => setDateRange(range)}
                            className={cn(
                                "px-4 py-2 text-sm font-medium rounded-md transition-all capitalize",
                                dateRange === range
                                    ? "bg-background text-foreground shadow-sm"
                                    : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            {range}
                        </button>
                    ))}
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="p-6 rounded-xl bg-card border border-border">
                    <div className="flex items-center justify-between">
                        <div className="p-3 rounded-lg bg-blue-500/10 text-blue-500">
                            <Phone className="w-6 h-6" />
                        </div>
                    </div>
                    <p className="mt-4 text-3xl font-bold text-foreground">{totalCalls}</p>
                    <p className="text-sm text-muted-foreground">Total Calls</p>
                </div>

                <div className="p-6 rounded-xl bg-card border border-border">
                    <div className="flex items-center justify-between">
                        <div className="p-3 rounded-lg bg-purple-500/10 text-purple-500">
                            <Clock className="w-6 h-6" />
                        </div>
                    </div>
                    <p className="mt-4 text-3xl font-bold text-foreground">{formatDuration(avgHandleTime)}</p>
                    <p className="text-sm text-muted-foreground">Avg Handle Time (AHT)</p>
                </div>

                <div className="p-6 rounded-xl bg-card border border-border">
                    <div className="flex items-center justify-between">
                        <div className="p-3 rounded-lg bg-green-500/10 text-green-500">
                            <Target className="w-6 h-6" />
                        </div>
                        {fcrRate >= 80 && <ArrowUpRight className="w-5 h-5 text-green-500" />}
                    </div>
                    <p className="mt-4 text-3xl font-bold text-foreground">{fcrRate}%</p>
                    <p className="text-sm text-muted-foreground">First Call Resolution</p>
                </div>

                <div className="p-6 rounded-xl bg-card border border-border">
                    <div className="flex items-center justify-between">
                        <div className="p-3 rounded-lg bg-yellow-500/10 text-yellow-500">
                            <TrendingUp className="w-6 h-6" />
                        </div>
                        {escalationRate > 15 && <ArrowDownRight className="w-5 h-5 text-red-500" />}
                    </div>
                    <p className="mt-4 text-3xl font-bold text-foreground">{escalationRate}%</p>
                    <p className="text-sm text-muted-foreground">Escalation Rate</p>
                </div>
            </div>

            {/* Agent Breakdown Table (Admins only) */}
            {agentStats.length > 0 && (
                <div className="space-y-4">
                    <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                        <Users className="w-5 h-5" />
                        Agent Performance
                    </h2>
                    <div className="rounded-xl border border-border bg-card overflow-hidden">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-border text-left text-sm text-muted-foreground bg-muted/30">
                                    <th className="px-5 py-3 font-medium">AGENT</th>
                                    <th className="px-5 py-3 font-medium text-center">CALLS</th>
                                    <th className="px-5 py-3 font-medium text-center">AVG HANDLE TIME</th>
                                    <th className="px-5 py-3 font-medium text-center">FCR %</th>
                                    <th className="px-5 py-3 font-medium text-center">ESCALATED</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr><td colSpan={5} className="text-center py-8 text-muted-foreground">Loading...</td></tr>
                                ) : agentStats.map((agent, i) => (
                                    <tr key={i} className="border-b border-border hover:bg-muted/50">
                                        <td className="px-5 py-3 font-medium text-foreground">{agent.name}</td>
                                        <td className="px-5 py-3 text-center">{agent.calls}</td>
                                        <td className="px-5 py-3 text-center font-mono text-muted-foreground">
                                            {formatDuration(agent.avgDuration)}
                                        </td>
                                        <td className="px-5 py-3 text-center">
                                            <span className={cn(
                                                "px-2 py-0.5 rounded-full text-xs font-medium",
                                                agent.fcr >= 80 ? "bg-green-500/10 text-green-500" :
                                                    agent.fcr >= 60 ? "bg-yellow-500/10 text-yellow-500" :
                                                        "bg-red-500/10 text-red-500"
                                            )}>
                                                {agent.fcr}%
                                            </span>
                                        </td>
                                        <td className="px-5 py-3 text-center text-muted-foreground">{agent.escalated}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Personal Stats Message (for regular users) */}
            {(user?.role === 'user' || user?.role === 'agent') && !loading && (
                <div className="p-6 rounded-xl bg-muted/50 border border-border text-center">
                    <p className="text-muted-foreground">
                        {totalCalls === 0
                            ? "No calls recorded for this period."
                            : `You've handled ${totalCalls} calls with an average resolution time of ${formatDuration(avgHandleTime)}.`}
                    </p>
                </div>
            )}
        </div>
    );
}
