/**
 * Simple RPA Executor - Updated with Component Architecture
 * 
 * Provides the main interface for RPA execution using the new
 * modular components: StepExecutor, StepValidator, ErrorHandler, ResultReporter
 */

import { RPAStep, RPAResult } from '../../../contracts/v1';
import { StepExecutor } from './StepExecutor';
import { ExecutionMode } from '../types';

function generateBatchId(): string {
  return `batch_${Date.now()}_${crypto.randomUUID()}`;
}

export interface BatchExecutionOptions {
  mode: ExecutionMode;
  stop_on_first_error: boolean;
  rollback_on_error: boolean;
  enable_metrics: boolean;
  timeout_ms?: number;
}

export interface BatchResult {
  batch_id: string;
  steps_executed: number;
  successful_steps: number;
  failed_steps: number;
  results: RPAResult[];
  total_execution_time_ms: number;
  rollback_performed: boolean;
}

export class SimpleRpaExecutor {
  private stepExecutor: StepExecutor;
  private executionHistory: RPAResult[] = [];

  constructor() {
    this.stepExecutor = new StepExecutor();
  }

  /**
   * Execute a single RPA step
   */
  async executeStep(step: RPAStep): Promise<RPAResult> {
    const result = await this.stepExecutor.execute(step);
    this.executionHistory.push(result);
    return result;
  }

  /**
   * Execute multiple steps in sequence
   */
  async executeBatch(
    steps: RPAStep[], 
    options: BatchExecutionOptions = {
      mode: 'deterministic',
      stop_on_first_error: true,
      rollback_on_error: false,
      enable_metrics: true
    }
  ): Promise<BatchResult> {
    const batchId = this.generateBatchId();
    const startTime = Date.now();
    const results: RPAResult[] = [];
    
    let successfulSteps = 0;
    let failedSteps = 0;
    let rollbackPerformed = false;

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      
      try {
        const result = await this.stepExecutor.execute(step);
        results.push(result);
        this.executionHistory.push(result);

        if (result.status === 'success') {
          successfulSteps++;
        } else {
          failedSteps++;
          
          if (options.stop_on_first_error) {
            console.warn(`Batch ${batchId}: Stopping execution due to step failure: ${step.step_id}`);
            break;
          }
        }

      } catch (error) {
        const errorResult: RPAResult = {
          step_id: step.step_id,
          status: 'failure',
          evidence: `Unexpected error: ${(error as Error).message}`,
          rollback_performed: false,
          execution_time_ms: Date.now() - startTime,
          error_details: {
            type: 'UNEXPECTED_ERROR',
            phase: 'execution',
            message: (error as Error).message
          },
          timestamp: new Date().toISOString()
        };
        
        results.push(errorResult);
        this.executionHistory.push(errorResult);
        failedSteps++;

        if (options.stop_on_first_error) {
          console.warn(`Batch ${batchId}: Stopping execution due to unexpected error: ${step.step_id}`);
          break;
        }
      }
    }

    const totalExecutionTime = Date.now() - startTime;

    return {
      batch_id: batchId,
      steps_executed: results.length,
      successful_steps,
      failed_steps,
      results,
      total_execution_time_ms: totalExecutionTime,
      rollback_performed: rollbackPerformed
    };
  }

  /**
   * Validate a step without executing it
   */
  async validateStep(step: RPAStep): Promise<{ valid: boolean; errors: string[] }> {
    try {
      // Create a temporary executor to access validator
      const tempExecutor = new StepExecutor();
      // Note: This would need to be implemented in StepExecutor to expose validation
      // For now, we'll do basic validation
      const errors: string[] = [];

      if (!step.step_id) {
        errors.push('Step ID is required');
      }

      if (!step.action) {
        errors.push('Action is required');
      }

      if (!step.selector) {
        errors.push('Selector is required');
      }

      return {
        valid: errors.length === 0,
        errors
      };
    } catch (error) {
      return {
        valid: false,
        errors: [`Validation error: ${(error as Error).message}`]
      };
    }
  }

  /**
   * Get execution history
   */
  getExecutionHistory(): RPAResult[] {
    return [...this.executionHistory];
  }

  /**
   * Clear execution history
   */
  clearHistory(): void {
    this.executionHistory = [];
  }

  /**
   * Get execution statistics
   */
  getStatistics(): any {
    if (this.executionHistory.length === 0) {
      return {
        total_executions: 0,
        success_rate: '0%',
        average_execution_time_ms: 0,
        most_common_error: 'None',
        rollback_rate: '0%'
      };
    }

    const totalExecutions = this.executionHistory.length;
    const successfulExecutions = this.executionHistory.filter(r => r.status === 'success').length;
    const failedExecutions = totalExecutions - successfulExecutions;
    const totalExecutionTime = this.executionHistory.reduce((sum, r) => sum + r.execution_time_ms, 0);
    const rollbackCount = this.executionHistory.filter(r => r.rollback_performed).length;

    // Analyze errors
    const errorTypes = new Map<string, number>();
    this.executionHistory
      .filter(r => r.status === 'failure' && r.error_details?.type)
      .forEach(r => {
        const errorType = r.error_details!.type;
        errorTypes.set(errorType, (errorTypes.get(errorType) || 0) + 1);
      });

    let mostCommonError = 'None';
    let maxCount = 0;
    errorTypes.forEach((count, type) => {
      if (count > maxCount) {
        maxCount = count;
        mostCommonError = type;
      }
    });

    return {
      total_executions: totalExecutions,
      successful_executions: successfulExecutions,
      failed_executions: failedExecutions,
      success_rate: totalExecutions > 0 ? (successfulExecutions / totalExecutions * 100).toFixed(2) + '%' : '0%',
      average_execution_time_ms: Math.round(totalExecutionTime / totalExecutions),
      most_common_error: mostCommonError,
      error_distribution: Object.fromEntries(errorTypes),
      rollback_count: rollbackCount,
      rollback_rate: totalExecutions > 0 ? (rollbackCount / totalExecutions * 100).toFixed(2) + '%' : '0%'
    };
  }

  /**
   * Test if an element is reachable
   */
  async testElementReachability(selector: string, timeoutMs: number = 5000): Promise<{
    reachable: boolean;
    element_exists: boolean;
    element_visible: boolean;
    element_clickable: boolean;
    load_time_ms: number;
    details: any;
  }> {
    const startTime = Date.now();
    const details: any = {};

    try {
      // Check if element exists
      const element = await this.waitForElement(selector, timeoutMs);
      details.element_exists = element !== null;
      
      if (!element) {
        return {
          reachable: false,
          element_exists: false,
          element_visible: false,
          element_clickable: false,
          load_time_ms: Date.now() - startTime,
          details
        };
      }

      // Check visibility
      const rect = element.getBoundingClientRect();
      const isVisible = rect.width > 0 && rect.height > 0;
      details.element_visible = isVisible;
      
      // Check if clickable
      const isClickable = isVisible && !this.isElementBlocked(element);
      details.element_clickable = isClickable;
      
      // Additional details
      details.tag_name = element.tagName;
      details.element_id = element.id;
      details.element_class = element.className;
      details.bounds = rect;

      return {
        reachable: isClickable,
        element_exists: true,
        element_visible: isVisible,
        element_clickable: isClickable,
        load_time_ms: Date.now() - startTime,
        details
      };

    } catch (error) {
      details.error = (error as Error).message;
      return {
        reachable: false,
        element_exists: false,
        element_visible: false,
        element_clickable: false,
        load_time_ms: Date.now() - startTime,
        details
      };
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

  private isElementBlocked(element: Element): boolean {
    const rect = element.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    const elementAtPoint = document.elementFromPoint(centerX, centerY);
    return elementAtPoint !== element;
  }

  private generateBatchId(): string {
    return generateBatchId();
  }
}

// Export the executor as the main interface
export default SimpleRpaExecutor;