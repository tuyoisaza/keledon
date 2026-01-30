import { useEffect, useMemo, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { LayoutGrid, Network, Check, AlertTriangle } from 'lucide-react';
import { InterfacesManager } from '@/components/flows/InterfacesManager';
import { useAuth } from '@/context/AuthContext';

interface FlowDefinition {
    id: string;
    name: string;
    description?: string;
    interfaceId?: string;
    category?: 'talk' | 'case';
    intentTags?: string[];
}

interface FlowVersion {
    id: string;
    flowDefinitionId: string;
    version: number;
    status: 'draft' | 'approved' | 'deprecated';
    steps: FlowStep[];
}

interface FlowStep {
    id: string;
    action: string;
    selector?: string;
    value?: string;
    url?: string;
    timeout?: number;
    waitMs?: number;
    humanDescription?: string;
}

interface ManagedInterface {
    id: string;
    name: string;
    baseUrl: string;
    category?: 'talk' | 'case';
}

interface RpaProvider {
    id: string;
    name: string;
    description: string;
    requiresBackend: boolean;
    requiresApiKey: boolean;
}

interface TenantFlowPermission {
    id: string;
    companyId: string;
    flowDefinitionId: string;
    isEnabled: boolean;
    defaultForIntent?: string;
}

interface IntentFlowMapping {
    id: string;
    companyId: string;
    intent: string;
    allowedFlowDefinitionIds: string[];
}

interface RecordedAction {
    id: string;
    type: string;
    target?: {
        selector?: string;
        xpath?: string;
        text?: string;
    };
    value?: string;
    humanDescription?: string;
    timestamp: number;
}

const STEP_ICONS: Record<string, string> = {
    click: '🖱️',
    fill: '⌨️',
    read: '📖',
    navigate: '🌐',
    wait_for: '⏳',
};

import { API_URL, WEBSOCKET_URL } from '@/lib/config';
const CLOUD_URL = API_URL;

export default function FlowsPage() {
    const { user } = useAuth();
    const companyId = user?.company_id;

    const [activeTab, setActiveTab] = useState<'flows' | 'interfaces' | 'routing'>('flows');
    const [flowDefinitions, setFlowDefinitions] = useState<FlowDefinition[]>([]);
    const [flowVersions, setFlowVersions] = useState<FlowVersion[]>([]);
    const [interfaces, setInterfaces] = useState<ManagedInterface[]>([]);
    const [tenantPermissions, setTenantPermissions] = useState<TenantFlowPermission[]>([]);
    const [intentMappings, setIntentMappings] = useState<IntentFlowMapping[]>([]);

    const [selectedFlow, setSelectedFlow] = useState<FlowDefinition | null>(null);
    const [selectedProvider, setSelectedProvider] = useState<string>(() => localStorage.getItem('keldon-rpa-provider') || 'native-dom');
    const [rpaProviders, setRpaProviders] = useState<RpaProvider[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const [isRecording, setIsRecording] = useState(false);
    const [recordedActions, setRecordedActions] = useState<RecordedAction[]>([]);
    const [extensionConnected, setExtensionConnected] = useState(false);
    const [recordingError, setRecordingError] = useState<string | null>(null);

    const [showFlowForm, setShowFlowForm] = useState(false);
    const [flowForm, setFlowForm] = useState({
        name: '',
        description: '',
        interfaceId: '',
        category: 'case' as 'talk' | 'case',
        intentTags: ''
    });

    const [mappingIntent, setMappingIntent] = useState('');
    const [mappingAllowedIds, setMappingAllowedIds] = useState<string[]>([]);

    const socketRef = useRef<Socket | null>(null);

    const versionsByDefinition = useMemo(() => {
        return flowVersions.reduce<Record<string, FlowVersion[]>>((acc, version) => {
            acc[version.flowDefinitionId] = acc[version.flowDefinitionId] || [];
            acc[version.flowDefinitionId].push(version);
            return acc;
        }, {});
    }, [flowVersions]);

    const selectedVersions = selectedFlow ? (versionsByDefinition[selectedFlow.id] || []) : [];
    const approvedVersion = selectedVersions.find(version => version.status === 'approved') || selectedVersions[0];

    useEffect(() => {
        fetchData();
        connectWebSocket();

        return () => {
            socketRef.current?.disconnect();
        };
    }, []);

    useEffect(() => {
        if (!companyId) return;
        fetchRoutingData();
    }, [companyId]);

    useEffect(() => {
        localStorage.setItem('keldon-rpa-provider', selectedProvider);
    }, [selectedProvider]);

    const connectWebSocket = () => {
        const socket = io(WEBSOCKET_URL, {
            transports: ['websocket'],
        });

        socket.on('connect', () => {
            socket.emit('register-admin');
        });

        socket.on('extension-connected', () => {
            setExtensionConnected(true);
            setRecordingError(null);
        });

        socket.on('extension-disconnected', () => {
            setExtensionConnected(false);
        });

        socket.on('recording-started', () => {
            setIsRecording(true);
            setRecordedActions([]);
            setRecordingError(null);
        });

        socket.on('recording-stopped', () => {
            setIsRecording(false);
        });

        socket.on('recording-error', (data) => {
            setRecordingError(data.error);
            setIsRecording(false);
        });

        socket.on('action-recorded', (data) => {
            setRecordedActions(prev => [...prev, data.action]);
        });

        socket.on('recording-complete', (data) => {
            setRecordedActions(data.actions || []);
            setIsRecording(false);
        });

        socketRef.current = socket;
    };

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [flowRes, versionRes, interfaceRes] = await Promise.all([
                fetch(`${CLOUD_URL}/api/flow-definitions`),
                fetch(`${CLOUD_URL}/api/flow-versions`),
                fetch(`${CLOUD_URL}/api/interfaces`),
            ]);

            if (flowRes.ok) setFlowDefinitions(await flowRes.json());
            if (versionRes.ok) setFlowVersions(await versionRes.json());
            if (interfaceRes.ok) setInterfaces(await interfaceRes.json());

            const rpaRes = await fetch(`${CLOUD_URL}/api/rpa-providers`);
            if (rpaRes.ok) {
                const data = await rpaRes.json();
                if (Array.isArray(data) && data.length > 0) {
                    setRpaProviders(data);
                } else {
                    throw new Error('Empty provider list');
                }
            } else {
                throw new Error('Failed to fetch providers');
            }
        } catch (error) {
            console.error('Failed to fetch core data:', error);
            setRpaProviders([
                { id: 'native-dom', name: 'Native DOM Automation', description: 'Browser APIs and DOM-native execution', requiresBackend: false, requiresApiKey: false },
                { id: 'playwright', name: 'Playwright', description: 'Cross-browser automation with Playwright', requiresBackend: true, requiresApiKey: false },
                { id: 'chrome-mv3', name: 'Chrome Extensions (MV3)', description: 'Manifest V3 extension automation', requiresBackend: false, requiresApiKey: false }
            ]);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchRoutingData = async () => {
        if (!companyId) return;
        try {
            const [permissionsRes, mappingsRes] = await Promise.all([
                fetch(`${CLOUD_URL}/api/tenant-flow-permissions/${companyId}`),
                fetch(`${CLOUD_URL}/api/intent-flow-mappings/${companyId}`)
            ]);

            if (permissionsRes.ok) setTenantPermissions(await permissionsRes.json());
            if (mappingsRes.ok) setIntentMappings(await mappingsRes.json());
        } catch (error) {
            console.error('Failed to fetch routing data:', error);
        }
    };

    const getInterfaceName = (id?: string) => {
        return interfaces.find(i => i.id === id)?.name || 'Unknown';
    };

    const startRecording = () => {
        setRecordingError(null);
        socketRef.current?.emit('start-recording', {});
    };

    const stopRecording = () => {
        socketRef.current?.emit('stop-recording', {});
    };

    const buildFlowSteps = (actions: RecordedAction[]): FlowStep[] => {
        return actions.map((action, idx) => {
            const selector = action.target?.selector || action.target?.xpath || '';
            const base: FlowStep = {
                id: `step-${idx + 1}`,
                action: action.type,
                selector,
                value: action.value,
                humanDescription: action.humanDescription
            };

            if (action.type === 'type') {
                base.action = 'fill';
            }
            if (action.type === 'wait') {
                base.action = 'wait_for';
                base.timeout = 5000;
            }

            return base;
        });
    };

    const createFlowDefinition = async () => {
        const payload = {
            companyId: companyId || undefined,
            name: flowForm.name,
            description: flowForm.description,
            interfaceId: flowForm.interfaceId || undefined,
            category: flowForm.category,
            intentTags: flowForm.intentTags.split(',').map(t => t.trim()).filter(Boolean),
        };

        const res = await fetch(`${CLOUD_URL}/api/flow-definitions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });

        if (res.ok) {
            await fetchData();
            setShowFlowForm(false);
            setFlowForm({ name: '', description: '', interfaceId: '', category: 'case', intentTags: '' });
        }
    };

    const createDraftVersion = async () => {
        if (!selectedFlow || recordedActions.length === 0) return;

        const existingVersions = versionsByDefinition[selectedFlow.id] || [];
        const nextVersion = existingVersions.length > 0 ? Math.max(...existingVersions.map(v => v.version)) + 1 : 1;
        const steps = buildFlowSteps(recordedActions);

        const res = await fetch(`${CLOUD_URL}/api/flow-versions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                flowDefinitionId: selectedFlow.id,
                version: nextVersion,
                status: 'draft',
                steps,
            }),
        });

        if (res.ok) {
            setRecordedActions([]);
            await fetchData();
        }
    };

    const approveVersion = async (version: FlowVersion) => {
        const res = await fetch(`${CLOUD_URL}/api/flow-versions/${version.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'approved' }),
        });

        if (res.ok) {
            await fetchData();
        }
    };

    const saveTenantPermissions = async () => {
        if (!companyId) return;
        const payload = flowDefinitions.map(def => {
            const existing = tenantPermissions.find(p => p.flowDefinitionId === def.id);
            return {
                companyId,
                flowDefinitionId: def.id,
                isEnabled: existing?.isEnabled ?? false,
            };
        });

        const res = await fetch(`${CLOUD_URL}/api/tenant-flow-permissions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });

        if (res.ok) {
            await fetchRoutingData();
        }
    };

    const togglePermission = (flowId: string, enabled: boolean) => {
        setTenantPermissions(prev => {
            const existing = prev.find(p => p.flowDefinitionId === flowId);
            if (existing) {
                return prev.map(p => p.flowDefinitionId === flowId ? { ...p, isEnabled: enabled } : p);
            }
            if (!companyId) return prev;
            return [...prev, {
                id: `local-${flowId}`,
                companyId,
                flowDefinitionId: flowId,
                isEnabled: enabled,
            }];
        });
    };

    const saveIntentMapping = async () => {
        if (!companyId || !mappingIntent || mappingAllowedIds.length === 0) return;
        const res = await fetch(`${CLOUD_URL}/api/intent-flow-mappings`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                companyId,
                intent: mappingIntent,
                allowedFlowDefinitionIds: mappingAllowedIds,
            }),
        });

        if (res.ok) {
            setMappingIntent('');
            setMappingAllowedIds([]);
            await fetchRoutingData();
        }
    };

    if (isLoading) {
        return <div className="p-6 text-gray-400">Loading flows...</div>;
    }

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-white">Flows & Interfaces</h1>
                    <p className="text-gray-400 text-sm">Deterministic flow versions and interface inventory.</p>
                </div>
                {activeTab === 'flows' && (
                    <button
                        onClick={() => setShowFlowForm(true)}
                        className="px-4 py-2 bg-teal-500 text-black font-semibold rounded-lg hover:bg-teal-400 transition"
                    >
                        + New Flow Definition
                    </button>
                )}
            </div>

            <div className="flex gap-4 border-b border-gray-700">
                <button
                    onClick={() => setActiveTab('flows')}
                    className={`flex items-center gap-2 px-4 py-2 border-b-2 transition-colors ${activeTab === 'flows'
                            ? 'border-teal-500 text-teal-400'
                            : 'border-transparent text-gray-400 hover:text-white'
                        }`}
                >
                    <LayoutGrid className="w-4 h-4" />
                    Flows
                </button>
                <button
                    onClick={() => setActiveTab('interfaces')}
                    className={`flex items-center gap-2 px-4 py-2 border-b-2 transition-colors ${activeTab === 'interfaces'
                            ? 'border-teal-500 text-teal-400'
                            : 'border-transparent text-gray-400 hover:text-white'
                        }`}
                >
                    <Network className="w-4 h-4" />
                    Interfaces
                </button>
                <button
                    onClick={() => setActiveTab('routing')}
                    className={`flex items-center gap-2 px-4 py-2 border-b-2 transition-colors ${activeTab === 'routing'
                            ? 'border-teal-500 text-teal-400'
                            : 'border-transparent text-gray-400 hover:text-white'
                        }`}
                >
                    <Check className="w-4 h-4" />
                    Routing
                </button>
            </div>

            {activeTab === 'interfaces' && (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <InterfacesManager />
                </div>
            )}

            {activeTab === 'flows' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className={`flex items-center justify-between p-3 rounded-lg border ${extensionConnected ? 'bg-green-500/10 border-green-500/30' : 'bg-yellow-500/10 border-yellow-500/30'}`}>
                        <div className="flex items-center gap-2 text-sm">
                            <div className={`w-2 h-2 rounded-full ${extensionConnected ? 'bg-green-400' : 'bg-yellow-400 animate-pulse'}`} />
                            <span className={extensionConnected ? 'text-green-400' : 'text-yellow-400'}>
                                {extensionConnected
                                    ? '🧩 Chrome Extension connected'
                                    : '⚠️ Chrome Extension not connected'}
                            </span>
                        </div>
                        <button
                            onClick={() => {
                                socketRef.current?.emit('check-extensions');
                                setRecordingError(null);
                            }}
                            className="px-3 py-1 text-xs bg-gray-700 text-white rounded hover:bg-gray-600 transition"
                        >
                            🔄 Test Connection
                        </button>
                    </div>

                    {recordingError && (
                        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                            <p className="text-sm text-red-400">❌ {recordingError}</p>
                        </div>
                    )}

                    <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-sm font-semibold text-white">Execution Engine</h3>
                                <p className="text-xs text-gray-400 mt-1">Choose how flows are executed.</p>
                            </div>
                            <select
                                value={selectedProvider}
                                onChange={(e) => setSelectedProvider(e.target.value)}
                                className="bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                            >
                                {rpaProviders.map(provider => (
                                    <option key={provider.id} value={provider.id}>
                                        {provider.name} {provider.requiresApiKey && '🔑'}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-1 space-y-3">
                            {flowDefinitions.map(flow => (
                                <div
                                    key={flow.id}
                                    onClick={() => setSelectedFlow(flow)}
                                    className={`p-4 rounded-xl border cursor-pointer transition ${selectedFlow?.id === flow.id
                                            ? 'border-teal-500 bg-teal-500/10'
                                            : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
                                        }`}
                                >
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h3 className="font-semibold text-white">{flow.name}</h3>
                                            <p className="text-xs text-gray-400 mt-1">
                                                {getInterfaceName(flow.interfaceId)} • {flow.category || 'case'}
                                            </p>
                                        </div>
                                        <span className="text-xs text-gray-500">{(versionsByDefinition[flow.id] || []).length} versions</span>
                                    </div>
                                    {flow.intentTags?.length ? (
                                        <div className="text-xs text-gray-500 mt-2">Intents: {flow.intentTags.join(', ')}</div>
                                    ) : null}
                                </div>
                            ))}
                        </div>

                        <div className="lg:col-span-2">
                            {selectedFlow ? (
                                <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-6 space-y-4">
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <h2 className="text-xl font-bold text-white">{selectedFlow.name}</h2>
                                            <p className="text-gray-400 text-sm">{selectedFlow.description || 'No description'}</p>
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={isRecording ? stopRecording : startRecording}
                                                disabled={!extensionConnected && !isRecording}
                                                className={`px-3 py-1.5 text-sm font-medium rounded transition ${isRecording
                                                        ? 'bg-red-500 text-white animate-pulse'
                                                        : extensionConnected
                                                            ? 'bg-gray-700 text-white hover:bg-gray-600'
                                                            : 'bg-gray-700/50 text-gray-500 cursor-not-allowed'
                                                    }`}
                                            >
                                                {isRecording ? '⏹️ Stop' : '🎬 Record'}
                                            </button>
                                            <button
                                                onClick={createDraftVersion}
                                                disabled={recordedActions.length === 0}
                                                className="px-3 py-1.5 text-sm font-medium bg-teal-500 text-black rounded hover:bg-teal-400 transition disabled:opacity-50"
                                            >
                                                Save Draft
                                            </button>
                                        </div>
                                    </div>

                                    {recordedActions.length > 0 && !isRecording && (
                                        <div className="p-3 bg-teal-500/10 border border-teal-500/30 rounded-lg">
                                            <p className="text-sm text-teal-400 font-medium">✅ {recordedActions.length} actions recorded</p>
                                        </div>
                                    )}

                                    <div className="space-y-2">
                                        <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">Versions</h3>
                                        {selectedVersions.length === 0 ? (
                                            <div className="text-sm text-gray-500">No versions yet.</div>
                                        ) : (
                                            <div className="space-y-2">
                                                {selectedVersions.map(version => (
                                                    <div key={version.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-900/50 border border-gray-700">
                                                        <div className="text-sm text-gray-200">v{version.version} • {version.status}</div>
                                                        {version.status !== 'approved' && (
                                                            <button
                                                                onClick={() => approveVersion(version)}
                                                                className="text-xs px-2 py-1 rounded bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30"
                                                            >
                                                                Approve
                                                            </button>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    <div className="space-y-2">
                                        <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">Approved Steps</h3>
                                        {approvedVersion ? (
                                            <div className="space-y-2">
                                                {approvedVersion.steps.map((step, idx) => (
                                                    <div key={step.id} className="flex items-center gap-3 p-3 bg-gray-900/50 rounded-lg border border-gray-700">
                                                        <span className="text-gray-500 text-sm w-6">{idx + 1}</span>
                                                        <span className="text-xl">{STEP_ICONS[step.action] || '⚙️'}</span>
                                                        <div className="flex-1">
                                                            <div className="text-white font-medium">{step.humanDescription || step.action}</div>
                                                            <div className="text-xs text-gray-400 mt-0.5">
                                                                {step.selector || step.value || step.url || ''}
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="text-sm text-gray-500">No approved version yet.</div>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="flex items-center justify-center h-64 bg-gray-800/30 rounded-xl border border-gray-700">
                                    <p className="text-gray-500">Select a flow definition to view details</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'routing' && (
                <div className="space-y-6">
                    {!companyId && (
                        <div className="flex items-center gap-2 p-3 rounded-lg border border-yellow-500/30 bg-yellow-500/10 text-yellow-300 text-sm">
                            <AlertTriangle className="w-4 h-4" />
                            Assign a company to configure routing.
                        </div>
                    )}

                    <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-6 space-y-4">
                        <h3 className="text-lg font-semibold text-white">Approved Flow Allowlist</h3>
                        <div className="space-y-2">
                            {flowDefinitions.map(flow => {
                                const enabled = tenantPermissions.find(p => p.flowDefinitionId === flow.id)?.isEnabled ?? false;
                                return (
                                    <label key={flow.id} className="flex items-center justify-between text-sm text-gray-200 bg-gray-900/50 border border-gray-700 rounded-lg px-3 py-2">
                                        <span>{flow.name}</span>
                                        <input
                                            type="checkbox"
                                            checked={enabled}
                                            onChange={(e) => togglePermission(flow.id, e.target.checked)}
                                        />
                                    </label>
                                );
                            })}
                        </div>
                        <button
                            onClick={saveTenantPermissions}
                            className="px-4 py-2 rounded-lg bg-teal-500 text-black font-medium hover:bg-teal-400"
                        >
                            Save Allowed Flows
                        </button>
                    </div>

                    <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-6 space-y-4">
                        <h3 className="text-lg font-semibold text-white">Intent → Flow Mapping</h3>
                        <div className="space-y-2">
                            {intentMappings.length === 0 ? (
                                <div className="text-sm text-gray-400">No intent mappings yet.</div>
                            ) : (
                                intentMappings.map(mapping => (
                                    <div key={mapping.id} className="text-sm text-gray-300 border border-gray-700 rounded-lg px-3 py-2">
                                        <div className="font-medium">{mapping.intent}</div>
                                        <div className="text-xs text-gray-500">Allowed: {mapping.allowedFlowDefinitionIds.length} flows</div>
                                    </div>
                                ))
                            )}
                        </div>

                        <div className="border-t border-gray-700 pt-4 space-y-3">
                            <div className="text-sm text-gray-400">Add mapping</div>
                            <input
                                value={mappingIntent}
                                onChange={(e) => setMappingIntent(e.target.value)}
                                placeholder="Intent name"
                                className="w-full px-3 py-2 rounded-lg bg-gray-900 border border-gray-600 text-white text-sm"
                            />
                            <div className="space-y-2">
                                {flowDefinitions.map(flow => (
                                    <label key={flow.id} className="flex items-center justify-between text-sm text-gray-200 bg-gray-900/50 border border-gray-700 rounded-lg px-3 py-2">
                                        <span>{flow.name}</span>
                                        <input
                                            type="checkbox"
                                            checked={mappingAllowedIds.includes(flow.id)}
                                            onChange={(e) =>
                                                setMappingAllowedIds(prev =>
                                                    e.target.checked ? [...prev, flow.id] : prev.filter(id => id !== flow.id)
                                                )
                                            }
                                        />
                                    </label>
                                ))}
                            </div>
                            <button
                                onClick={saveIntentMapping}
                                className="px-4 py-2 rounded-lg bg-teal-500 text-black font-medium hover:bg-teal-400"
                            >
                                Save Intent Mapping
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showFlowForm && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
                    <div className="bg-gray-800 rounded-xl border border-gray-600 p-6 w-full max-w-md">
                        <h3 className="text-lg font-bold text-white mb-4">New Flow Definition</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm text-gray-400 mb-1">Name</label>
                                <input
                                    value={flowForm.name}
                                    onChange={(e) => setFlowForm({ ...flowForm, name: e.target.value })}
                                    className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-gray-400 mb-1">Description</label>
                                <textarea
                                    value={flowForm.description}
                                    onChange={(e) => setFlowForm({ ...flowForm, description: e.target.value })}
                                    className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-gray-400 mb-1">Interface</label>
                                <select
                                    value={flowForm.interfaceId}
                                    onChange={(e) => setFlowForm({ ...flowForm, interfaceId: e.target.value })}
                                    className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white"
                                >
                                    <option value="">Select interface</option>
                                    {interfaces.map(iface => (
                                        <option key={iface.id} value={iface.id}>{iface.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm text-gray-400 mb-1">Category</label>
                                <select
                                    value={flowForm.category}
                                    onChange={(e) => setFlowForm({ ...flowForm, category: e.target.value as 'talk' | 'case' })}
                                    className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white"
                                >
                                    <option value="talk">Talk</option>
                                    <option value="case">Case</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm text-gray-400 mb-1">Intent Tags</label>
                                <input
                                    value={flowForm.intentTags}
                                    onChange={(e) => setFlowForm({ ...flowForm, intentTags: e.target.value })}
                                    placeholder="create_case, update_ticket"
                                    className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white"
                                />
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 mt-6">
                            <button
                                onClick={() => setShowFlowForm(false)}
                                className="px-4 py-2 text-gray-400 hover:text-white"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={createFlowDefinition}
                                className="px-4 py-2 bg-teal-500 text-black font-semibold rounded-lg hover:bg-teal-400"
                            >
                                Create
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
