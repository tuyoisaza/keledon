import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionOrchestrator } from './execution.orchestrator';
import { PolicyEngine } from '../policy/policy.engine';
import { AuditService } from '../audit/audit.service';
import { WorkflowStorage } from '../../workflow.storage';
import { ToolExecutor } from '../../tool.executor';
import { KeledonAction, ActionType, ActionDomain, ActionRisk, ActionReversibility } from '../interfaces/action.interface';

describe('ExecutionOrchestrator', () => {
    let orchestrator: ExecutionOrchestrator;
    let policyEngine: PolicyEngine;
    let auditService: AuditService;

    const mockToolExecutor = {
        execute: jest.fn().mockResolvedValue({ success: true, message: 'Tool Executed' }),
    };

    const mockWorkflowStorage = {
        getFlowVersion: jest.fn(),
        getApprovedFlowVersion: jest.fn(),
        resolveApprovedFlowVersionForIntent: jest.fn(),
        createFlowRun: jest.fn(),
    };

    const mockAuditService = {
        log: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ExecutionOrchestrator,
                PolicyEngine,
                { provide: AuditService, useValue: mockAuditService },
                { provide: ToolExecutor, useValue: mockToolExecutor },
                { provide: WorkflowStorage, useValue: mockWorkflowStorage },
            ],
        }).compile();

        orchestrator = module.get<ExecutionOrchestrator>(ExecutionOrchestrator);
        policyEngine = module.get<PolicyEngine>(PolicyEngine);
        auditService = module.get<AuditService>(AuditService);
    });

    it('should be defined', () => {
        expect(orchestrator).toBeDefined();
    });

    it('should DENY action if Policy fails (Level 1 vs WRITE)', async () => {
        const action: KeledonAction = {
            type: ActionType.CLOSE,
            domain: ActionDomain.CRM,
            system: 'Salesforce',
            resource: 'Case',
            intent: 'Close Case',
            risk: ActionRisk.CRITICAL,
            reversibility: ActionReversibility.IRREVERSIBLE,
            requiredLevel: 4,
        };

        const context = {
            accountId: 'test',
            level: 1, // LOW LEVEL
            features: []
        };

        await expect(orchestrator.execute(action, context)).rejects.toThrow('Action Denied by Policy');
        expect(mockAuditService.log).toHaveBeenCalled();
    });

    it('should EXECUTE action if Policy passes (Level 5 vs WRITE)', async () => {
        const action: KeledonAction = {
            type: ActionType.CLOSE,
            domain: ActionDomain.CRM,
            system: 'Salesforce',
            resource: 'Case',
            intent: 'Close Case',
            risk: ActionRisk.CRITICAL,
            reversibility: ActionReversibility.IRREVERSIBLE,
            requiredLevel: 4,
            payload: { id: '123' }
        };

        const context = {
            accountId: 'test',
            level: 5, // HIGH LEVEL
            features: []
        };

        // Assuming API actions return simulated success for now
        await expect(orchestrator.execute(action, context)).resolves.toEqual({ success: true, message: 'API execution simulated' });
        expect(mockAuditService.log).toHaveBeenCalledTimes(2); // 1 for attempt, 1 for success
    });

    it('should route NAVIGATE to ToolExecutor', async () => {
        const action: KeledonAction = {
            type: ActionType.NAVIGATE,
            domain: ActionDomain.UI,
            system: 'Salesforce',
            resource: 'Case',
            intent: 'Go to case',
            risk: ActionRisk.LOW,
            reversibility: ActionReversibility.REVERSIBLE,
            requiredLevel: 2,
            payload: { url: 'http://salesforce.com' }
        };

        const context = { accountId: 'test', level: 2, features: [] };

        await orchestrator.execute(action, context);
        expect(mockToolExecutor.execute).toHaveBeenCalledWith(expect.objectContaining({
            name: 'navigate',
            arguments: { url: 'http://salesforce.com' }
        }));
    });
});
