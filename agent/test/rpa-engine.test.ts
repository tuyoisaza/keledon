/**
 * RPA Engine Test Suite
 * Tests core RPA engine functionality, step execution, scheduling,
 * and integration with domain adapters
 */

import { RPAEngine, ExecutionStatus, StepPriority } from '../src/rpa/rpa-engine';
import { SalesforceAdapter } from '../src/rpa/adapters/salesforce.adapter';
import { GenesysAdapter } from '../src/rpa/adapters/genesys.adapter';
import { SelectorOptimizer } from '../src/rpa/selectors/selector-optimizer';
import { ElementSelector } from '../src/rpa/models/rpa-models';

// Mock Chrome APIs
const mockChrome = {
  tabs: {
    query: jest.fn(),
    sendMessage: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    onUpdated: {
      addListener: jest.fn(),
      removeListener: jest.fn()
    }
  },
  runtime: {
    sendMessage: jest.fn(),
    onMessage: {
      addListener: jest.fn(),
      removeListener: jest.fn()
    },
    getManifest: jest.fn(() => ({ version: '1.0.0' }))
  },
  storage: {
    local: {
      get: jest.fn(),
      set: jest.fn(),
      remove: jest.fn()
    }
  }
};

global.chrome = mockChrome as any;

// Mock DOM APIs
const mockElement = {
  click: jest.fn(),
  focus: jest.fn(),
  blur: jest.fn(),
  value: '',
  textContent: 'Test Content',
  innerHTML: 'Test HTML',
  style: { display: 'block' },
  getAttribute: jest.fn(),
  setAttribute: jest.fn(),
  removeAttribute: jest.fn(),
  classList: {
    add: jest.fn(),
    remove: jest.fn(),
    contains: jest.fn()
  },
  addEventListener: jest.fn(),
  removeEventListener: jest.fn()
};

const mockDocument = {
  querySelector: jest.fn(),
  querySelectorAll: jest.fn(),
  getElementById: jest.fn(),
  getElementsByClassName: jest.fn(),
  getElementsByName: jest.fn(),
  getElementsByTagName: jest.fn(),
  createElement: jest.fn(),
  addEventListener: jest.fn(),
  readyState: 'complete',
  body: mockElement
};

global.document = mockDocument as any;
global.window = {
  location: { href: 'https://test.example.com' },
  MutationObserver: jest.fn().mockImplementation(() => ({
    observe: jest.fn(),
    disconnect: jest.fn(),
    takeRecords: jest.fn(() => [])
  }))
} as any;

describe('RPA Engine', () => {
  let rpaEngine: RPAEngine;
  let salesforceAdapter: SalesforceAdapter;
  let genesysAdapter: GenesysAdapter;
  let selectorOptimizer: SelectorOptimizer;

  beforeEach(() => {
    jest.clearAllMocks();
    
    rpaEngine = new RPAEngine({
      maxConcurrentSteps: 5,
      defaultTimeout: 10000,
      retryAttempts: 3,
      retryDelay: 1000
    });

    salesforceAdapter = new SalesforceAdapter();
    genesysAdapter = new GenesysAdapter();
    selectorOptimizer = new SelectorOptimizer();

    // Setup default DOM mocks
    mockDocument.querySelector.mockReturnValue(mockElement);
    mockDocument.querySelectorAll.mockReturnValue([mockElement]);
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

  describe('Error Handling and Recovery', () => {
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