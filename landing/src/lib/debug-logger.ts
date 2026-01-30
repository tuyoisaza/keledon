export type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LogEntry {
    timestamp: number;
    level: LogLevel;
    message: string;
    details?: any;
}

class DebugLogger {
    private logs: LogEntry[] = [];
    private listeners: ((logs: LogEntry[]) => void)[] = [];
    private maxLogs = 1000;
    private isEnabled = true; // Enabled by default to catch early issues

    constructor() {
        // Recover logs from session storage if possible
        try {
            const savedLogs = sessionStorage.getItem('keledon_debug_logs');
            if (savedLogs) {
                this.logs = JSON.parse(savedLogs);
                if (this.logs.length > 0) {
                    this.log('info', 'Logger re-initialized, previous logs restored');
                }
            }
        } catch (e) {
            console.error('Failed to restore logs', e);
        }
    }

    enable(enabled: boolean) {
        this.isEnabled = enabled;
        if (enabled) {
            this.log('info', 'Debug logging enabled');
        }
    }

    log(level: LogLevel, message: string, details?: any) {
        if (!this.isEnabled) return;

        const entry: LogEntry = {
            timestamp: Date.now(),
            level,
            message,
            details
        };

        this.logs.unshift(entry);

        // Keep within limit
        if (this.logs.length > this.maxLogs) {
            this.logs = this.logs.slice(0, this.maxLogs);
        }

        // Persist to session storage so logs survive reloads
        try {
            sessionStorage.setItem('keledon_debug_logs', JSON.stringify(this.logs));
        } catch (e) {
            // Ignore storage errors
        }

        this.notifyListeners();

        // Also log to console
        const style = level === 'error' ? 'color: red' :
            level === 'warn' ? 'color: orange' :
                'color: blue';
        console.log(`%c[${level.toUpperCase()}] ${message}`, style, details || '');
    }

    getLogs() {
        return this.logs;
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
