// RPA Executor - Deterministic Browser Automation
// This module provides step-by-step execution with post-condition validation

export { RPAExecutor } from './index.js';
export { StepValidator } from './step-validator.js';
export { PostConditionValidator } from './post-condition-validator.js';

// Factory function to create configured executor
export function createRPAExecutor(config = {}) {
  const stepValidator = new StepValidator(config);
  const postConditionValidator = new PostConditionValidator(config);
  const executor = new RPAExecutor(config);

  // Bind validators to executor
  executor.stepValidator = stepValidator;
  executor.postConditionValidator = postConditionValidator;

  return executor;
}

// Default configuration
export const DEFAULT_CONFIG = {
  defaultTimeout: 5000,
  retryAttempts: 3,
  retryDelay: 1000,
  screenshotOnFailure: true,
  strictMode: true,
  validationDelay: 500,
  maxWaitTime: 10000
};