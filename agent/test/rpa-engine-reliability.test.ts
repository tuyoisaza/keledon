import { RPAEngine, ExecutionStatus, StepPriority } from '../src/rpa/rpa-engine';
import { SalesforceAdapter } from '../src/rpa/adapters/salesforce.adapter';
import { GenesysAdapter } from '../src/rpa/adapters/genesys.adapter';
import { SelectorOptimizer } from '../src/rpa/selectors/selector-optimizer';
import { ElementSelector } from '../src/rpa/models/rpa-models';
import { createRpaEngineTestContext, mockDocument, mockElement } from './rpa-engine-test-harness';
describe('RPA Engine Reliability', () => {
  let rpaEngine: RPAEngine;
  let salesforceAdapter: SalesforceAdapter;
  let genesysAdapter: GenesysAdapter;
  let selectorOptimizer: SelectorOptimizer;

  beforeEach(() => {
    ({ rpaEngine, salesforceAdapter, genesysAdapter, selectorOptimizer } = createRpaEngineTestContext());
  });  describe('Error Handling and Recovery', () => {
    beforeEach(() => {
      rpaEngine.registerAdapter('salesforce', salesforceAdapter);
    });

    it('should handle timeout errors gracefully', async () => {
      // Mock a step that never completes
      const step = {
        id: 'timeout-step',
        type: 'waitForElement',
        selector: { css: '#slow-element' } as ElementSelector,
        domain: 'test',
        priority: StepPriority.NORMAL,
        timeout: 100 // Short timeout
      };

      const result = await rpaEngine.executeStep(step);

      expect(result.status).toBe(ExecutionStatus.FAILED);
      expect(result.error).toContain('timeout');
    });

    it('should execute fallback steps on failure', async () => {
      mockDocument.querySelector.mockImplementation((selector) => {
        if (selector === '#primary') {
          return null; // Primary selector fails
        }
        return mockElement; // Fallback works
      });

      const step = {
        id: 'fallback-step',
        type: 'click',
        selector: { css: '#primary' } as ElementSelector,
        fallbackSelector: { css: '#fallback' } as ElementSelector,
        domain: 'test',
        priority: StepPriority.NORMAL
      };

      const result = await rpaEngine.executeStep(step);

      expect(result.status).toBe(ExecutionStatus.SUCCESS);
      expect(result.usedFallback).toBe(true);
    });

    it('should handle adapter errors', async () => {
      const faultyAdapter = {
        execute: jest.fn().mockRejectedValue(new Error('Adapter failed'))
      };

      rpaEngine.registerAdapter('faulty', faultyAdapter as any);

      const step = {
        id: 'adapter-error-step',
        type: 'click',
        selector: { css: '#test' } as ElementSelector,
        domain: 'faulty',
        priority: StepPriority.NORMAL
      };

      const result = await rpaEngine.executeStep(step);

      expect(result.status).toBe(ExecutionStatus.FAILED);
      expect(result.error).toContain('Adapter failed');
    });
  });

  describe('Performance Monitoring', () => {
    beforeEach(() => {
      rpaEngine.registerAdapter('salesforce', salesforceAdapter);
    });

    it('should track execution metrics', async () => {
      const step = {
        id: 'metrics-step',
        type: 'click',
        selector: { css: '#metrics-test' } as ElementSelector,
        domain: 'test',
        priority: StepPriority.NORMAL
      };

      const startTime = performance.now();
      const result = await rpaEngine.executeStep(step);
      const endTime = performance.now();

      expect(result.status).toBe(ExecutionStatus.SUCCESS);
      expect(result.executionTime).toBeGreaterThan(0);
      expect(result.executionTime).toBeLessThanOrEqual(endTime - startTime + 50); // Allow small variance
    });

    it('should track workflow performance', async () => {
      const workflow = {
        id: 'perf-workflow',
        name: 'Performance Test',
        steps: [
          {
            id: 'perf-step-1',
            type: 'click',
            selector: { css: '#perf1' } as ElementSelector,
            domain: 'test',
            priority: StepPriority.NORMAL
          },
          {
            id: 'perf-step-2',
            type: 'wait',
            duration: 100,
            domain: 'test',
            priority: StepPriority.NORMAL
          }
        ]
      };

      const executionId = await rpaEngine.scheduleWorkflow(workflow);
      const result = await rpaEngine.waitForExecution(executionId, 5000);

      expect(result.totalExecutionTime).toBeGreaterThan(100); // At least wait time
      expect(result.averageStepTime).toBeGreaterThan(0);
      expect(result.stepResults).toHaveLength(2);
    });

    it('should monitor resource usage', async () => {
      const workflow = {
        id: 'resource-workflow',
        name: 'Resource Test',
        steps: Array(10).fill(null).map((_, i) => ({
          id: `resource-step-${i}`,
          type: 'click',
          selector: { css: `#resource-${i}` } as ElementSelector,
          domain: 'test',
          priority: StepPriority.NORMAL
        }))
      };

      const executionId = await rpaEngine.scheduleWorkflow(workflow);
      const result = await rpaEngine.waitForExecution(executionId, 10000);

      expect(result.status).toBe('completed');
      expect(result.maxConcurrentSteps).toBeLessThanOrEqual(5); // Based on engine config
      expect(result.resourceUsage).toBeDefined();
    });
  });

  describe('State Management', () => {
    it('should persist and restore execution state', async () => {
      const workflow = {
        id: 'state-workflow',
        name: 'State Test',
        steps: [
          {
            id: 'state-step-1',
            type: 'type',
            selector: { css: '#state-input' } as ElementSelector,
            value: 'persistent data',
            domain: 'test',
            priority: StepPriority.NORMAL
          }
        ]
      };

      const executionId = await rpaEngine.scheduleWorkflow(workflow);
      
      // Save state
      await rpaEngine.saveExecutionState(executionId);
      
      // Restore state
      const restoredState = await rpaEngine.restoreExecutionState(executionId);
      
      expect(restoredState).toBeDefined();
      expect(restoredState.workflowId).toBe('state-workflow');
      expect(restoredState.currentStepIndex).toBe(0);
    });

    it('should handle workflow pause and resume', async () => {
      const workflow = {
        id: 'pause-workflow',
        name: 'Pause Test',
        steps: [
          {
            id: 'pause-step-1',
            type: 'click',
            selector: { css: '#pause1' } as ElementSelector,
            domain: 'test',
            priority: StepPriority.NORMAL
          },
          {
            id: 'pause-step-2',
            type: 'click',
            selector: { css: '#pause2' } as ElementSelector,
            domain: 'test',
            priority: StepPriority.NORMAL
          }
        ]
      };

      const executionId = await rpaEngine.scheduleWorkflow(workflow);
      
      // Let first step complete
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Pause execution
      await rpaEngine.pauseExecution(executionId);
      
      let result = await rpaEngine.getExecutionStatus(executionId);
      expect(result.status).toBe('paused');
      
      // Resume execution
      await rpaEngine.resumeExecution(executionId);
      
      result = await rpaEngine.waitForExecution(executionId, 5000);
      expect(result.status).toBe('completed');
    });

    it('should cancel execution cleanly', async () => {
      const workflow = {
        id: 'cancel-workflow',
        name: 'Cancel Test',
        steps: [
          {
            id: 'cancel-step-1',
            type: 'wait',
            duration: 5000, // Long wait
            domain: 'test',
            priority: StepPriority.NORMAL
          },
          {
            id: 'cancel-step-2',
            type: 'click',
            selector: { css: '#cancel' } as ElementSelector,
            domain: 'test',
            priority: StepPriority.NORMAL
          }
        ]
      };

      const executionId = await rpaEngine.scheduleWorkflow(workflow);
      
      // Cancel quickly
      await new Promise(resolve => setTimeout(resolve, 100));
      await rpaEngine.cancelExecution(executionId);
      
      const result = await rpaEngine.getExecutionStatus(executionId);
      expect(result.status).toBe('cancelled');
      expect(result.completedSteps).toBeLessThan(2);
    });
  });
});

