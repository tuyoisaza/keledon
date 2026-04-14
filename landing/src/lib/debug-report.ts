const MAX_LOGS = 100;
const MAX_LOG_LENGTH = 2000;

interface CapturedLog {
    timestamp: string;
    level: 'log' | 'warn' | 'error' | 'info';
    args: string[];
}

class DebugCapture {
    private logs: CapturedLog[] = [];
    private originalConsole: {
        log: typeof console.log;
        warn: typeof console.warn;
        error: typeof console.error;
        info: typeof console.info;
    };

    constructor() {
        this.originalConsole = {
            log: console.log,
            warn: console.warn,
            error: console.error,
            info: console.info,
        };
    }

    startCapture() {
        console.log = (...args: any[]) => {
            this.addLog('log', args);
            this.originalConsole.log(...args);
        };
        console.warn = (...args: any[]) => {
            this.addLog('warn', args);
            this.originalConsole.warn(...args);
        };
        console.error = (...args: any[]) => {
            this.addLog('error', args);
            this.originalConsole.error(...args);
        };
        console.info = (...args: any[]) => {
            this.addLog('info', args);
            this.originalConsole.info(...args);
        };
    }

    stopCapture() {
        console.log = this.originalConsole.log;
        console.warn = this.originalConsole.warn;
        console.error = this.originalConsole.error;
        console.info = this.originalConsole.info;
    }

    private addLog(level: CapturedLog['level'], args: any[]) {
        const serialized = args.map(arg => {
            if (typeof arg === 'object') {
                try {
                    return JSON.stringify(arg, null, 2);
                } catch {
                    return String(arg);
                }
            }
            return String(arg);
        }).join(' ');

        this.logs.push({
            timestamp: new Date().toISOString(),
            level,
            args: [serialized.slice(0, MAX_LOG_LENGTH)],
        });

        if (this.logs.length > MAX_LOGS) {
            this.logs = this.logs.slice(-MAX_LOGS);
        }
    }

    getLogs(): CapturedLog[] {
        return [...this.logs];
    }

    clearLogs() {
        this.logs = [];
    }
}

export const debugCapture = new DebugCapture();

export function getDebugInfo(): string {
    const timestamp = new Date().toISOString();
    const version = 'v0.0.78';

    const lines: string[] = [
        '═══════════════════════════════════════════════════════════════',
        '                     KELEDON DEBUG REPORT',
        '═══════════════════════════════════════════════════════════════',
        '',
        `Generated: ${timestamp}`,
        `App Version: ${version}`,
        `Domain: ${window.location.hostname}`,
        `Port: ${window.location.port || 'default'}`,
        `Full URL: ${window.location.href}`,
        `Protocol: ${window.location.protocol}`,
        '',
        '───────────────────────────────────────────────────────────────',
        'BROWSER INFO',
        '───────────────────────────────────────────────────────────────',
        `User Agent: ${navigator.userAgent}`,
        `Language: ${navigator.language}`,
        `Platform: ${navigator.platform}`,
        `Online: ${navigator.onLine}`,
        `Cookie Enabled: ${navigator.cookieEnabled}`,
        `Screen: ${window.screen.width}x${window.screen.height}`,
        `Viewport: ${window.innerWidth}x${window.innerHeight}`,
        '',
        '───────────────────────────────────────────────────────────────',
        'STORAGE',
        '───────────────────────────────────────────────────────────────',
    ];

    try {
        const authToken = sessionStorage.getItem('auth_token');
        lines.push(`Auth Token: ${authToken ? 'Present (' + authToken.length + ' chars)' : 'None'}`);
        lines.push(`Session Keys: ${sessionStorage.length}`);
        lines.push(`Local Keys: ${localStorage.length}`);
    } catch (e) {
        lines.push('Storage: Access denied');
    }

    lines.push('');
    lines.push('───────────────────────────────────────────────────────────────');
    lines.push('ENVIRONMENT VARS (PUBLIC)');
    lines.push('───────────────────────────────────────────────────────────────');

    const envVars = [
        'VITE_API_URL',
        'VITE_WEBSOCKET_URL',
        'VITE_LAUNCHER_URL',
    ];

    envVars.forEach(key => {
        const value = (import.meta.env as Record<string, string>)[key];
        if (value) {
            lines.push(`${key}: ${value}`);
        }
    });

    const logs = debugCapture.getLogs();
    lines.push('');
    lines.push('───────────────────────────────────────────────────────────────');
    lines.push(`CONSOLE LOGS (${logs.length} entries)`);
    lines.push('───────────────────────────────────────────────────────────────');

    if (logs.length === 0) {
        lines.push('No logs captured');
    } else {
        logs.forEach(log => {
            const icon = log.level === 'error' ? '❌' : log.level === 'warn' ? '⚠️' : log.level === 'info' ? 'ℹ️' : '📝';
            lines.push(`[${log.timestamp.split('T')[1].split('.')[0]}] ${icon} ${log.args.join(' ')}`);
        });
    }

    lines.push('');
    lines.push('═══════════════════════════════════════════════════════════════');
    lines.push('                        END OF REPORT');
    lines.push('═══════════════════════════════════════════════════════════════');

    return lines.join('\n');
}

export async function copyDebugReport(): Promise<boolean> {
    try {
        const report = getDebugInfo();
        await navigator.clipboard.writeText(report);
        return true;
    } catch (err) {
        console.error('Failed to copy debug report:', err);
        return false;
    }
}

debugCapture.startCapture();
