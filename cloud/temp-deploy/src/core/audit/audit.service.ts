import { Injectable, Logger } from '@nestjs/common';
import { KeledonAction, AutonomyContext } from '../interfaces/action.interface';
import { PolicyResult } from '../policy/policy.engine';

export interface AuditEntry {
    timestamp: string;
    accountId: string;
    action: KeledonAction;
    context: AutonomyContext;
    policyResult: PolicyResult;
    executionResult?: any;
}

@Injectable()
export class AuditService {
    private readonly logger = new Logger(AuditService.name);

    // In a real implementation, this would save to a database (Supabase/Postgres)
    async log(entry: AuditEntry): Promise<void> {
        this.logger.log(`[AUDIT] ${entry.timestamp} | ${entry.action.type} | ${entry.policyResult.decision} | ${entry.action.intent}`);

        // TODO: Persist to DB
        // await this.supabase.from('audit_logs').insert(entry);
    }
}
