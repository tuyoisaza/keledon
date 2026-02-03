import { Injectable, Logger } from '@nestjs/common';
import { KeledonAction, AutonomyContext, ActionType, ActionDomain } from '../interfaces/action.interface';
import { PolicyEngine, PolicyResult, PolicyDecision } from '../policy/policy.engine';
import { AuditService } from '../audit/audit.service';

// Import existing executors (assuming they are injectable)
// In a real refactor, these might be abstracted behind a generic 'Executor' interface
import { WorkflowStorage } from '../../workflow.storage';
import { ToolExecutor, ToolResult } from '../../tool.executor';

@Injectable()
export class ExecutionOrchestrator {
    private readonly logger = new Logger(ExecutionOrchestrator.name);

    constructor(
        private readonly policyEngine: PolicyEngine,
        private readonly auditService: AuditService,
        private readonly workflowStorage: WorkflowStorage,
        private readonly toolExecutor: ToolExecutor
    ) { }

    /**
     * The main entry point for executing ANY action in the system.
     * This ensures all actions pass through Policy and Audit.
     */
    async execute(action: KeledonAction, context: AutonomyContext, client?: any): Promise<any> {
        this.logger.log(`Received execution request: ${action.intent} [${action.type}]`);

        // 1. Evaluate Policy
        const policyResult = this.policyEngine.evaluate(action, context);

        // 2. Audit the attempt and policy decision
        const timestamp = new Date().toISOString();
        await this.auditService.log({
            timestamp,
            accountId: context.accountId,
            action,
            context,
            policyResult
        });

        // 3. Handle Decision
        if (policyResult.decision === PolicyDecision.DENY) {
            this.logger.warn(`Action DENIED: ${policyResult.reason}`);
            throw new Error(`Action Denied by Policy: ${policyResult.reason}`);
        }

        if (policyResult.decision === PolicyDecision.REQUIRE_QA) {
            // In the future this would trigger a human-in-the-loop flow
            this.logger.warn(`Action REQUIRES QA: ${policyResult.reason}`);
            // For now, we block or proceed with warning depending on config? 
            // The brief says "REQUIRE_QA", implying it stops and waits.
            throw new Error(`Action requires QA (not implemented yet): ${policyResult.reason}`);
        }

        // 4. Select Executor (The "How")
        // This logic determines which underlying system to use based on Action Domain/System

        let executionResult;

        try {
            if (action.domain === ActionDomain.UI) {
                executionResult = await this.executeUI(action, client, context);
            } else if (action.domain === ActionDomain.CRM || action.domain === ActionDomain.SYSTEM) {
                executionResult = await this.executeAPI(action);
            } else if (action.domain === ActionDomain.VOICE) {
                // Delegate to Voice Channel (not yet implemented)
                this.logger.log('Voice action execution not implemented');
                executionResult = { success: true, message: 'Voice action simulated' };
            } else {
                // Fallback or Unknown
                this.logger.warn(`Unknown domain ${action.domain}, trying ToolExecutor default`);
                executionResult = await this.executeToolGeneric(action);
            }
        } catch (error) {
            this.logger.error(`Execution Failed: ${error.message}`);
            // Update Audit with failure
            await this.auditService.log({
                timestamp: new Date().toISOString(),
                accountId: context.accountId,
                action,
                context,
                policyResult,
                executionResult: { success: false, error: error.message }
            });
            throw error;
        }

        // 5. Audit Success
        await this.auditService.log({
            timestamp: new Date().toISOString(),
            accountId: context.accountId,
            action,
            context,
            policyResult,
            executionResult
        });

        return executionResult;
    }

    private async executeUI(action: KeledonAction, client?: any, context?: AutonomyContext) {
        // Here we map the high-level KeledonAction to specific Workflow steps or Tool calls
        // For example, if action is "NAVIGATE" to "Salesforce Case", we might look up the URL or trigger a workflow.

        this.logger.log(`Routing UI action to Workflow/Tool executor: ${action.system}`);

        // V1 CONTRACT: EXECUTE_FLOW
        if (action.type === 'EXECUTE_FLOW' && client) {
            const flowVersionId = action.payload?.flow_version_id;
            const flowDefinitionId = action.payload?.flow_id;

            const version = flowVersionId
                ? this.workflowStorage.getFlowVersion(flowVersionId)
                : flowDefinitionId
                    ? this.workflowStorage.getApprovedFlowVersion(flowDefinitionId)
                    : undefined;

            if (!version) {
                return { success: false, message: 'No approved flow version found for EXECUTE_FLOW' };
            }

            const flowRun = await this.workflowStorage.createFlowRun(version.id, client.id, context?.accountId);
            this.logger.log(`Dispatching EXECUTE_FLOW: ${version.flowDefinitionId} v${version.version}`);

            client.emit('EXECUTE_FLOW', {
                flow_version_id: version.id,
                flow_definition_id: version.flowDefinitionId,
                flow_run_id: flowRun.id,
                steps: version.steps,
                params: action.payload?.params || {},
                correlation_id: crypto.randomUUID()
            });

            return { success: true, message: `Dispatched flow version ${version.id}`, data: { flowRunId: flowRun.id } };
        }

        // 1. Try Workflow for complex actions
        if ((action.type === ActionType.SUBMIT || action.type === ActionType.CLOSE) && client) {
            const companyId = context?.accountId || 'unknown-account';
            const resolved = this.workflowStorage.resolveApprovedFlowVersionForIntent(companyId, action.intent);
            if (resolved) {
                const { definition, version } = resolved;
                const flowRun = await this.workflowStorage.createFlowRun(version.id, client.id, companyId);
                client.emit('EXECUTE_FLOW', {
                    flow_version_id: version.id,
                    flow_definition_id: definition.id,
                    flow_run_id: flowRun.id,
                    steps: version.steps,
                    params: action.payload || {},
                    correlation_id: crypto.randomUUID()
                });
                return { success: true, message: `Dispatched flow for intent ${action.intent}`, data: { flowVersionId: version.id, flowRunId: flowRun.id } };
            }
        }

        // Simplified mapping for now:
        if (action.type === ActionType.NAVIGATE && action.payload?.url) {
            // Assuming we have a way to emit to the client via WorkflowExecutor or similar
            // But WorkflowExecutor usually runs a sequence. 
            // ToolExecutor has 'navigate'.
            return this.toolExecutor.execute({
                name: 'navigate',
                arguments: { url: action.payload.url }
            });
        }

        // Use ToolExecutor for generic UI atomic actions
        if (action.type === ActionType.READ && action.payload?.selector) {
            return this.toolExecutor.execute({
                name: 'read_page',
                arguments: { selector: action.payload.selector }
            });
        }

        return { success: false, message: 'No UI executor mapping found for this action' };
    }

    private async executeAPI(action: KeledonAction) {
        // Here we would call the Salesforce Service, Genesys Service, etc.
        this.logger.log(`Executing API action for ${action.system}`);
        return { success: true, message: 'API execution simulated' };
    }

    private async executeToolGeneric(action: KeledonAction) {
        // Fallback to directly calling tools if they match action type
        return { success: true, message: 'Generic tool execution simulated' };
    }
}
