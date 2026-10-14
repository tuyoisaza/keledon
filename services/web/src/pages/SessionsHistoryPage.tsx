import { useState, useEffect } from 'react';
import { getCompanies, getUsers, getSessions } from '@/lib/crud-api';
import { Filter, RefreshCw, History } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import { useTranslation } from '@/context/I18nContext';

export default function SessionsHistoryPage() {
    const { user } = useAuth();
    const { t } = useTranslation();
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
        try {
            const [c, u] = await Promise.all([
                getCompanies(),
                getUsers()
            ]);
            setCompanies(c);
            setUsers(u);
        } catch (error) {
            console.error('Error fetching filter options:', error);
        }
    }

    async function fetchSessions() {
        setLoading(true);
        try {
            if (!user) return;

            let companyId: string | undefined;
            
            if (user.role === 'superadmin') {
                companyId = undefined;
            } else if (user.role === 'admin' || user.role === 'coordinator') {
                companyId = user.companyId;
            } else if (user.role === 'user' || user.role === 'agent') {
                const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
                if (!uuidRegex.test(user.id)) {
                    setSessions([]);
                    setLoading(false);
                    return;
                }
            }

            const sessions = await getSessions(companyId, 100);
            const completedSessions = sessions.filter(s => s.status !== 'active');
            setSessions(completedSessions || []);
        } catch (error) {
            console.error('Error fetching sessions:', error);
        } finally {
            setLoading(false);
        }
    }

    const filteredSessions = sessions.filter(session => {
        if (user?.role !== 'superadmin') return true;
        const sessionUser = session.user;
        if (selectedCompany && sessionUser?.companyId !== selectedCompany) return false;
        if (selectedUser && session.userId !== selectedUser) return false;
        return true;
    });

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-primary" />
                <h1 className="text-2xl font-bold text-foreground">{t('sessions.historyTitle')}</h1>
                <span className="text-sm text-muted-foreground">({t('sessions.sessionCount').replace('{count}', String(filteredSessions.length))})</span>
            </div>

            {user?.role === 'superadmin' && (
                <div className="flex flex-wrap gap-4 p-4 bg-card border border-border rounded-xl">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Filter className="w-4 h-4" />
                        <span>{t('sessions.filters')}</span>
                    </div>
                    <select
                        className="bg-background border border-border rounded-md px-3 py-1.5 text-sm"
                        aria-label={t('sessions.filterCompany')}
                        value={selectedCompany}
                        onChange={(e) => setSelectedCompany(e.target.value)}
                    >
                        <option value="">{t('sessions.allCompanies')}</option>
                        {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    <select
                        className="bg-background border border-border rounded-md px-3 py-1.5 text-sm"
                        aria-label={t('sessions.filterUser')}
                        value={selectedUser}
                        onChange={(e) => setSelectedUser(e.target.value)}
                    >
                        <option value="">{t('sessions.allUsers')}</option>
                        {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                    </select>
                    <button onClick={fetchSessions} className="ml-auto p-2 hover:bg-muted rounded-full" title={t('sessions.refresh')} aria-label={t('sessions.refresh')}>
                        <RefreshCw className="w-4 h-4" />
                    </button>
                </div>
            )}

            <div className="rounded-xl border border-border bg-card overflow-hidden">
                <table className="w-full">
                    <caption className="sr-only">{t('sessions.historyTable')}</caption>
                    <thead>
                        <tr className="border-b border-border text-left text-sm text-muted-foreground">
                            <th scope="col" className="px-4 py-3 font-medium">{t('sessions.sessionId')}</th>
                            <th scope="col" className="px-4 py-3 font-medium">{t('sessions.statusLabel')}</th>
                            <th scope="col" className="px-4 py-3 font-medium">{t('sessions.user')}</th>
                            <th scope="col" className="px-4 py-3 font-medium">{t('sessions.duration')}</th>
                            <th scope="col" className="px-4 py-3 font-medium">{t('sessions.actions')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">{t('sessions.loadingSessions')}</td></tr>
                        ) : filteredSessions.length === 0 ? (
                            <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">{t('sessions.noHistory')}</td></tr>
                        ) : filteredSessions.map(session => {
                            const sessionUser = session.user;
                            const userName = sessionUser?.name || t('sessions.unknownUser');
                            const metadata = session.metadata ? JSON.parse(session.metadata) : {};
                            return (
                                <tr key={session.id} className="border-b border-border hover:bg-muted/50">
                                    <td className="px-4 py-3 font-mono text-sm">{session.id.slice(0, 8)}</td>
                                    <td className="px-4 py-3">
                                        <span className={cn('px-2 py-1 rounded-full text-xs capitalize',
                                            session.status === 'completed' ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20' :
                                                'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20')}>
                                            {['completed', 'escalated', 'ended', 'orphaned'].includes(session.status)
                                                ? t(`sessions.status.${session.status}`)
                                                : session.status}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-sm">{userName}</td>
                                    <td className="px-4 py-3 text-sm text-muted-foreground">{metadata.duration || 0}{t('sessions.secondsShort')}</td>
                                    <td className="px-4 py-3">
                                        <a href={`/sessions/${session.id}`} className="text-primary hover:underline text-sm">{t('sessions.viewDetails')}</a>
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
