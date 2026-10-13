import { RPAEngine, ExecutionStatus, StepPriority } from '../src/rpa/rpa-engine';
import { SalesforceAdapter } from '../src/rpa/adapters/salesforce.adapter';
import { GenesysAdapter } from '../src/rpa/adapters/genesys.adapter';
import { SelectorOptimizer } from '../src/rpa/selectors/selector-optimizer';
import { ElementSelector } from '../src/rpa/models/rpa-models';
import { createRpaEngineTestContext, mockDocument, mockElement } from './rpa-engine-test-harness';
describe('RPA Engine Core', () => {
  let rpaEngine: RPAEngine;
  let salesforceAdapter: SalesforceAdapter;
  let genesysAdapter: GenesysAdapter;
  let selectorOptimizer: SelectorOptimizer;

  beforeEach(() => {
    ({ rpaEngine, salesforceAdapter, genesysAdapter, selectorOptimizer } = createRpaEngineTestContext());
  });

  describe('Engine Initialization', () => {
    it('should initialize with default configuration', () => {
      expect(rpaEngine).toBeDefined();
      expect(rpaEngine.getStatus()).toBe('idle');
    });

    it('should initialize with custom configuration', () => {
      const customEngine = new RPAEngine({
        maxConcurrentSteps: 10,
        defaultTimeout: 20000,
        retryAttempts: 5,
        retryDelay: 2000
      });

      expect(customEngine).toBeDefined();
      expect(customEngine.getStatus()).toBe('idle');
    });

    it('should register adapters correctly', () => {
      rpaEngine.registerAdapter('salesforce', salesforceAdapter);
      rpaEngine.registerAdapter('genesys', genesysAdapter);

      const adapters = rpaEngine.getRegisteredAdapters();
      expect(adapters).toContain('salesforce');
      expect(adapters).toContain('genesys');
    });

    it('should handle adapter registration errors', () => {
      expect(() => {
        rpaEngine.registerAdapter('', salesforceAdapter);
      }).toThrow('Adapter name cannot be empty');

      expect(() => {
        rpaEngine.registerAdapter('invalid', null as any);
      }).toThrow('Adapter cannot be null');
    });
  });

  describe('Step Execution', () => {
    beforeEach(() => {
      rpaEngine.registerAdapter('salesforce', salesforceAdapter);
    });

    it('should execute a simple click step successfully', async () => {
      const step = {
        id: 'step-1',
        type: 'click',
        selector: { css: '#test-button' } as ElementSelector,
        domain: 'test',
        priority: StepPriority.NORMAL
      };

      const result = await rpaEngine.executeStep(step);

      expect(result.status).toBe(ExecutionStatus.SUCCESS);
      expect(result.executionTime).toBeGreaterThan(0);
      expect(mockElement.click).toHaveBeenCalled();
    });

    it('should execute a type input step successfully', async () => {
      const step = {
        id: 'step-2',
        type: 'type',
        selector: { css: '#input-field' } as ElementSelector,
        value: 'Test Input',
        domain: 'test',
        priority: StepPriority.NORMAL
      };

      const result = await rpaEngine.executeStep(step);

      expect(result.status).toBe(ExecutionStatus.SUCCESS);
      expect(mockElement.value).toBe('Test Input');
    });

    it('should execute a wait step successfully', async () => {
      const step = {
        id: 'step-3',
        type: 'wait',
        duration: 1000,
        domain: 'test',
        priority: StepPriority.NORMAL
      };

      const startTime = Date.now();
      const result = await rpaEngine.executeStep(step);
      const endTime = Date.now();

      expect(result.status).toBe(ExecutionStatus.SUCCESS);
      expect(endTime - startTime).toBeGreaterThanOrEqual(1000);
    });

    it('should handle element not found error', async () => {
      mockDocument.querySelector.mockReturnValue(null);

      const step = {
        id: 'step-4',
        type: 'click',
        selector: { css: '#nonexistent' } as ElementSelector,
        domain: 'test',
        priority: StepPriority.NORMAL
      };

      const result = await rpaEngine.executeStep(step);

      expect(result.status).toBe(ExecutionStatus.FAILED);
      expect(result.error).toContain('Element not found');
    });

    it('should retry failed steps according to configuration', async () => {
      let callCount = 0;
      mockDocument.querySelector.mockImplementation(() => {
        callCount++;
        if (callCount < 3) {
          return null; // Fail first 2 attempts
        }
        return mockElement; // Success on 3rd attempt
      });

      const step = {
        id: 'step-5',
        type: 'click',
        selector: { css: '#flaky-element' } as ElementSelector,
        domain: 'test',
        priority: StepPriority.NORMAL,
        retry: true
      };

      const result = await rpaEngine.executeStep(step);

      expect(result.status).toBe(ExecutionStatus.SUCCESS);
      expect(callCount).toBe(3);
      expect(result.retryCount).toBe(2);
    });
  });

  describe('Workflow Scheduling', () => {
    beforeEach(() => {
      rpaEngine.registerAdapter('salesforce', salesforceAdapter);
      rpaEngine.registerAdapter('genesys', genesysAdapter);
    });

    it('should schedule and execute workflow in correct order', async () => {
      const workflow = {
        id: 'workflow-1',
        name: 'Test Workflow',
        steps: [
          {
            id: 'step-1',
            type: 'click',
            selector: { css: '#first' } as ElementSelector,
            domain: 'salesforce',
            priority: StepPriority.HIGH
          },
          {
            id: 'step-2',
            type: 'type',
            selector: { css: '#second' } as ElementSelector,
            value: 'test',
            domain: 'salesforce',
            priority: StepPriority.NORMAL
          },
          {
            id: 'step-3',
            type: 'wait',
            duration: 100,
            domain: 'salesforce',
            priority: StepPriority.LOW
          }
        ]
      };

      const executionId = await rpaEngine.scheduleWorkflow(workflow);
      expect(executionId).toBeDefined();

      const result = await rpaEngine.waitForExecution(executionId, 5000);
      expect(result.status).toBe('completed');
      expect(result.completedSteps).toBe(3);
    });

    it('should handle concurrent workflow execution', async () => {
      const workflow1 = {
        id: 'workflow-1',
        name: 'Workflow 1',
        steps: [
          {
            id: 'step-1-1',
            type: 'click',
            selector: { css: '#wf1-step1' } as ElementSelector,
            domain: 'salesforce',
            priority: StepPriority.NORMAL
          }
        ]
      };

      const workflow2 = {
        id: 'workflow-2',
        name: 'Workflow 2',
        steps: [
          {
            id: 'step-2-1',
            type: 'click',
            selector: { css: '#wf2-step1' } as ElementSelector,
            domain: 'genesys',
            priority: StepPriority.NORMAL
          }
        ]
      };

      const executionId1 = await rpaEngine.scheduleWorkflow(workflow1);
      const executionId2 = await rpaEngine.scheduleWorkflow(workflow2);

      const [result1, result2] = await Promise.all([
        rpaEngine.waitForExecution(executionId1, 5000),
        rpaEngine.waitForExecution(executionId2, 5000)
      ]);

      expect(result1.status).toBe('completed');
      expect(result2.status).toBe('completed');
    });

    it('should prioritize high priority steps', async () => {
      const workflow = {
        id: 'workflow-priority',
        name: 'Priority Test',
        steps: [
          {
            id: 'low-step',
            type: 'click',
            selector: { css: '#low' } as ElementSelector,
            domain: 'test',
            priority: StepPriority.LOW
          },
          {
            id: 'high-step',
            type: 'click',
            selector: { css: '#high' } as ElementSelector,
            domain: 'test',
            priority: StepPriority.HIGH
          }
        ]
      };

      const executionId = await rpaEngine.scheduleWorkflow(workflow);
      const result = await rpaEngine.waitForExecution(executionId, 5000);

      expect(result.status).toBe('completed');
      // High priority step should execute first
      const executionOrder = result.stepResults.map(s => s.stepId);
      expect(executionOrder.indexOf('high-step')).toBeLessThan(executionOrder.indexOf('low-step'));
    });
  });
});
