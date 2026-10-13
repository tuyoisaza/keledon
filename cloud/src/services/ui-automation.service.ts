import { Injectable } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';

import {
  UIAction,
  UIActionResult,
  UIStep,
  UIExecutionSummary,
  UIExecutionHistoryEntry,
} from './ui-automation.types';
export type { UIAction, UIActionResult, UIStep } from './ui-automation.types';
import { UIActionMethods } from './ui-action-methods';

@Injectable()
export class UIAutomationService extends UIActionMethods {
  private executionHistory = new Map<string, UIExecutionHistoryEntry[]>();
  private currentExecution: {
    sessionId: string;
    stepIndex: number;
    stepCount: number;
  } | null = null;

  constructor() {
    super();
    console.log('UIAutomationService: Initialized');
  }

  /**
   * Execute UI steps from cloud decision
   */
  async executeUISteps(
    sessionId: string,
    steps: UIAction[],
  ): Promise<UIExecutionSummary> {
    const results: UIActionResult[] = [];
    const executionId = uuidv4();
    const executionStartedAt = Date.now();

    this.currentExecution = {
      sessionId,
      stepIndex: 0,
      stepCount: steps.length,
    };

    console.log(
      `[UIAutomation] Executing ${steps.length} UI steps for session ${sessionId}`,
    );

    try {
      // Initialize page context
      await this.initializePage();

      // Execute steps sequentially
      for (let i = 0; i < steps.length; i++) {
        this.currentExecution.stepIndex = i;
        const step: UIStep = {
          step_id: uuidv4(),
          action: steps[i],
          description: this.getActionDescription(steps[i]),
          status: 'executing',
          started_at: new Date().toISOString(),
        };

        const result = await this.executeStep(step.action, i, steps.length);
        step.result = result;
        step.completed_at = new Date().toISOString();
        step.status = result.success ? 'completed' : 'failed';

        results.push(result);

        if (!result.success) {
          console.error(`[UIAutomation] Step ${i + 1} failed: ${result.error}`);
          // Stop execution on failure
          break;
        }

        console.log(`[UIAutomation] Step ${i + 1}/${steps.length} completed`);
      }

      // Update execution status in session context
      this.currentExecution = null;

      const finalResult: UIExecutionSummary = {
        action_id: executionId,
        results,
        summary: {
          total_steps: steps.length,
          successful_steps: results.filter((r) => r.success).length,
          failed_steps: results.filter((r) => !r.success).length,
          execution_time: Date.now() - executionStartedAt,
        },
        timestamp: new Date().toISOString(),
      };

      // Persist UI execution results
      this.persistUIExecution(sessionId, finalResult);

      console.log(
        `[UIAutomation] UI execution completed: ${finalResult.summary.successful_steps}/${finalResult.summary.total_steps} steps successful`,
      );

      return finalResult;
    } catch (error) {
      console.error('[UIAutomation] UI execution failed:', error);

      const errorMsg = error instanceof Error ? error.message : String(error);

      const errorResult: UIActionResult = {
        action_id: executionId,
        success: false,
        error: errorMsg,
        timestamp: new Date().toISOString(),
      };

      return {
        action_id: executionId,
        results: [errorResult],
        summary: {
          total_steps: steps.length,
          successful_steps: 0,
          failed_steps: steps.length,
          execution_time: Date.now() - executionStartedAt,
        },
        timestamp: new Date().toISOString(),
      };
    } finally {
      this.currentExecution = null;
    }
  }

  /**
   * Initialize page context for automation
   */
  private async initializePage(): Promise<void> {
    try {
      await this.waitForPageLoad();
    } catch (error) {
      console.error('Failed to initialize page context:', error);
    }
  }

  /**
   * Execute individual UI step
   */
  private async executeStep(
    step: UIAction,
    stepIndex: number,
    totalSteps: number,
  ): Promise<UIActionResult> {
    const startTime = Date.now();

    try {
      console.log(
        `[UIAutomation] Executing step ${stepIndex + 1}/${totalSteps}: ${this.getActionDescription(step)}`,
      );

      switch (step.action_type) {
        case 'click':
          return await this.executeClick(step);
        case 'type':
          return await this.executeType(step);
        case 'select':
          return await this.executeSelect(step);
        case 'hover':
          return await this.executeHover(step);
        case 'scroll':
          return await this.executeScroll(step);
        case 'navigate':
          return await this.executeNavigate(step);
        case 'screenshot':
          return await this.executeScreenshot(step);
        case 'wait':
          return await this.executeWait(step);
        case 'extract_text':
          return await this.executeExtractText(step);
        case 'submit_form':
          return await this.executeSubmitForm(step);
        default:
          throw new Error('Unsupported UI action type');
      }
    } catch (error) {
      const executionTime = Date.now() - startTime;
      const errorMsg = error instanceof Error ? error.message : String(error);

      return {
        action_id: step.id || uuidv4(),
        success: false,
        error: errorMsg,
        timestamp: new Date().toISOString(),
        execution_time: executionTime,
      };
    }
  }

  /**
   * Execute click action
   */
  private getActionDescription(action: UIAction): string {
    const direction =
      typeof action.options?.direction === 'string'
        ? action.options.direction
        : 'down';
    const amount =
      typeof action.options?.amount === 'number' ? action.options.amount : 500;
    const targetUrl =
      typeof action.options?.url === 'string' ? action.options.url : '';
    const descriptions: Record<UIAction['action_type'], string> = {
      click: `Click element: ${action.selector}`,
      type: `Type text: ${action.value || ''} in ${action.selector}`,
      select: `Select element: ${action.selector}`,
      hover: `Hover over element: ${action.selector}`,
      scroll: `Scroll ${direction} by ${amount}px`,
      navigate: `Navigate to: ${action.value || targetUrl}`,
      screenshot: `Take screenshot of: ${action.selector}`,
      wait: `Wait for condition: ${action.wait_condition}`,
      extract_text: `Extract text from: ${action.selector}`,
      submit_form: `Submit form: ${action.selector}`,
    };

    return descriptions[action.action_type];
  }

  /**
   * Persist UI execution results
   */
  private persistUIExecution(
    sessionId: string,
    result: UIExecutionSummary,
  ): void {
    try {
      // Store execution history (would go to database in production)
      const entry: UIExecutionHistoryEntry = {
        sessionId,
        result,
        timestamp: new Date().toISOString(),
      };
      const existing = this.executionHistory.get(sessionId) || [];
      existing.push(entry);
      this.executionHistory.set(sessionId, existing);

      console.log(
        `[UIAutomation] UI execution persisted for session ${sessionId}`,
      );
    } catch (error) {
      console.error('Failed to persist UI execution:', error);
    }
  }

  /**
   * Get execution history
   */
  getExecutionHistory(sessionId: string): UIExecutionHistoryEntry[] {
    return this.executionHistory.get(sessionId) || [];
  }
}
