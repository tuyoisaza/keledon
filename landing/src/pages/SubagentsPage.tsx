import { useState, useEffect } from 'react';
import { useTranslation } from '@/context/I18nContext';
import {
    initializeSessionAgents,
    cleanupSessionAgents,
    getSessionAgents,
    executeFlow,
    getFlows,
    type SubAgentStatus,
    type FlowExecutionResult,
} from '@/lib/crud-api';
import {
    Bot,
    Play,
    Trash2,
    RefreshCw,
    Activity,
    CheckCircle,
    XCircle,
    Clock,
    Loader2,
} from 'lucide-react';

export default function SubagentsPage() {
    const { t } = useTranslation();
    const [sessionId, setSessionId] = useState('');
    const [agents, setAgents] = useState<SubAgentStatus[]>([]);
    const [flows, setFlows] = useState<any[]>([]);
    const [selectedFlowId, setSelectedFlowId] = useState('');
    const [loading, setLoading] = useState(false);
    const [executing, setExecuting] = useState(false);
    const [result, setResult] = useState<FlowExecutionResult | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadFlows();
    }, []);

    const loadFlows = async () => {
        try {
            const data = await getFlows();
            setFlows(data);
            if (data.length > 0) {
                setSelectedFlowId(data[0].id);
            }
        } catch (err) {
            console.error('Failed to load flows:', err);
        }
    };

    const handleInitialize = async () => {
        if (!sessionId.trim()) {
            setError('Session ID is required');
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const response = await initializeSessionAgents(sessionId);
            setAgents(response.agents);
        } catch (err: any) {
            setError(err.message || 'Failed to initialize agents');
        } finally {
            setLoading(false);
        }
    };

    const handleCleanup = async () => {
        if (!sessionId.trim()) return;
        setLoading(true);
        setError(null);
        try {
            await cleanupSessionAgents(sessionId);
            setAgents([]);
            setResult(null);
        } catch (err: any) {
            setError(err.message || 'Failed to cleanup agents');
        } finally {
            setLoading(false);
        }
    };

    const handleRefresh = async () => {
        if (!sessionId.trim()) return;
        setLoading(true);
        try {
            const data = await getSessionAgents(sessionId);
            setAgents(data);
        } catch (err: any) {
            setError(err.message || 'Failed to refresh agents');
        } finally {
            setLoading(false);
        }
    };

    const handleExecuteFlow = async () => {
        if (!selectedFlowId || !sessionId.trim()) return;
        setExecuting(true);
        setError(null);
        setResult(null);
        try {
            const data = await executeFlow(selectedFlowId, sessionId);
            setResult(data);
        } catch (err: any) {
            setError(err.message || 'Failed to execute flow');
        } finally {
            setExecuting(false);
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'idle':
                return <Clock className="h-4 w-4 text-gray-400" />;
            case 'active':
                return <Activity className="h-4 w-4 text-green-500" />;
            case 'waiting':
                return <Loader2 className="h-4 w-4 text-yellow-500 animate-spin" />;
            case 'error':
                return <XCircle className="h-4 w-4 text-red-500" />;
            default:
                return <Clock className="h-4 w-4 text-gray-400" />;
        }
    };

    const getStatusBadge = (status: string) => {
        const colors = {
            idle: 'bg-gray-100 text-gray-700',
            active: 'bg-green-100 text-green-700',
            waiting: 'bg-yellow-100 text-yellow-700',
            error: 'bg-red-100 text-red-700',
        };
        const statusKey = `subagents.status.${status}` as const;
        return (
            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${colors[status as keyof typeof colors] || colors.idle}`}>
                {getStatusIcon(status)}
                {t(statusKey)}
            </span>
        );
    };

    const getRoleName = (role: string) => {
        const roleKey = `subagents.role.${role}` as const;
        return t(roleKey);
    };

    return (
        <div className="container mx-auto py-6 space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Bot className="w-6 h-6 text-primary" />
                    <div>
                        <h1 className="text-2xl font-bold">{t('subagents.title')}</h1>
                        <p className="text-muted-foreground">Manage agent sessions and flow execution</p>
                    </div>
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                <div className="bg-card border border-border rounded-lg p-6">
                    <h3 className="text-lg font-semibold mb-4">{t('subagents.session')}</h3>
                    <p className="text-sm text-muted-foreground mb-4">Manage agent session</p>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">{t('subagents.session')} ID</label>
                            <input
                                type="text"
                                value={sessionId}
                                onChange={(e) => setSessionId(e.target.value)}
                                placeholder="Enter session ID"
                                className="w-full h-10 px-3 border border-border rounded-md bg-background"
                            />
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={handleInitialize}
                                disabled={loading || !sessionId.trim()}
                                className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                {loading ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <Bot className="h-4 w-4" />
                                )}
                                {t('subagents.initialize')}
                            </button>
                            <button
                                onClick={handleRefresh}
                                disabled={loading || !sessionId.trim()}
                                className="flex items-center gap-2 px-3 py-2 border border-border rounded-lg hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                <RefreshCw className="h-4 w-4" />
                            </button>
                            <button
                                onClick={handleCleanup}
                                disabled={loading || !sessionId.trim()}
                                className="flex items-center gap-2 px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                <Trash2 className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                </div>

                <div className="bg-card border border-border rounded-lg p-6">
                    <h3 className="text-lg font-semibold mb-4">{t('subagents.execute')}</h3>
                    <p className="text-sm text-muted-foreground mb-4">Execute a flow</p>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">{t('flows.title')}</label>
                            <select
                                className="w-full h-10 px-3 border border-border rounded-md bg-background"
                                value={selectedFlowId}
                                onChange={(e) => setSelectedFlowId(e.target.value)}
                            >
                                {flows.length === 0 ? (
                                    <option>No flows available</option>
                                ) : (
                                    flows.map((flow) => (
                                        <option key={flow.id} value={flow.id}>
                                            {flow.name}
                                        </option>
                                    ))
                                )}
                            </select>
                        </div>
                        <button
                            onClick={handleExecuteFlow}
                            disabled={executing || !selectedFlowId || !sessionId.trim()}
                            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            {executing ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <Play className="h-4 w-4" />
                            )}
                            {t('subagents.execute')}
                        </button>
                    </div>
                </div>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-red-600">{error}</p>
                </div>
            )}

            <div className="bg-card border border-border rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4">{t('subagents.subagents')}</h3>
                {agents.length === 0 ? (
                    <p className="text-muted-foreground">{t('subagents.noSubagents')}</p>
                ) : (
                    <div className="space-y-4">
                        {agents.map((agent) => (
                            <div
                                key={agent.id}
                                className="flex items-center justify-between p-4 border border-border rounded-lg"
                            >
                                <div className="flex items-center gap-4">
                                    <Bot className="h-8 w-8 text-primary" />
                                    <div>
                                        <p className="font-medium">{agent.id}</p>
                                        <p className="text-sm text-muted-foreground">
                                            {getRoleName(agent.role)}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    {agent.lastActivity && (
                                        <p className="text-sm text-muted-foreground">
                                            {t('subagents.lastActivity')}: {new Date(agent.lastActivity).toLocaleTimeString()}
                                        </p>
                                    )}
                                    {getStatusBadge(agent.status)}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {result && (
                <div className="bg-card border border-border rounded-lg p-6">
                    <h3 className="text-lg font-semibold mb-4">{t('subagents.execute')} Result</h3>
                    <div className="flex items-center gap-2 mb-4">
                        {result.success ? (
                            <CheckCircle className="h-5 w-5 text-green-500" />
                        ) : (
                            <XCircle className="h-5 w-5 text-red-500" />
                        )}
                        <span className={result.success ? 'text-green-500 font-medium' : 'text-red-500 font-medium'}>
                            {result.success ? 'Success' : 'Failed'}
                        </span>
                        <span className="text-muted-foreground">
                            ({result.totalDuration}ms)
                        </span>
                    </div>
                    <div className="space-y-2">
                        <h4 className="font-medium">{t('flows.steps')}:</h4>
                        {result.executionLog.map((log, index) => (
                            <div
                                key={index}
                                className="flex items-center justify-between p-2 border border-border rounded"
                            >
                                <span>{log.stepType}</span>
                                <span className={`px-2 py-1 rounded text-xs font-medium ${log.status === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                    {log.status}
                                </span>
                                <span className="text-sm text-muted-foreground">{log.duration}ms</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
