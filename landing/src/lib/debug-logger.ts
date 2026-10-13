import { redactDiagnostic } from './diagnostics-core';
export type LogLevel = 'info' | 'warn' | 'error' | 'debug';

function initialDebugMode() {
    if (import.meta.env.DEV) return true;
    try { return localStorage.getItem('keldon-debug-mode') === 'true'; } catch { return false; }
}

interface LogEntry {
    timestamp: number;
    level: LogLevel;
    message: string;
    details?: unknown;
}

class DebugLogger {
    private logs: LogEntry[] = [];
    private listeners: ((logs: LogEntry[]) => void)[] = [];
    private maxLogs = 1000;
    private enabled = initialDebugMode(); // Non-production defaults ON; production is explicit opt-in.

    constructor() {
        // Do not restore arbitrary pre-sanitization log payloads from older releases.
        try { sessionStorage.removeItem('keledon_debug_logs'); } catch { /* Storage may be unavailable. */ }
    }

    enable(enabled: boolean) {
        this.enabled = enabled;
        if (enabled) {
            this.log('info', 'Debug logging enabled');
        } else {
            this.notifyListeners();
        }
    }

    log(level: LogLevel, message: string, details?: unknown) {
        if (!this.enabled) return;

        const entry: LogEntry = {
            timestamp: Date.now(),
            level,
            message: String(redactDiagnostic(message)),
            details: redactDiagnostic(details)
        };

        this.logs.unshift(entry);

        // Keep within limit
        if (this.logs.length > this.maxLogs) {
            this.logs = this.logs.slice(0, this.maxLogs);
        }

        // Persist to session storage so logs survive reloads
        try {
            sessionStorage.setItem('keledon_debug_logs', JSON.stringify(this.logs));
        } catch {
            // Ignore storage errors
        }

        this.notifyListeners();

        // Also log to console
        const style = level === 'error' ? 'color: red' :
            level === 'warn' ? 'color: orange' :
                'color: blue';
        console.log(`%c[${level.toUpperCase()}] ${entry.message}`, style, entry.details || '');
    }

    getLogs() {
        return this.logs.map(entry => ({ ...entry }));
    }

    isEnabled() {
        return this.enabled;
    }

    clear() {
        this.logs = [];
        sessionStorage.removeItem('keledon_debug_logs');
        this.notifyListeners();
    }

    subscribe(listener: (logs: LogEntry[]) => void) {
        this.listeners.push(listener);
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }

    private notifyListeners() {
        this.listeners.forEach(listener => listener(this.logs));
    }
}

export const debugLogger = new DebugLogger();
