import { useState, useEffect } from 'react';
import { Users, TrendingUp, Clock, Star, Filter, Download, RefreshCw, Loader2, Settings, Save } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getUsers, getCompanies, type User, type Company } from '@/lib/supabase';
import { API_URL } from '@/lib/config';

// Team Settings Types
interface TeamConfig {
    teamId: string;
    teamName: string;
    sttProvider: string;
    ttsProvider: string;
    voskServerUrl?: string;
    voskModel?: string;
}

// Extended User with display data
interface UserWithStats extends User {
    calls_handled?: number;
    fcr_rate?: number;
    avg_handle_time?: number;
}

export default function AdminPage() {
    const cloudUrl = API_URL;
    const [users, setUsers] = useState<UserWithStats[]>([]);
    const [companies, setCompanies] = useState<Company[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedCompany, setSelectedCompany] = useState<string>('all');
    const [refreshing, setRefreshing] = useState(false);
    
    // Team Settings State
    const [activeTab, setActiveTab] = useState<'users' | 'settings'>('users');
    const [teamConfig, setTeamConfig] = useState<TeamConfig | null>(null);
    const [savingConfig, setSavingConfig] = useState(false);
    const [configMessage, setConfigMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);

    // Fetch users and companies
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
    
    // Fetch team config
    const fetchTeamConfig = async (teamId: string) => {
        try {
            const response = await fetch(`${cloudUrl}/api/teams/${teamId}/config`);
            if (response.ok) {
                const data = await response.json();
                setTeamConfig(data);
            }
        } catch (error) {
            console.error('Failed to fetch team config:', error);
        }
    };
    
    // Save team config
    const saveTeamConfig = async () => {
        if (!teamConfig) return;
        
        setSavingConfig(true);
        setConfigMessage(null);
        
        try {
            const response = await fetch(`${cloudUrl}/api/teams/${teamConfig.teamId}/config`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sttProvider: teamConfig.sttProvider,
                    ttsProvider: teamConfig.ttsProvider,
                    voskServerUrl: teamConfig.voskServerUrl,
                    voskModel: teamConfig.voskModel,
                })
            });
            
            if (response.ok) {
                setConfigMessage({ type: 'success', text: 'Settings saved successfully!' });
            } else {
                setConfigMessage({ type: 'error', text: 'Failed to save settings' });
            }
        } catch (error) {
            setConfigMessage({ type: 'error', text: 'Error saving settings' });
        } finally {
            setSavingConfig(false);
        }
    };
    
    // Initialize team config when companies change
    useEffect(() => {
        if (companies.length > 0 && !teamConfig) {
            fetchTeamConfig(companies[0].id);
        }
    }, [companies]);

    // Filter users by company
    const filteredUsers = selectedCompany === 'all'
        ? users
        : users.filter(u => u.company_id === selectedCompany);

    // Calculate stats by company
    const companyStats = companies.map(company => {
        const companyUsers = users.filter(u => u.company_id === company.id);
        const onlineUsers = companyUsers.filter(u => u.is_online);
        return {
            id: company.id,
            name: company.name,
            totalUsers: companyUsers.length,
            onlineUsers: onlineUsers.length,
            totalCalls: companyUsers.reduce((sum, u) => sum + (u.calls_handled || 0), 0)
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

    // Format seconds to MM:SS
    const formatTime = (seconds?: number) => {
        if (!seconds) return '--:--';
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className="space-y-8">
            {/* Header */}
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
            
            {/* Tabs */}
            <div className="flex items-center gap-4 mb-6">
                <button
                    onClick={() => setActiveTab('users')}
                    className={cn(
                        "px-4 py-2 rounded-lg font-medium transition-colors",
                        activeTab === 'users' 
                            ? "bg-primary text-primary-foreground" 
                            : "bg-muted text-muted-foreground hover:bg-muted/80"
                    )}
                >
                    <Users className="w-4 h-4 inline-block mr-2" />
                    Users
                </button>
                <button
                    onClick={() => setActiveTab('settings')}
                    className={cn(
                        "px-4 py-2 rounded-lg font-medium transition-colors",
                        activeTab === 'settings' 
                            ? "bg-primary text-primary-foreground" 
                            : "bg-muted text-muted-foreground hover:bg-muted/80"
                    )}
                >
                    <Settings className="w-4 h-4 inline-block mr-2" />
                    Team Settings
                </button>
            </div>

            {/* Team Settings Tab */}
            {activeTab === 'settings' && (
                <div className="mb-6 p-6 rounded-xl bg-card border border-border">
                    <h3 className="font-semibold text-lg text-foreground mb-4">STT/TTS Provider Configuration</h3>
                    
                    {teamConfig ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* STT Provider */}
                            <div>
                                <label className="block text-sm font-medium text-foreground mb-2">
                                    Speech-to-Text (STT) Provider
                                </label>
                                <select
                                    value={teamConfig.sttProvider}
                                    onChange={(e) => setTeamConfig({...teamConfig, sttProvider: e.target.value})}
                                    className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                                >
                                    <option value="vosk">VOSK (Local - Recommended)</option>
                                    <option value="deepgram">Deepgram (Cloud)</option>
                                    <option value="webspeech">Web Speech API (Browser)</option>
                                </select>
                                <p className="text-xs text-muted-foreground mt-1">
                                    VOSK runs locally for free. Deepgram is cloud-based.
                                </p>
                            </div>
                            
                            {/* TTS Provider */}
                            <div>
                                <label className="block text-sm font-medium text-foreground mb-2">
                                    Text-to-Speech (TTS) Provider
                                </label>
                                <select
                                    value={teamConfig.ttsProvider}
                                    onChange={(e) => setTeamConfig({...teamConfig, ttsProvider: e.target.value})}
                                    className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                                >
                                    <option value="elevenlabs">ElevenLabs (Recommended)</option>
                                    <option value="webspeech">Web Speech API (Browser)</option>
                                </select>
                            </div>
                            
                            {/* VOSK Server URL */}
                            {teamConfig.sttProvider === 'vosk' && (
                                <>
                                    <div>
                                        <label className="block text-sm font-medium text-foreground mb-2">
                                            VOSK Server URL
                                        </label>
                                        <input
                                            type="text"
                                            value={teamConfig.voskServerUrl || ''}
                                            onChange={(e) => setTeamConfig({...teamConfig, voskServerUrl: e.target.value})}
                                            placeholder="wss://your-vosk-server.railway.app"
                                            className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                                        />
                                        <p className="text-xs text-muted-foreground mt-1">
                                            Enter the URL of your VOSK server (e.g., wss://keledon-vosk.railway.app)
                                        </p>
                                    </div>
                                    
                                    <div>
                                        <label className="block text-sm font-medium text-foreground mb-2">
                                            VOSK Model
                                        </label>
                                        <select
                                            value={teamConfig.voskModel || 'vosk-model-en-us'}
                                            onChange={(e) => setTeamConfig({...teamConfig, voskModel: e.target.value})}
                                            className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                                        >
                                            <option value="vosk-model-en-us">English (US) - Recommended</option>
                                            <option value="vosk-model-en-us-0.22">English (US) v0.22</option>
                                            <option value="vosk-model-en-gb">English (GB)</option>
                                            <option value="vosk-model-de">German</option>
                                            <option value="vosk-model-fr">French</option>
                                            <option value="vosk-model-es">Spanish</option>
                                            <option value="vosk-model-cn">Chinese</option>
                                            <option value="vosk-model-ru">Russian</option>
                                            <option value="vosk-model-small-en-us">English (US) - Small</option>
                                        </select>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            Select the VOSK model for speech recognition
                                        </p>
                                    </div>
                                </>
                            )}
                            
                            {/* Save Button */}
                            <div className="md:col-span-2 flex items-center gap-4">
                                <button
                                    onClick={saveTeamConfig}
                                    disabled={savingConfig}
                                    className="flex items-center gap-2 px-6 py-2 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
                                >
                                    {savingConfig ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <Save className="w-4 h-4" />
                                    )}
                                    Save Settings
                                </button>
                                
                                {configMessage && (
                                    <span className={cn(
                                        "text-sm",
                                        configMessage.type === 'success' ? "text-green-500" : "text-red-500"
                                    )}>
                                        {configMessage.text}
                                    </span>
                                )}
                            </div>
                        </div>
                    ) : (
                        <p className="text-muted-foreground">Loading team configuration...</p>
                    )}
                </div>
            )}

            {/* Users Tab Content */}
            {activeTab === 'users' && (
                <>
            {/* Company Summary Cards */}
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

            {/* Filters */}
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

            {/* User Performance Table */}
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
                                                    {user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                                                </div>
                                                <div>
                                                    <span className="font-medium text-foreground">{user.name}</span>
                                                    <p className="text-xs text-muted-foreground">{user.email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-4 text-muted-foreground">
                                            {user.companies?.name || '—'}
                                        </td>
                                        <td className="px-4 py-4">
                                            <span className={cn('px-2 py-1 rounded text-xs font-medium', roleStyles[user.role])}>
                                                {user.role}
                                            </span>
                                        </td>
                                        <td className="px-4 py-4">
                                            <div className="flex items-center gap-2">
                                                <TrendingUp className="w-4 h-4 text-success" />
                                                <span className="text-foreground">{user.calls_handled || 0}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-4">
                                            <div className="flex items-center gap-1">
                                                <Star className="w-4 h-4 text-warning fill-warning" />
                                                <span className="text-foreground">{user.fcr_rate ? `${(user.fcr_rate * 100).toFixed(0)}%` : '—'}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-4">
                                            <div className="flex items-center gap-2 text-muted-foreground">
                                                <Clock className="w-4 h-4" />
                                                {formatTime(user.avg_handle_time)}
                                            </div>
                                        </td>
                                        <td className="px-4 py-4">
                                            <div className="flex items-center gap-2">
                                                <span className={cn('w-2 h-2 rounded-full', user.is_online ? statusStyles.online : statusStyles.offline)} />
                                                <span className="text-sm text-muted-foreground capitalize">
                                                    {user.is_online ? 'Online' : 'Offline'}
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
                </>
            )}
        </div>
    );
}
