/**
 * Main RPA Step Executor
 * 
 * Provides deterministic execution of UI automation steps with
 * rollback capability, error handling, and comprehensive reporting.
 */

import { RPAStep, RPAResult } from '../../../contracts/v1';
import { StepValidator } from './StepValidator';
import { ErrorHandler } from './ErrorHandler';
import { ResultReporter } from './ResultReporter';

export interface RollbackAction {
  action: () => Promise<void>;
  description: string;
}

export class StepExecutor {
  private rollbacks: Map<string, RollbackAction> = new Map();
  private validator: StepValidator;
  private errorHandler: ErrorHandler;
  private reporter: ResultReporter;

  constructor() {
    this.validator = new StepValidator();
    this.errorHandler = new ErrorHandler();
    this.reporter = new ResultReporter();
  }

  async execute(step: RPAStep): Promise<RPAResult> {
    const startTime = Date.now();
    
    try {
      // Pre-condition validation
      const preValidation = await this.validator.validate(step, 'pre');
      if (!preValidation.valid) {
        return this.reporter.formatResult({
          step_id: step.step_id,
          status: 'failure',
          evidence: `Pre-condition validation failed: ${preValidation.errors.join(', ')}`,
          rollback_performed: false,
          execution_time_ms: Date.now() - startTime,
          error_details: {
            type: 'VALIDATION_ERROR',
            phase: 'pre_condition',
            errors: preValidation.errors
          }
        });
      }

      // Setup rollback action if specified
      if (step.rollback_action) {
        const rollback = this.createRollbackAction(step);
        this.rollbacks.set(step.step_id, rollback);
      }

      // Execute the step
      const result = await this.performStep(step);
      
      // Post-condition validation
      if (step.post_condition) {
        const postValidation = await this.validator.validate(step, 'post', result);
        if (!postValidation.valid) {
          // Attempt rollback on validation failure
          const rollbackPerformed = await this.attemptRollback(step.step_id);
          return this.reporter.formatResult({
            step_id: step.step_id,
            status: 'failure',
            evidence: `Post-condition validation failed: ${postValidation.errors.join(', ')}`,
            rollback_performed: rollbackPerformed,
            execution_time_ms: Date.now() - startTime,
            error_details: {
              type: 'VALIDATION_ERROR',
              phase: 'post_condition',
              errors: postValidation.errors
            }
          });
        }
      }

      // Success result
      return this.reporter.formatResult({
        step_id: step.step_id,
        status: 'success',
        evidence: result.evidence,
        rollback_performed: false,
        execution_time_ms: Date.now() - startTime
      });

    } catch (error) {
      // Handle execution errors
      const rollbackPerformed = await this.attemptRollback(step.step_id);
      const errorContext = this.errorHandler.handleError(error, step);
      
      return this.reporter.formatResult({
        step_id: step.step_id,
        status: 'failure',
        evidence: errorContext.message,
        rollback_performed: rollbackPerformed,
        execution_time_ms: Date.now() - startTime,
        error_details: errorContext.details
      });
    } finally {
      // Cleanup
      this.rollbacks.delete(step.step_id);
    }
  }

  private async performStep(step: RPAStep): Promise<{ evidence: string }> {
    const timeout = step.timeout_ms || 5000;
    const el = await this.waitForElement(step.selector, timeout);
    
    if (!el) {
      throw new Error(`Element not found within ${timeout}ms: ${step.selector}`);
    }

    // Mark element for potential rollback
    el.setAttribute('data-step-id', step.step_id);

    switch (step.action) {
      case 'click':
        el.click();
        return { evidence: `Clicked element: ${step.selector}` };

      case 'fill_field':
        if (this.isInputElement(el)) {
          el.value = step.value || '';
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
          return { evidence: `Filled field ${step.selector} with value: ${step.value}` };
        } else {
          throw new Error(`Element is not input-like: ${step.selector}`);
        }

      case 'navigate':
        if (step.value && this.isValidUrl(step.value)) {
          window.location.href = step.value;
          return { evidence: `Navigated to: ${step.value}` };
        } else {
          throw new Error(`Invalid URL: ${step.value}`);
        }

      case 'wait':
        const waitTime = step.value ? parseInt(step.value, 10) || 1000 : 1000;
        await new Promise(resolve => setTimeout(resolve, waitTime));
        return { evidence: `Waited ${waitTime}ms` };

      case 'select':
        if (this.isSelectElement(el)) {
          el.value = step.value || '';
          el.dispatchEvent(new Event('change', { bubbles: true }));
          return { evidence: `Selected option ${step.value} in ${step.selector}` };
        } else {
          throw new Error(`Element is not a select element: ${step.selector}`);
        }

      case 'scroll':
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return { evidence: `Scrolled to element: ${step.selector}` };

      case 'hover':
        el.dispatchEvent(new Event('mouseover', { bubbles: true }));
        return { evidence: `Hovered over element: ${step.selector}` };

      default:
        throw new Error(`Unknown action: ${step.action}`);
    }
  }

  private async waitForElement(selector: string, timeoutMs: number): Promise<Element | null> {
    return new Promise((resolve) => {
      const start = Date.now();
      const check = () => {
        const el = document.querySelector(selector);
        if (el) {
          resolve(el);
        } else if (Date.now() - start > timeoutMs) {
          resolve(null);
        } else {
          requestAnimationFrame(check);
        }
      };
      check();
    });
  }

  private createRollbackAction(step: RPAStep): RollbackAction {
    return {
      action: async () => {
        console.log(`Rolling back step ${step.step_id}: ${step.rollback_action}`);
        
        switch (step.rollback_action) {
          case 'clear_field':
            const el = document.querySelector(`[data-step-id="${step.step_id}"]`);
            if (this.isInputElement(el)) {
              el.value = '';
              el.dispatchEvent(new Event('input', { bubbles: true }));
              el.dispatchEvent(new Event('change', { bubbles: true }));
            }
            break;

          case 'go_back':
            window.history.back();
            break;

          case 'refresh':
            window.location.reload();
            break;

          case 'escape':
            document.dispatchEvent(new KeyboardEvent('keydown', {
              key: 'Escape',
              bubbles: true
            }));
            break;

          default:
            console.warn(`Unknown rollback action: ${step.rollback_action}`);
        }
      },
      description: step.rollback_action
    };
  }

  private async attemptRollback(stepId: string): Promise<boolean> {
    const rollbackAction = this.rollbacks.get(stepId);
    if (!rollbackAction) {
      return false;
    }

    try {
      await rollbackAction.action();
      return true;
    } catch (error) {
      console.error(`Rollback failed for step ${stepId}:`, error);
      return false;
    }
  }

  private isInputElement(el: any): el is HTMLInputElement | HTMLTextAreaElement {
    return el && (
      el.tagName === 'INPUT' || 
      el.tagName === 'TEXTAREA' || 
      el.tagName === 'SELECT'
    );
  }

  private isSelectElement(el: any): el is HTMLSelectElement {
    return el && el.tagName === 'SELECT';
  }

  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }
}