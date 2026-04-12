/**
 * Execution Router - Routes commands to appropriate executor
 * 
 * Cloud decides → Runtime executes
 * This router determines: deterministic (RPA) vs adaptive (AutoBrowse)
 */

import { EventEmitter } from 'events';
import { RuntimeWebSocketClient } from './websocket-client.js';

export interface ExecutionContext {
  sessionId: string;
  flowId?: string;
  deviceId: string;
  metadata?: Record<string, unknown>;
}

export interface ExecutionResult {
  execution_id: string;
  status: 'success' | 'failure' | 'partial';
  results: unknown[];
  summary: {
    total_steps: number;
    successful_steps: number;
    failed_steps: number;
    execution_time_ms: number;
  };
  timestamp: string;
}

export interface AdaptiveGoalPayload {
  goal: string;
  context?: Record<string, unknown>;
  constraints?: {
    max_steps?: number;
    timeout_ms?: number;
    apps?: string[];
  };
}

export interface UIStepsPayload {
  flow_id: string;
  steps: unknown[];
  context?: Record<string, unknown>;
  execution_strategy?: 'deterministic' | 'adaptive';
}

export class ExecutionRouter extends EventEmitter {
  private wsClient: RuntimeWebSocketClient | null = null;
  private deterministicExecutor: DeterministicExecutor | null = null;
  private adaptiveExecutor: AdaptiveExecutor | null = null;
  private isExecuting = false;

  setWebSocketClient(wsClient: RuntimeWebSocketClient): void {
    this.wsClient = wsClient;
  }

  setExecutors(deterministic: DeterministicExecutor, adaptive: AdaptiveExecutor): void {
    this.deterministicExecutor = deterministic;
    this.adaptiveExecutor = adaptive;
  }

  async executeCommand(
    command: {
      type: string;
      payload: unknown;
    },
    context: ExecutionContext
  ): Promise<ExecutionResult> {
    if (this.isExecuting) {
      throw new Error('Execution already in progress');
    }

    this.isExecuting = true;
    const startTime = Date.now();

    try {
      let result: ExecutionResult;

      switch (command.type) {
        case 'ui_steps':
          result = await this.handleUISteps(command.payload as UIStepsPayload, context);
          break;

        case 'adaptive_goal':
          result = await this.handleAdaptiveGoal(command.payload as AdaptiveGoalPayload, context);
          break;

        case 'say':
          await this.handleSay(command.payload);
          result = this.createSuccessResult(Date.now() - startTime);
          break;

        case 'stop':
          await this.handleStop();
          result = this.createSuccessResult(Date.now() - startTime);
          break;

        default:
          throw new Error(`Unknown command type: ${command.type}`);
      }

      this.emit('execution:completed', result);
      return result;

    } catch (error) {
      const errorResult: ExecutionResult = {
        execution_id: `exec-${Date.now()}`,
        status: 'failure',
        results: [],
        summary: {
          total_steps: 0,
          successful_steps: 0,
          failed_steps: 1,
          execution_time_ms: Date.now() - startTime
        },
        timestamp: new Date().toISOString()
      };

      this.emit('execution:failed', errorResult);
      throw error;

    } finally {
      this.isExecuting = false;
    }
  }

  private async handleUISteps(payload: UIStepsPayload, context: ExecutionContext): Promise<ExecutionResult> {
    const strategy = payload.execution_strategy || 'deterministic';

    if (strategy === 'adaptive' && this.adaptiveExecutor) {
      return this.adaptiveExecutor.execute(payload.steps, context);
    }

    if (this.deterministicExecutor) {
      return this.deterministicExecutor.execute(payload.steps, context);
    }

    throw new Error('No deterministic executor available');
  }

  private async handleAdaptiveGoal(payload: AdaptiveGoalPayload, context: ExecutionContext): Promise<ExecutionResult> {
    if (!this.adaptiveExecutor) {
      throw new Error('Adaptive executor not available');
    }

    return this.adaptiveExecutor.executeGoal(payload.goal, {
      ...context,
      ...payload.context,
      constraints: payload.constraints
    });
  }

  private async handleSay(payload: unknown): Promise<void> {
    this.emit('tts:speak', payload);
  }

  private async handleStop(): Promise<void> {
    if (this.deterministicExecutor) {
      this.deterministicExecutor.stop();
    }
    if (this.adaptiveExecutor) {
      this.adaptiveExecutor.stop();
    }
  }

  private createSuccessResult(executionTimeMs: number): ExecutionResult {
    return {
      execution_id: `exec-${Date.now()}`,
      status: 'success',
      results: [],
      summary: {
        total_steps: 0,
        successful_steps: 0,
        failed_steps: 0,
        execution_time_ms: executionTimeMs
      },
      timestamp: new Date().toISOString()
    };
  }
}

export class DeterministicExecutor {
  private isStopped = false;

  async execute(steps: unknown[], context: ExecutionContext): Promise<ExecutionResult> {
    this.isStopped = false;
    const startTime = Date.now();
    const results: unknown[] = [];

    for (let i = 0; i < (steps as unknown[]).length; i++) {
      if (this.isStopped) break;

      await this.executeStep(steps[i], i, context)
        .then(result => results.push(result))
        .catch(error => results.push({ step_id: i, status: 'failure', error: String(error) }));
    }

    const successful = results.filter((r: unknown) => (r as { status?: string })?.status === 'success').length;

    return {
      execution_id: `exec-${Date.now()}`,
      status: this.isStopped ? 'partial' : 'success',
      results,
      summary: {
        total_steps: results.length,
        successful_steps: successful,
        failed_steps: results.length - successful,
        execution_time_ms: Date.now() - startTime
      },
      timestamp: new Date().toISOString()
    };
  }

  private async executeStep(step: unknown, index: number, context: ExecutionContext): Promise<unknown> {
    console.log(`Executing step ${index}:`, step);
    await new Promise(resolve => setTimeout(resolve, 100));
    return { step_id: index, status: 'success' };
  }

  stop(): void {
    this.isStopped = true;
  }
}

export class AdaptiveExecutor {
  private isStopped = false;

  async executeGoal(goal: string, context: ExecutionContext & { constraints?: unknown }): Promise<ExecutionResult> {
    this.isStopped = false;
    const startTime = Date.now();

    console.log(`Adaptive execution for goal: ${goal}`);

    const plan = this.planExecution(goal, context);
    const results: unknown[] = [];

    for (let i = 0; i < plan.length; i++) {
      if (this.isStopped) break;

      await this.executePlanStep(plan[i], i)
        .then(result => results.push(result))
        .catch(error => results.push({ step_id: i, status: 'failure', error: String(error) }));
    }

    const successful = results.filter((r: unknown) => (r as { status?: string })?.status === 'success').length;

    return {
      execution_id: `exec-${Date.now()}`,
      goal,
      status: this.isStopped ? 'partial' : (successful > 0 ? 'success' : 'failure'),
      results,
      summary: {
        total_steps: results.length,
        successful_steps: successful,
        failed_steps: results.length - successful,
        execution_time_ms: Date.now() - startTime
      },
      timestamp: new Date().toISOString()
    };
  }

  async execute(steps: unknown[], context: ExecutionContext): Promise<ExecutionResult> {
    return this.executeGoal('Execute steps', context);
  }

  private planExecution(goal: string, context: ExecutionContext): Array<{ action: string; description: string }> {
    const url = context.metadata?.targetUrl as string || '';
    
    if (url.includes('salesforce')) {
      return [
        { action: 'navigate', description: 'Navigate to Salesforce' },
        { action: 'wait', description: 'Wait for page load' },
        { action: 'search', description: 'Search for target' }
      ];
    }

    return [
      { action: 'analyze', description: 'Analyze page structure' },
      { action: 'execute', description: 'Execute goal' }
    ];
  }

  private async executePlanStep(step: { action: string; description: string }, index: number): Promise<unknown> {
    console.log(`Executing plan step ${index}: ${step.description}`);
    await new Promise(resolve => setTimeout(resolve, 150));
    return { step_id: index, status: 'success', action: step.action };
  }

  stop(): void {
    this.isStopped = true;
  }
}