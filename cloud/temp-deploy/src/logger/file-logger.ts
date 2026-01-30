import { ConsoleLogger } from '@nestjs/common';
import fs from 'fs';
import path from 'path';

export class FileLogger extends ConsoleLogger {
    private logFile: string;

    constructor(context?: string) {
        const resolvedContext = context || 'App';
        super(resolvedContext, { timestamp: true });
        const logDir = path.resolve(process.cwd(), 'logs');
        if (!fs.existsSync(logDir)) {
            fs.mkdirSync(logDir, { recursive: true });
        }
        this.logFile = path.join(logDir, 'cloud.log');
    }

    log(message: any, context?: string) {
        super.log(message, context);
        this.writeToFile('LOG', message, undefined, context);
    }

    error(message: any, trace?: string, context?: string) {
        super.error(message, trace, context);
        this.writeToFile('ERROR', message, trace, context);
    }

    warn(message: any, context?: string) {
        super.warn(message, context);
        this.writeToFile('WARN', message, undefined, context);
    }

    debug(message: any, context?: string) {
        super.debug(message, context);
        this.writeToFile('DEBUG', message, undefined, context);
    }

    verbose(message: any, context?: string) {
        super.verbose(message, context);
        this.writeToFile('VERBOSE', message, undefined, context);
    }

    private writeToFile(level: string, message: any, trace?: string, context?: string) {
        const timestamp = new Date().toISOString();
        const ctx = context || this.context || 'App';
        const base = `[${timestamp}] [${level}] [${ctx}] ${message}`;
        const entry = trace ? `${base}\n${trace}` : base;
        fs.appendFileSync(this.logFile, `${entry}\n`, { encoding: 'utf8' });
    }
}
