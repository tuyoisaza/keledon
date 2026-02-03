import { useState, useEffect } from 'react';
import { Brain, Target, AlertTriangle, TrendingUp, Zap, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

interface IntentStat {
    intent: string;
    count: number;
    avgConfidence: number;
    resolved: number;
    escalated: number;
}

export default function KnowledgeStatsPage() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [dateRange, setDateRange] = useState<'today' | 'week' | 'month'>('week');

    // Aggregate Stats
    const [totalSessions, setTotalSessions] = useState(0);
    const [avgConfidence, setAvgConfidence] = useState(0);
    const [containmentRate, setContainmentRate] = useState(0);
    const [fallbackRate, setFallbackRate] = useState(0);

    // Intent Breakdown
    const [intentStats, setIntentStats] = useState<IntentStat[]>([]);

    // Low confidence sessions (gaps)
    const [gaps, setGaps] = useState<any[]>([]);

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
                setTotalSessions(sessions.length);

                // Calculate AI performance metrics
                const confidenceSum = sessions.reduce((sum, s) => sum + (s.confidence || 0), 0);
                const avgConf = sessions.length > 0 ? Math.round((confidenceSum / sessions.length) * 100) : 0;

                const completed = sessions.filter(s => s.status === 'completed').length;
                const noIntent = sessions.filter(s => !s.intent || s.intent === 'unknown').length;

                const contRate = sessions.length > 0 ? Math.round((completed / sessions.length) * 100) : 0;
                const fallRate = sessions.length > 0 ? Math.round((noIntent / sessions.length) * 100) : 0;

                setAvgConfidence(avgConf);
                setContainmentRate(contRate);
                setFallbackRate(fallRate);

                // Intent breakdown
                const intentMap: Record<string, IntentStat> = {};
                sessions.forEach(s => {
                    const intent = s.intent || 'unknown';
                    if (!intentMap[intent]) {
                        intentMap[intent] = {
                            intent,
                            count: 0,
                            avgConfidence: 0,
                            resolved: 0,
                            escalated: 0
                        };
                    }
                    intentMap[intent].count++;
                    intentMap[intent].avgConfidence += (s.confidence || 0);
                    if (s.status === 'completed') intentMap[intent].resolved++;
                    if (s.status === 'escalated') intentMap[intent].escalated++;
                });

                Object.values(intentMap).forEach(stat => {
                    stat.avgConfidence = stat.count > 0
                        ? Math.round((stat.avgConfidence / stat.count) * 100)
                        : 0;
                });

                setIntentStats(Object.values(intentMap).sort((a, b) => b.count - a.count));

                const gapSessions = sessions
                    .filter(s => (s.confidence || 0) < 0.6 || s.status === 'escalated')
                    .slice(0, 10);
                setGaps(gapSessions);

            } catch (err) {
                console.error('Error fetching knowledge stats:', err);
            } finally {
                if (isMounted) setLoading(false);
            }
        }

        fetchStats();
        return () => { isMounted = false; };
    }, [user, dateRange]);

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Knowledge Stats</h1>
                    <p className="text-muted-foreground mt-1">AI performance and knowledge base analytics</p>
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
                    <div className="p-3 rounded-lg bg-blue-500/10 text-blue-500 w-fit">
                        <Brain className="w-6 h-6" />
                    </div>
                    <p className="mt-4 text-3xl font-bold text-foreground">{totalSessions}</p>
                    <p className="text-sm text-muted-foreground">Sessions Analyzed</p>
                </div>

                <div className="p-6 rounded-xl bg-card border border-border">
                    <div className="p-3 rounded-lg bg-purple-500/10 text-purple-500 w-fit">
                        <Target className="w-6 h-6" />
                    </div>
                    <p className="mt-4 text-3xl font-bold text-foreground">{avgConfidence}%</p>
                    <p className="text-sm text-muted-foreground">Avg Confidence Score</p>
                </div>

                <div className="p-6 rounded-xl bg-card border border-border">
                    <div className="p-3 rounded-lg bg-green-500/10 text-green-500 w-fit">
                        <Zap className="w-6 h-6" />
                    </div>
                    <p className="mt-4 text-3xl font-bold text-foreground">{containmentRate}%</p>
                    <p className="text-sm text-muted-foreground">Containment Rate</p>
                </div>

                <div className="p-6 rounded-xl bg-card border border-border">
                    <div className="p-3 rounded-lg bg-yellow-500/10 text-yellow-500 w-fit">
                        <HelpCircle className="w-6 h-6" />
                    </div>
                    <p className="mt-4 text-3xl font-bold text-foreground">{fallbackRate}%</p>
                    <p className="text-sm text-muted-foreground">Fallback Rate</p>
                </div>
            </div>

            {/* Intent Breakdown */}
            {intentStats.length > 0 && (
                <div className="space-y-4">
                    <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                        <TrendingUp className="w-5 h-5" />
                        Intent Performance
                    </h2>
                    <div className="rounded-xl border border-border bg-card overflow-hidden">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-border text-left text-sm text-muted-foreground bg-muted/30">
                                    <th className="px-5 py-3 font-medium">INTENT</th>
                                    <th className="px-5 py-3 font-medium text-center">COUNT</th>
                                    <th className="px-5 py-3 font-medium text-center">AVG CONFIDENCE</th>
                                    <th className="px-5 py-3 font-medium text-center">RESOLVED</th>
                                    <th className="px-5 py-3 font-medium text-center">ESCALATED</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr><td colSpan={5} className="text-center py-8 text-muted-foreground">Loading...</td></tr>
                                ) : intentStats.map((stat, i) => (
                                    <tr key={i} className="border-b border-border hover:bg-muted/50">
                                        <td className="px-5 py-3 font-mono text-sm text-primary">{stat.intent}</td>
                                        <td className="px-5 py-3 text-center">{stat.count}</td>
                                        <td className="px-5 py-3 text-center">
                                            <span className={cn(
                                                "px-2 py-0.5 rounded-full text-xs font-medium",
                                                stat.avgConfidence >= 80 ? "bg-green-500/10 text-green-500" :
                                                    stat.avgConfidence >= 60 ? "bg-yellow-500/10 text-yellow-500" :
                                                        "bg-red-500/10 text-red-500"
                                            )}>
                                                {stat.avgConfidence}%
                                            </span>
                                        </td>
                                        <td className="px-5 py-3 text-center text-green-500">{stat.resolved}</td>
                                        <td className="px-5 py-3 text-center text-yellow-500">{stat.escalated}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Knowledge Gaps */}
            {gaps.length > 0 && (
                <div className="space-y-4">
                    <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-yellow-500" />
                        Knowledge Gaps (Low Confidence / Escalated)
                    </h2>
                    <div className="rounded-xl border border-border bg-card overflow-hidden">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-border text-left text-sm text-muted-foreground bg-muted/30">
                                    <th className="px-5 py-3 font-medium">SESSION</th>
                                    <th className="px-5 py-3 font-medium">INTENT</th>
                                    <th className="px-5 py-3 font-medium text-center">CONFIDENCE</th>
                                    <th className="px-5 py-3 font-medium text-center">STATUS</th>
                                </tr>
                            </thead>
                            <tbody>
                                {gaps.map((session, i) => (
                                    <tr key={i} className="border-b border-border hover:bg-muted/50">
                                        <td className="px-5 py-3 font-mono text-sm text-muted-foreground">
                                            {session.id.slice(0, 8)}
                                        </td>
                                        <td className="px-5 py-3 text-sm">{session.intent || 'unknown'}</td>
                                        <td className="px-5 py-3 text-center">
                                            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-500/10 text-red-500">
                                                {Math.round((session.confidence || 0) * 100)}%
                                            </span>
                                        </td>
                                        <td className="px-5 py-3 text-center">
                                            <span className={cn(
                                                "px-2 py-0.5 rounded-full text-xs capitalize",
                                                session.status === 'escalated'
                                                    ? "bg-yellow-500/10 text-yellow-500"
                                                    : "bg-muted text-muted-foreground"
                                            )}>
                                                {session.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <p className="text-sm text-muted-foreground">
                        💡 These sessions may indicate areas where the knowledge base needs improvement.
                    </p>
                </div>
            )}
        </div>
    );
}
