import { useState, useEffect } from 'react';
import { useTranslation } from '@/context/I18nContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
        const statusKey = `subagents.status.${status}` as const;
        const variant = status === 'active' ? 'default' : status === 'error' ? 'destructive' : 'secondary';
        return (
            <Badge variant={variant as any} className="gap-1">
                {getStatusIcon(status)}
                {t(statusKey)}
            </Badge>
        );
    };

    const getRoleName = (role: string) => {
        const roleKey = `subagents.role.${role}` as const;
        return t(roleKey);
    };

    return (
        <div className="container mx-auto py-6 space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold">{t('subagents.title')}</h1>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>{t('subagents.session')}</CardTitle>
                        <CardDescription>Manage agent session</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="sessionId">{t('subagents.session')} ID</Label>
                            <Input
                                id="sessionId"
                                value={sessionId}
                                onChange={(e) => setSessionId(e.target.value)}
                                placeholder="Enter session ID"
                            />
                        </div>
                        <div className="flex gap-2">
                            <Button onClick={handleInitialize} disabled={loading || !sessionId.trim()}>
                                {loading ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <Bot className="h-4 w-4" />
                                )}
                                {t('subagents.initialize')}
                            </Button>
                            <Button variant="outline" onClick={handleRefresh} disabled={loading || !sessionId.trim()}>
                                <RefreshCw className="h-4 w-4" />
                            </Button>
                            <Button variant="destructive" onClick={handleCleanup} disabled={loading || !sessionId.trim()}>
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>{t('subagents.execute')}</CardTitle>
                        <CardDescription>Execute a flow</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label>{t('flows.title')}</Label>
                            <select
                                className="w-full h-10 px-3 border rounded-md bg-background"
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
                        <Button
                            className="w-full"
                            onClick={handleExecuteFlow}
                            disabled={executing || !selectedFlowId || !sessionId.trim()}
                        >
                            {executing ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <Play className="h-4 w-4" />
                            )}
                            {t('subagents.execute')}
                        </Button>
                    </CardContent>
                </Card>
            </div>

            {error && (
                <Card className="border-red-500">
                    <CardContent className="pt-4">
                        <p className="text-red-500">{error}</p>
                    </CardContent>
                </Card>
            )}

            <Card>
                <CardHeader>
                    <CardTitle>{t('subagents.agents')}</CardTitle>
                </CardHeader>
                <CardContent>
                    {agents.length === 0 ? (
                        <p className="text-muted-foreground">{t('subagents.noAgents')}</p>
                    ) : (
                        <div className="space-y-4">
                            {agents.map((agent) => (
                                <div
                                    key={agent.id}
                                    className="flex items-center justify-between p-4 border rounded-lg"
                                >
                                    <div className="flex items-center gap-4">
                                        <Bot className="h-8 w-8" />
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
                </CardContent>
            </Card>

            {result && (
                <Card>
                    <CardHeader>
                        <CardTitle>{t('subagents.execute')} Result</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center gap-2">
                            {result.success ? (
                                <CheckCircle className="h-5 w-5 text-green-500" />
                            ) : (
                                <XCircle className="h-5 w-5 text-red-500" />
                            )}
                            <span className={result.success ? 'text-green-500' : 'text-red-500'}>
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
                                    className="flex items-center justify-between p-2 border rounded"
                                >
                                    <span>{log.stepType}</span>
                                    <Badge variant={log.status === 'success' ? 'default' : 'destructive'}>
                                        {log.status}
                                    </Badge>
                                    <span className="text-sm text-muted-foreground">{log.duration}ms</span>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
