import { useState, useEffect } from 'react';
import { Users, TrendingUp, Clock, Star, Filter, Download, RefreshCw, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getUsers, getCompanies, type User, type Company } from '@/lib/supabase';

interface UserWithStats extends User {
    callsHandled?: number;
    fcrRate?: number;
    avgHandleTime?: number;
}

export default function AdminUsersPage() {
    const [users, setUsers] = useState<UserWithStats[]>([]);
    const [companies, setCompanies] = useState<Company[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedCompany, setSelectedCompany] = useState<string>('all');
    const [refreshing, setRefreshing] = useState(false);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [usersData, companiesData] = await Promise.all([
                getUsers(),
                getCompanies()
            ]);
            setUsers(usersData);
            setCompanies(companiesData);
        } catch (error) {
            console.error('Failed to fetch data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleRefresh = async () => {
        setRefreshing(true);
        await fetchData();
        setRefreshing(false);
    };

    const filteredUsers = selectedCompany === 'all'
        ? users
        : users.filter(u => u.companyId === selectedCompany);

    const companyStats = companies.map(company => {
        const companyUsers = users.filter(u => u.companyId === company.id);
        const onlineUsers = companyUsers.filter(u => u.isOnline);
        return {
            id: company.id,
            name: company.name,
            totalUsers: companyUsers.length,
            onlineUsers: onlineUsers.length,
            totalCalls: companyUsers.reduce((sum, u) => sum + (u.callsHandled || 0), 0)
        };
    });

    const statusStyles: Record<string, string> = {
        online: 'bg-success',
        offline: 'bg-muted-foreground',
    };

    const roleStyles: Record<string, string> = {
        superadmin: 'bg-red-500/20 text-red-400',
        admin: 'bg-primary/20 text-primary',
        user: 'bg-muted text-muted-foreground',
    };

    const formatTime = (seconds?: number) => {
        if (!seconds) return '--:--';
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">User Performance</h1>
                    <p className="text-muted-foreground mt-1">Monitor users and their agent activity</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={handleRefresh}
                        disabled={refreshing}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-muted text-foreground font-medium hover:bg-muted/80 transition-colors border border-border disabled:opacity-50"
                    >
                        <RefreshCw className={cn("w-4 h-4", refreshing && "animate-spin")} />
                        Refresh
                    </button>
                    <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-muted text-foreground font-medium hover:bg-muted/80 transition-colors border border-border">
                        <Download className="w-4 h-4" />
                        Export Report
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {companyStats.slice(0, 3).map((company) => (
                    <div
                        key={company.id}
                        className={cn(
                            "p-6 rounded-xl bg-card border transition-colors cursor-pointer",
                            selectedCompany === company.id ? "border-primary" : "border-border hover:border-primary/30"
                        )}
                        onClick={() => setSelectedCompany(selectedCompany === company.id ? 'all' : company.id)}
                    >
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-semibold text-foreground">{company.name}</h3>
                            <Users className="w-5 h-5 text-muted-foreground" />
                        </div>
                        <div className="grid grid-cols-3 gap-4 text-center">
                            <div>
                                <p className="text-2xl font-bold text-foreground">{company.totalUsers}</p>
                                <p className="text-xs text-muted-foreground">Users</p>
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-success">{company.onlineUsers}</p>
                                <p className="text-xs text-muted-foreground">Online</p>
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-primary">{company.totalCalls}</p>
                                <p className="text-xs text-muted-foreground">Calls</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-muted-foreground" />
                    <select
                        value={selectedCompany}
                        onChange={(e) => setSelectedCompany(e.target.value)}
                        className="px-3 py-2 rounded-lg bg-muted border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                    >
                        <option value="all">All Companies</option>
                        {companies.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                    </select>
                </div>
                <span className="text-sm text-muted-foreground">
                    Showing {filteredUsers.length} user{filteredUsers.length !== 1 ? 's' : ''}
                </span>
            </div>

            <div className="rounded-xl border border-border bg-card overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center p-12">
                        <Loader2 className="w-8 h-8 text-primary animate-spin" />
                    </div>
                ) : (
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-border text-left text-sm text-muted-foreground">
                                <th className="px-4 py-3 font-medium">USER</th>
                                <th className="px-4 py-3 font-medium">COMPANY</th>
                                <th className="px-4 py-3 font-medium">ROLE</th>
                                <th className="px-4 py-3 font-medium">CALLS</th>
                                <th className="px-4 py-3 font-medium">FCR RATE</th>
                                <th className="px-4 py-3 font-medium">AVG HANDLE TIME</th>
                                <th className="px-4 py-3 font-medium">STATUS</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredUsers.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                                        No users found. Create users in SuperAdmin to see them here.
                                    </td>
                                </tr>
                            ) : (
                                filteredUsers.map((user) => (
                                    <tr key={user.id} className="border-b border-border hover:bg-muted/50 transition-colors">
                                        <td className="px-4 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-foreground font-medium text-sm">
                                                    {user.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '?'}
                                                </div>
                                                <div>
                                                    <span className="font-medium text-foreground">{user.name || 'Unknown'}</span>
                                                    <p className="text-xs text-muted-foreground">{user.email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-4 text-muted-foreground">
                                            {user.companies?.name || '—'}
                                        </td>
                                        <td className="px-4 py-4">
                                            <span className={cn('px-2 py-1 rounded text-xs font-medium', roleStyles[user.role] || roleStyles.user)}>
                                                {user.role}
                                            </span>
                                        </td>
                                        <td className="px-4 py-4">
                                            <div className="flex items-center gap-2">
                                                <TrendingUp className="w-4 h-4 text-success" />
                                                <span className="text-foreground">{user.callsHandled || 0}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-4">
                                            <div className="flex items-center gap-1">
                                                <Star className="w-4 h-4 text-warning fill-warning" />
                                                <span className="text-foreground">{user.fcrRate ? `${(user.fcrRate * 100).toFixed(0)}%` : '—'}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-4">
                                            <div className="flex items-center gap-2 text-muted-foreground">
                                                <Clock className="w-4 h-4" />
                                                {formatTime(user.avgHandleTime)}
                                            </div>
                                        </td>
                                        <td className="px-4 py-4">
                                            <div className="flex items-center gap-2">
                                                <span className={cn('w-2 h-2 rounded-full', user.isOnline ? statusStyles.online : statusStyles.offline)} />
                                                <span className="text-sm text-muted-foreground capitalize">
                                                    {user.isOnline ? 'Online' : 'Offline'}
                                                </span>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}
