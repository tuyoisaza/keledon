import { Injectable, Logger } from '@nestjs/common';
import { ActionRisk, AutonomyContext, KeledonAction } from '../interfaces/action.interface';

export enum PolicyDecision {
    ALLOW = 'ALLOW',
    ALLOW_WITH_CONSTRAINTS = 'ALLOW_WITH_CONSTRAINTS',
    DENY = 'DENY',
    REQUIRE_QA = 'REQUIRE_QA'
}

export interface PolicyResult {
    decision: PolicyDecision;
    reason?: string;
    modifications?: any;
}

@Injectable()
export class PolicyEngine {
    private readonly logger = new Logger(PolicyEngine.name);

    public evaluate(action: KeledonAction, context: AutonomyContext): PolicyResult {
        this.logger.log(`Evaluating policy for action: ${action.intent} (Risk: ${action.risk}) - Current Level: ${context.level}`);

        // 1. Check Autonomy Level Cap
        if (context.level < action.requiredLevel) {
            return {
                decision: PolicyDecision.DENY,
                reason: `Insufficient autonomy level. Required: ${action.requiredLevel}, Current: ${context.level}`
            };
        }

        // 2. Risk-based Policies (Simplified for now)
        switch (context.level) {
            case 1: // Observer - Read Only
                if (action.type !== 'READ' && action.type !== 'WAIT') {
                    return { decision: PolicyDecision.DENY, reason: 'Level 1 allows READ only.' };
                }
                break;
            case 2: // Read + Nav
                if (action.risk !== 'LOW') {
                    return { decision: PolicyDecision.DENY, reason: 'Level 2 allows LOW risk only.' };
                }
                break;
            case 3: // Reversible Write
                if (action.reversibility === 'IRREVERSIBLE') {
                    return { decision: PolicyDecision.REQUIRE_QA, reason: 'Level 3 requires QA for irreversible actions.' };
                }
                break;
            // Level 4 & 5 allow more
        }

        // 3. Fallback / Default Allow for simplified version
        return { decision: PolicyDecision.ALLOW };
    }
}
