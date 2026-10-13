/**
 * RPA Executor - Deterministic Browser Automation
 * Executes flows step-by-step with post-condition validation
 */

import { FlowExecutionMethods } from './flow-execution.methods.js';
import { ActionExecutionMethods } from './action-execution.methods.js';
import { StepValidationMethods } from './step-validation.methods.js';
import { ExecutorRuntimeMethods } from './executor-runtime.methods.js';

export class RPAExecutor {
  constructor(config = {}) {
    this.config = {
      defaultTimeout: 5000,
      retryAttempts: 3,
      retryDelay: 1000,
      screenshotOnFailure: true,
      strictMode: true,
      ...config
    };
    this.currentFlow = null;
    this.currentStep = null;
    this.isExecuting = false;
    this.eventHandlers = new Map();
    this.executionContext = {};
    this.resultHistory = [];
  }

  /**
   * Execute a flow deterministically
   * @param {Object} flow - Flow definition with steps
   * @param {Object} context - Execution context variables
   */
}

const methodGroups = [FlowExecutionMethods, ActionExecutionMethods, StepValidationMethods, ExecutorRuntimeMethods];
for (const methods of methodGroups) {
  for (const name of Object.getOwnPropertyNames(methods.prototype)) {
    if (name === 'constructor') continue;
    Object.defineProperty(RPAExecutor.prototype, name, Object.getOwnPropertyDescriptor(methods.prototype, name));
  }
}
