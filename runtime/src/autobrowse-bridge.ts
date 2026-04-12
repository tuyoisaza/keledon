/**
 * AutoBrowse Bridge - Wrapper for AutoBrowse module
 * 
 * Provides:
 * - Structured input/output interface
 * - Error handling
 * - Result formatting
 * - Connection to Electron main process
 */

import { EventEmitter } from 'events';

export interface AutoBrowseInput {
  execution_id?: string;
  goal: string;
  inputs?: Record<string, unknown>;
  target_app?: 'salesforce' | 'genesys' | 'web' | 'custom';
  target_url?: string;
  constraints?: {
    max_steps?: number;
    timeout_ms?: number;
    interactive?: boolean;
  };
  success_criteria?: string[];
}

export interface AutoBrowseStep {
  step_id: string;
  action: string;
  status: 'success' | 'failure' | 'timeout' | 'uncertain';
  timestamp: string;
  duration_ms?: number;
  result?: {
    text?: string;
    url?: string;
  };
  error?: {
    code: string;
    message: string;
  };
  screenshot?: {
    data_url: string;
    width: number;
    height: number;
  };
}

export interface AutoBrowseOutput {
  execution_id: string;
  status: 'success' | 'failure' | 'partial';
  goal_status: 'achieved' | 'failed' | 'uncertain';
  steps_completed: number;
  steps_failed: number;
  duration_ms: number;
  steps: AutoBrowseStep[];
  final_state: {
    url?: string;
    title?: string;
    screenshots: string[];
  };
  artifacts?: Record<string, unknown>;
}

export interface AutoBrowseConfig {
  cdpUrl?: string;
  headless?: boolean;
}

export class AutoBrowseBridge extends EventEmitter {
  private executor: any = null;
  private isInitialized = false;
  private config: AutoBrowseConfig | null = null;

  /**
   * Initialize AutoBrowse with configuration
   * Tries submodule first, falls back to local autobrowse-service
   */
  async initialize(config?: AutoBrowseConfig): Promise<void> {
    this.config = config || {};
    
    let executorModule;
    
    // Try importing from submodule first
    try {
      executorModule = await import('../../autobrowse/src/executor.js');
    } catch (e) {
      // Fall back to local autobrowse-service
      try {
        executorModule = await import('../autobrowse-service/src/executor.js');
      } catch (e2) {
        throw new Error('AutoBrowse not found. Ensure autobrowse submodule is added or autobrowse-service exists.');
      }
    }
    
    this.executor = executorModule.autoBrowseExecutor || executorModule.AutoBrowseExecutor 
      ? new (executorModule.AutoBrowseExecutor || executorModule.default)() 
      : executorModule;
    
    if (this.config.cdpUrl) {
      try {
        await this.executor.connectOverCDP({ cdpUrl: this.config.cdpUrl });
        console.log('[AutoBrowseBridge] Connected via CDP');
      } catch (error) {
        console.warn('[AutoBrowseBridge] CDP connection failed, using fallback launch');
        await this.executor.launch({ headless: this.config.headless ?? true });
      }
    } else {
      await this.executor.launch({ headless: this.config.headless ?? true });
    }

    this.isInitialized = true;
    this.emit('initialized');
    console.log('[AutoBrowseBridge] Initialized');
  }

  /**
   * Execute a goal
   */
  async executeGoal(input: AutoBrowseInput): Promise<AutoBrowseOutput> {
    if (!this.isInitialized || !this.executor) {
      throw new Error('AutoBrowseBridge not initialized');
    }

    const executionId = input.execution_id || `exec-${Date.now()}`;
    
    console.log('[AutoBrowseBridge] Executing goal:', input.goal);

    try {
      const result = await this.executor.executeGoal(
        {
          objective: input.goal,
          target_app: input.target_app,
          target_url: input.target_url,
          constraints: {
            max_steps: input.constraints?.max_steps,
            timeout_ms: input.constraints?.timeout_ms,
            interactive: input.constraints?.interactive
          }
        },
        {
          sessionId: input.inputs?.sessionId as string || 'default',
          flowId: input.inputs?.flowId as string || 'default',
          targetUrl: input.target_url,
          metadata: input.inputs
        }
      );

      return this.formatOutput(executionId, result);

    } catch (error) {
      console.error('[AutoBrowseBridge] Execution failed:', error);
      return this.formatError(executionId, error);
    }
  }

  /**
   * Execute deterministic steps (for ui_steps commands)
   */
  async executeSteps(steps: unknown[], context?: Record<string, unknown>): Promise<AutoBrowseOutput> {
    return this.executeGoal({
      goal: 'Execute predefined steps',
      inputs: { steps, ...context },
      target_app: 'web'
    });
  }

  /**
   * Get current page URL
   */
  async getPageURL(): Promise<string> {
    if (!this.executor) throw new Error('Not initialized');
    return this.executor.getPageURL();
  }

  /**
   * Capture screenshot
   */
  async captureScreenshot(): Promise<string> {
    if (!this.executor) throw new Error('Not initialized');
    return this.executor.captureScreenshot();
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.isInitialized && this.executor?.isConnected();
  }

  /**
   * Cleanup
   */
  async cleanup(): Promise<void> {
    if (this.executor) {
      await this.executor.cleanup();
    }
    this.isInitialized = false;
    console.log('[AutoBrowseBridge] Cleaned up');
  }

  private formatOutput(executionId: string, result: any): AutoBrowseOutput {
    return {
      execution_id: result.execution_id || executionId,
      status: result.status || 'partial',
      goal_status: result.goal_status || 'uncertain',
      steps_completed: result.summary?.successful_steps || 0,
      steps_failed: result.summary?.failed_steps || 0,
      duration_ms: result.summary?.execution_time_ms || 0,
      steps: (result.results || []).map((step: any, index: number) => ({
        step_id: step.step_id || `step-${index + 1}`,
        action: step.action || 'unknown',
        status: step.status || 'uncertain',
        timestamp: step.timestamp || new Date().toISOString(),
        duration_ms: step.duration_ms,
        result: step.result,
        error: step.error,
        screenshot: step.screenshot
      })),
      final_state: {
        url: result.final_state?.url,
        title: result.final_state?.title,
        screenshots: result.final_state?.screenshots || []
      }
    };
  }

  private formatError(executionId: string, error: any): AutoBrowseOutput {
    return {
      execution_id: executionId,
      status: 'failure',
      goal_status: 'failed',
      steps_completed: 0,
      steps_failed: 1,
      duration_ms: 0,
      steps: [],
      final_state: {
        url: '',
        screenshots: []
      }
    };
  }
}

export const autoBrowseBridge = new AutoBrowseBridge();