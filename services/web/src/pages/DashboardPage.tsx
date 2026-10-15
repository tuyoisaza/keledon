import { useCallback, useState, useEffect } from 'react';
import { Phone, CheckCircle, AlertTriangle, Clock, Building2, LayoutGrid, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getSessions, getOrphanedSessionCount, deleteOrphanedSessions } from '@/lib/crud-api';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import { useTranslation } from '@/context/I18nContext';
import type { Session } from '@/lib/crud-api';

interface DashboardAggregate {
    name: string;
    brand?: string;
    team?: string;
    active: number;
    completed: number;
    escalated: number;
    totalDuration: number;
    count: number;
}

function sessionDuration(metadata?: string): number {
    if (!metadata) return 0;
    try {
        const parsed: unknown = JSON.parse(metadata);
        if (typeof parsed !== 'object' || parsed === null || !('duration' in parsed)) return 0;
        const duration = parsed.duration;
        return typeof duration === 'number' && Number.isFinite(duration) && duration > 0 ? duration : 0;
    } catch {
        return 0;
    }
}

const statusStyles: Record<string, string> = {
    active: 'bg-green-500/10 text-green-500 border-green-500/20',
    completed: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    escalated: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
};

export default function DashboardPage() {
    const { user } = useAuth();
    const { t } = useTranslation();
    const [sessions, setSessions] = useState<Session[]>([]);
    const [loading, setLoading] = useState(true);
    const [orphanedCount, setOrphanedCount] = useState(0);
    const [cleaning, setCleaning] = useState(false);
    const [stats, setStats] = useState([
        { labelKey: 'dashboard.activeNow', value: 0, icon: Phone, color: 'text-green-500' },
        { labelKey: 'dashboard.completedToday', value: 0, icon: CheckCircle, color: 'text-blue-500' },
        { labelKey: 'dashboard.escalated', value: 0, icon: AlertTriangle, color: 'text-yellow-500' },
    ]);
    const [aggregatedData, setAggregatedData] = useState<DashboardAggregate[]>([]);

    const checkOrphanedSessions = useCallback(async () => {
        try {
            const count = await getOrphanedSessionCount();
            setOrphanedCount(count);
        } catch (e) {
            console.error('Failed to check orphaned sessions:', e);
        }
    }, []);

    async function handleCleanOrphanedSessions() {
        if (orphanedCount === 0) return;
        if (!confirm(t('dashboard.confirmDeleteOrphaned').replace('{count}', String(orphanedCount)))) return;
        
        setCleaning(true);
        try {
            const result = await deleteOrphanedSessions();
            toast.success(t('dashboard.deletedOrphaned').replace('{count}', String(result.deleted)));
            setOrphanedCount(0);
            void fetchData();
        } catch (_e) {
            toast.error(t('dashboard.deleteOrphanedFailed'));
        } finally {
            setCleaning(false);
        }
    }

    const calculateAggregation = useCallback((data: Session[], role: string) => {
        if (role === 'superadmin') {
            const groups: Record<string, DashboardAggregate> = {};

            data.forEach(s => {
                const companyName = s.team?.brand?.company?.name || t('dashboard.unknownClient');
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
                groups[companyName].totalDuration += sessionDuration(s.metadata);
            });

            setAggregatedData(Object.values(groups));

        } else if (role === 'admin' || role === 'coordinator') {
            const groups: Record<string, DashboardAggregate> = {};

            data.forEach(s => {
                const brandName = s.team?.brand?.name || t('dashboard.unknownBrand');
                const teamName = s.team?.name || t('dashboard.unknownTeam');
                const key = `${brandName} - ${teamName}`;

                if (!groups[key]) {
                    groups[key] = {
                        name: key,
                        brand: brandName,
                        team: teamName,
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
                groups[key].totalDuration += sessionDuration(s.metadata);
            });

            setAggregatedData(Object.values(groups));
        } else {
            setAggregatedData([]);
        }
    }, [t]);

    const fetchData = useCallback(async () => {
        try {
            if (!user) return;

            let companyId: string | undefined;

            if (user.role === 'superadmin') {
                companyId = undefined;
            } else if (user.role === 'admin' || user.role === 'coordinator') {
                companyId = user.companyId;
            } else if (user.role === 'user' || user.role === 'agent') {
                companyId = undefined;
            }

            const fetchedSessions = await getSessions(companyId, 100);
            setSessions(fetchedSessions);

            const active = fetchedSessions.filter(s => s.status === 'active').length;
            const completed = fetchedSessions.filter(s => s.status === 'completed').length;
            const escalated = fetchedSessions.filter(s => s.status === 'escalated').length;

            setStats([
                { labelKey: 'dashboard.activeNow', value: active, icon: Phone, color: 'text-green-500' },
                { labelKey: 'dashboard.completedToday', value: completed, icon: CheckCircle, color: 'text-blue-500' },
                { labelKey: 'dashboard.escalated', value: escalated, icon: AlertTriangle, color: 'text-yellow-500' },
            ]);

            calculateAggregation(fetchedSessions, user.role);

        } catch (err) {
            console.error('Error fetching dashboard data:', err);
        } finally {
            setLoading(false);
        }
    }, [calculateAggregation, user]);

    useEffect(() => {
        if (!user) return;
        void fetchData();
        void checkOrphanedSessions();
        const interval = setInterval(() => void fetchData(), 10000);
        return () => clearInterval(interval);
    }, [checkOrphanedSessions, fetchData, user]);

    return (
        <div className="space-y-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">
                        {user?.role === 'user' ? t('dashboard.greeting').replace('{name}', user.name?.split(' ')[0] || t('dashboard.user')) : t('dashboard.title')}
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        {user?.role === 'user'
                            ? t('dashboard.userActivityToday')
                            : t('dashboard.systemMonitoring')}
                    </p>
                </div>
                <div className="flex gap-2 text-sm text-muted-foreground bg-muted/50 px-3 py-1 rounded-md border border-border">
                    <Clock className="w-4 h-4" />
                    {t('dashboard.todayStats')}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {stats.map((stat) => (
                    <div
                        key={stat.labelKey}
                        className="p-6 rounded-xl bg-card border border-border hover:border-primary/20 transition-all shadow-sm"
                    >
                        <div className="flex items-center gap-4">
                            <div className={cn('p-3 rounded-lg bg-background border border-border', stat.color)}>
                                <stat.icon className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-3xl font-bold text-foreground">{stat.value}</p>
                                <p className="text-sm text-muted-foreground">{t(stat.labelKey)}</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {aggregatedData.length > 0 && (
                <div className="space-y-4">
                    <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                        {user?.role === 'superadmin' ? <Building2 className="w-5 h-5" /> : <LayoutGrid className="w-5 h-5" />}
                        {user?.role === 'superadmin' ? t('dashboard.clientOverview') : t('dashboard.campaignPerformance')}
                    </h2>
                    <div className="rounded-xl border border-border bg-card overflow-hidden">
                        <table className="w-full">
                            <caption className="sr-only">{t('dashboard.campaignSummary')}</caption>
                            <thead>
                                <tr className="border-b border-border text-left text-sm text-muted-foreground bg-muted/30">
                                    <th scope="col" className="px-5 py-3 font-medium">
                                        {user?.role === 'superadmin' ? t('dashboard.client') : t('dashboard.brandTeam')}
                                    </th>
                                    <th scope="col" className="px-5 py-3 font-medium text-center">{t('dashboard.active')}</th>
                                    <th scope="col" className="px-5 py-3 font-medium text-center">{t('dashboard.completed')}</th>
                                    <th scope="col" className="px-5 py-3 font-medium text-center">{t('dashboard.escalated')}</th>
                                    <th scope="col" className="px-5 py-3 font-medium text-right">{t('dashboard.averageDuration')}</th>
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
                                                ? `${Math.floor((row.totalDuration / row.count) / 60)}${t('dashboard.minutesShort')} ${Math.floor((row.totalDuration / row.count) % 60)}${t('dashboard.secondsShort')}`
                                                : '-'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            <div className="space-y-4">
                <div className="flex justify-between items-center">
                    <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                        {t('dashboard.recentLiveActivity')}
                    </h2>
                    <div className="flex items-center gap-3">
                        {orphanedCount > 0 && (
                            <button
                                onClick={handleCleanOrphanedSessions}
                                disabled={cleaning}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-red-500/10 text-red-500 border border-red-500/20 rounded-lg hover:bg-red-500/20 transition-colors disabled:opacity-50"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                                {cleaning ? t('dashboard.cleaning') : t('dashboard.cleanOrphaned').replace('{count}', String(orphanedCount))}
                            </button>
                        )}
                        <button
                            onClick={() => window.location.href = '/sessions'}
                            className="text-sm text-primary hover:underline font-medium"
                        >
                            {t('dashboard.viewAllHistory')} &rarr;
                        </button>
                    </div>
                </div>

                <div className="rounded-xl border border-border bg-card overflow-hidden">
                    <table className="w-full">
                        <caption className="sr-only">{t('dashboard.recentSessionsTable')}</caption>
                        <thead>
                            <tr className="border-b border-border text-left text-sm text-muted-foreground">
                                <th scope="col" className="px-4 py-3 font-medium">{t('dashboard.user')}</th>
                                <th scope="col" className="px-4 py-3 font-medium">{t('dashboard.team')}</th>
                                <th scope="col" className="px-4 py-3 font-medium">{t('dashboard.session')}</th>
                                <th scope="col" className="px-4 py-3 font-medium">{t('dashboard.status')}</th>
                                <th scope="col" className="px-4 py-3 font-medium">{t('dashboard.duration')}</th>
                                <th scope="col" className="px-4 py-3 font-medium text-right">{t('dashboard.actions')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={6} className="text-center py-8 text-muted-foreground">{t('dashboard.loading')}</td></tr>
                            ) : sessions.length === 0 ? (
                                <tr><td colSpan={6} className="text-center py-8 text-muted-foreground">{t('dashboard.noSessionsToday')}</td></tr>
                            ) : sessions.slice(0, 5).map((session) => {
                                const metadata = session.metadata ? JSON.parse(session.metadata) : {};
                                return (
                                    <tr key={session.id} className="border-b border-border hover:bg-muted/50 transition-colors">
                                        <td className="px-4 py-3 text-sm font-medium">
                                            {session.user?.name || t('dashboard.anonymous')}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-muted-foreground">
                                            {session.team?.name || '—'}
                                        </td>
                                        <td className="px-4 py-3 font-mono text-sm text-muted-foreground">
                                            {session.id.slice(0, 8)}
                                            {session.status === 'active' && <span className="ml-2 inline-block w-2 h-2 rounded-full bg-green-500 animate-pulse" />}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={cn('px-2 py-0.5 rounded-full text-xs border uppercase', statusStyles[session.status || 'completed'])}>
                                                {session.status && ['active', 'completed', 'escalated'].includes(session.status)
                                                    ? t(`dashboard.sessionStatuses.${session.status}`)
                                                    : session.status || t('dashboard.sessionStatuses.completed')}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-muted-foreground font-mono">
                                            {Math.floor((metadata.duration || 0) / 60)}:{((metadata.duration || 0) % 60).toString().padStart(2, '0')}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <button
                                                onClick={() => window.location.href = `/sessions/${session.id}`}
                                                className="text-primary hover:underline text-sm"
                                            >
                                                {t('dashboard.view')}
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
