import React from 'react';
import { cn } from '@/lib/utils';

interface DebugTabProps {
    debugMode: boolean;
    handleDebugToggle: (enabled: boolean) => void;
    modelStatus: 'idle' | 'loading' | 'ready' | 'error';
    modelError: string | null;
    debugLogs: string;
    setDebugLogs: (logs: string) => void;
    addDebugLog: (msg: string) => void;
    setModelStatus: (status: 'idle' | 'loading' | 'ready' | 'error') => void;
}

export const DebugTab: React.FC<DebugTabProps> = ({
    debugMode,
    handleDebugToggle,
    modelStatus,
    modelError,
    debugLogs,
    setDebugLogs,
    addDebugLog,
    setModelStatus
}) => {
    return (
        <div className="space-y-6">
            {/* Debug Toggle */}
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
                    {/* Model Status */}
                    <div className="p-4 rounded-xl border border-border bg-card">
                        <h4 className="font-semibold text-foreground mb-3">🧠 Vosk Model Status</h4>
                        <div className="flex items-center gap-3">
                            <span className={cn(
                                'px-3 py-1 rounded-full text-sm font-medium',
                                modelStatus === 'ready' ? 'bg-green-500/20 text-green-500' :
                                    modelStatus === 'loading' ? 'bg-yellow-500/20 text-yellow-500' :
                                        modelStatus === 'error' ? 'bg-red-500/20 text-red-500' : 'bg-muted text-muted-foreground'
                            )}>
                                {modelStatus === 'ready' ? '✅ Ready' :
                                    modelStatus === 'loading' ? '⏳ Loading...' :
                                        modelStatus === 'error' ? '❌ Error' : '⚪ Idle'}
                            </span>
                            {modelError && <span className="text-sm text-red-500">{modelError}</span>}
                        </div>
                    </div>

                    {/* Debug Logs */}
                    <div className="p-4 rounded-xl border border-border bg-card">
                        <div className="flex items-center justify-between mb-3">
                            <h4 className="font-semibold text-foreground">📋 Debug Logs</h4>
                            <button
                                onClick={() => setDebugLogs('')}
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

                    {/* Test Actions - removed: no simulation in MVP */}
                </div>
            )}
        </div>
    );
};
