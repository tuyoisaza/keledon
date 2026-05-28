import { useState, useEffect } from 'react';
import { Bug } from 'lucide-react';
import { cn } from '@/lib/utils';
import { debugLogger } from '@/lib/debug-logger';

export default function ManagementDebugPage() {
    const [debugMode, setDebugMode] = useState(() => {
        const saved = localStorage.getItem('keldon-debug-mode');
        return saved === 'true';
    });
    const [debugLogs, setDebugLogs] = useState<string>('');
    const [modelStatus, setModelStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
    const [modelError] = useState<string | null>(null);

    const handleDebugToggle = (enabled: boolean) => {
        setDebugMode(enabled);
        localStorage.setItem('keldon-debug-mode', String(enabled));
        debugLogger.enable(enabled);
        if (enabled) {
            debugLogger.log('info', 'Debug mode enabled from Management page');
        }
    };

    useEffect(() => {
        if (!debugMode) return;

        const formatLogs = (logs: any[]) => logs.map(l =>
            `[${new Date(l.timestamp).toLocaleTimeString()}] [${l.level.toUpperCase()}] ${l.message} ${l.details ? JSON.stringify(l.details) : ''}`
        ).join('\n');

        setDebugLogs(formatLogs(debugLogger.getLogs()));

        const unsubscribe = debugLogger.subscribe((logs) => {
            setDebugLogs(formatLogs(logs));
        });

        return () => unsubscribe();
    }, [debugMode]);

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-foreground">Debug</h1>
                <p className="text-muted-foreground mt-1">Model status and debug logging</p>
            </div>

            <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-card">
                <div>
                    <h3 className="font-semibold text-foreground">Debug Mode</h3>
                    <p className="text-sm text-muted-foreground">Enable to see model status and logs</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                    <input
                        type="checkbox"
                        checked={debugMode}
                        onChange={(e) => handleDebugToggle(e.target.checked)}
                        className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-muted rounded-full peer peer-checked:bg-primary transition-colors after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full"></div>
                </label>
            </div>

            {debugMode && (
                <div className="space-y-6">
                    <div className="p-4 rounded-xl border border-border bg-card">
                        <h4 className="font-semibold text-foreground mb-3">Vosk Model Status</h4>
                        <div className="flex items-center gap-3">
                            <span className={cn(
                                'px-3 py-1 rounded-full text-sm font-medium',
                                modelStatus === 'ready' ? 'bg-green-500/20 text-green-500' :
                                    modelStatus === 'loading' ? 'bg-yellow-500/20 text-yellow-500' :
                                        modelStatus === 'error' ? 'bg-red-500/20 text-red-500' : 'bg-muted text-muted-foreground'
                            )}>
                                {modelStatus === 'ready' ? 'Ready' :
                                    modelStatus === 'loading' ? 'Loading...' :
                                        modelStatus === 'error' ? 'Error' : 'Idle'}
                            </span>
                            {modelError && <span className="text-sm text-red-500">{modelError}</span>}
                        </div>
                    </div>

                    <div className="p-4 rounded-xl border border-border bg-card">
                        <div className="flex items-center justify-between mb-3">
                            <h4 className="font-semibold text-foreground">Debug Logs</h4>
                            <button
                                onClick={() => {
                                    debugLogger.clear();
                                    setDebugLogs('');
                                }}
                                className="text-xs px-2 py-1 rounded bg-muted hover:bg-muted/80 text-muted-foreground"
                            >
                                Clear
                            </button>
                        </div>
                        <textarea
                            value={debugLogs}
                            readOnly
                            className="w-full h-48 p-3 rounded-lg bg-muted/50 border border-border text-sm font-mono text-muted-foreground resize-y"
                            placeholder="Debug logs will appear here when debug mode is active..."
                        />
                    </div>
                </div>
            )}

            {!debugMode && (
                <div className="text-center py-12 text-muted-foreground">
                    <Bug className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Enable debug mode to see model status and logs.</p>
                </div>
            )}
        </div>
    );
}
