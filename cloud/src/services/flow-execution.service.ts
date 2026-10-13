import { Injectable } from '@nestjs/common';
import { Subject } from 'rxjs';
import { randomUUID } from 'crypto';
import {
  countStepsByType,
  createDefaultSteps,
  generateStepError,
  generateStepResult,
  getStepExecutionTime,
  updatePerformance,
} from './flow-execution.steps';
import { getDefaultFlowTemplates } from './flow-execution.templates';

import {
  FlowExecution,
  FlowPerformance,
  FlowStep,
  FlowTemplate,
} from './flow-execution.types';
export type {
  FlowExecution,
  FlowPerformance,
  FlowResult,
  FlowStep,
  FlowTemplate,
} from './flow-execution.types';
@Injectable()
export class FlowExecutionService {
  private executions = new Map<string, FlowExecution>();
  private templates = new Map<string, FlowTemplate>();
  private executionUpdate = new Subject<FlowExecution>();
  private performanceUpdate = new Subject<FlowPerformance>();

  public executions$ = this.executionUpdate.asObservable();
  public performance$ = this.performanceUpdate.asObservable();

  constructor() {
    console.log('FlowExecutionService: Initialized');
    this.initializeDefaultTemplates();
  }

  // Create a new flow execution
  createExecution(
    name: string,
    templateId?: string,
    options: {
      sessionId?: string;
      agentId?: string;
      priority?: FlowExecution['priority'];
      metadata?: Record<string, any>;
    } = {},
  ): FlowExecution {
    const executionId = `exec_${Date.now()}_${randomUUID()}`;

    let steps: FlowStep[] = [];
    if (templateId) {
      const template = this.templates.get(templateId);
      if (template) {
        steps = template.steps.map((step) => ({
          ...step,
          status: 'pending' as const,
          retries: 0,
        }));
      }
    } else {
      // Create default steps for custom flow
      steps = createDefaultSteps();
    }

    const execution: FlowExecution = {
      id: executionId,
      name,
      status: 'idle',
      priority: options.priority || 'medium',
      flowId: templateId,
      sessionId: options.sessionId,
      agentId: options.agentId,
      currentStepIndex: 0,
      totalSteps: steps.length,
      progress: 0,
      steps,
      performance: {
        totalDuration: 0,
        averageStepTime: 0,
        successRate: 0,
        errorRate: 0,
        retriedSteps: 0,
        fastestStep: '',
        slowestStep: '',
      },
      metadata: options.metadata || {},
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.executions.set(executionId, execution);
    this.broadcastExecution(execution);

    console.log(
      `FlowExecution: Created execution ${executionId} for flow "${name}"`,
    );
    return execution;
  }

  // Start flow execution
  startExecution(executionId: string): Promise<boolean> {
    const execution = this.executions.get(executionId);
    if (!execution) {
      throw new Error(`Execution ${executionId} not found`);
    }

    if (execution.status !== 'idle' && execution.status !== 'paused') {
      throw new Error(
        `Execution ${executionId} cannot be started in status ${execution.status}`,
      );
    }

    execution.status = 'running';
    execution.startTime = new Date();
    execution.updatedAt = new Date();

    this.broadcastExecution(execution);

    // Start executing steps
    void this.executeSteps(executionId).catch((error: unknown) => {
      console.error(`FlowExecution: Failed to run ${executionId}:`, error);
    });

    console.log(`FlowExecution: Started execution ${executionId}`);
    return Promise.resolve(true);
  }

  // Pause flow execution
  pauseExecution(executionId: string): boolean {
    const execution = this.executions.get(executionId);
    if (!execution || execution.status !== 'running') {
      return false;
    }

    execution.status = 'paused';
    execution.updatedAt = new Date();
    this.broadcastExecution(execution);

    console.log(`FlowExecution: Paused execution ${executionId}`);
    return true;
  }

  // Resume flow execution
  resumeExecution(executionId: string): Promise<boolean> {
    const execution = this.executions.get(executionId);
    if (!execution || execution.status !== 'paused') {
      return Promise.resolve(false);
    }

    execution.status = 'running';
    execution.updatedAt = new Date();
    this.broadcastExecution(execution);

    // Continue executing steps
    void this.executeSteps(executionId).catch((error: unknown) => {
      console.error(`FlowExecution: Failed to resume ${executionId}:`, error);
    });

    console.log(`FlowExecution: Resumed execution ${executionId}`);
    return Promise.resolve(true);
  }

  // Stop flow execution
  stopExecution(executionId: string, reason?: string): boolean {
    const execution = this.executions.get(executionId);
    if (!execution) {
      return false;
    }

    execution.status = 'cancelled';
    execution.endTime = new Date();
    execution.error = reason || 'Execution cancelled by user';
    execution.updatedAt = new Date();

    if (execution.startTime) {
      execution.duration =
        execution.endTime.getTime() - execution.startTime.getTime();
      this.updatePerformance(execution);
    }

    this.broadcastExecution(execution);

    console.log(`FlowExecution: Stopped execution ${executionId}: ${reason}`);
    return true;
  }

  // Reset flow execution
  resetExecution(executionId: string): boolean {
    const execution = this.executions.get(executionId);
    if (!execution) {
      return false;
    }

    // Reset steps
    execution.steps.forEach((step) => {
      step.status = 'pending';
      step.startTime = undefined;
      step.endTime = undefined;
      step.duration = undefined;
      step.error = undefined;
      step.actualResult = undefined;
      step.screenshot = undefined;
      step.data = undefined;
      step.retries = 0;
    });

    // Reset execution state
    execution.status = 'idle';
    execution.currentStepIndex = 0;
    execution.progress = 0;
    execution.startTime = undefined;
    execution.endTime = undefined;
    execution.duration = undefined;
    execution.result = undefined;
    execution.error = undefined;
    execution.updatedAt = new Date();

    this.broadcastExecution(execution);

    console.log(`FlowExecution: Reset execution ${executionId}`);
    return true;
  }

  // Delete flow execution
  deleteExecution(executionId: string): boolean {
    const success = this.executions.delete(executionId);
    if (success) {
      console.log(`FlowExecution: Deleted execution ${executionId}`);
    }
    return success;
  }

  // Get execution by ID
  getExecution(executionId: string): FlowExecution | undefined {
    return this.executions.get(executionId);
  }

  // Get all executions
  getExecutions(
    filters: {
      status?: FlowExecution['status'];
      agentId?: string;
      sessionId?: string;
      flowId?: string;
      limit?: number;
      offset?: number;
    } = {},
  ): FlowExecution[] {
    let executions = Array.from(this.executions.values());

    // Apply filters
    if (filters.status) {
      executions = executions.filter((exec) => exec.status === filters.status);
    }
    if (filters.agentId) {
      executions = executions.filter(
        (exec) => exec.agentId === filters.agentId,
      );
    }
    if (filters.sessionId) {
      executions = executions.filter(
        (exec) => exec.sessionId === filters.sessionId,
      );
    }
    if (filters.flowId) {
      executions = executions.filter((exec) => exec.flowId === filters.flowId);
    }

    // Sort by creation date (newest first)
    executions.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    // Apply pagination
    if (filters.offset) {
      executions = executions.slice(filters.offset);
    }
    if (filters.limit) {
      executions = executions.slice(0, filters.limit);
    }

    return executions;
  }

  // Get flow templates
  getTemplates(category?: string): FlowTemplate[] {
    let templates = Array.from(this.templates.values());

    if (category) {
      templates = templates.filter(
        (template) => template.category === category,
      );
    }

    return templates.sort(
      (a, b) => b.updatedAt.getTime() - a.updatedAt.getTime(),
    );
  }

  // Get template by ID
  getTemplate(templateId: string): FlowTemplate | undefined {
    return this.templates.get(templateId);
  }

  // Create flow template
  createTemplate(
    template: Omit<FlowTemplate, 'id' | 'createdAt' | 'updatedAt'>,
  ): FlowTemplate {
    const templateId = `template_${Date.now()}_${randomUUID()}`;

    const newTemplate: FlowTemplate = {
      ...template,
      id: templateId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.templates.set(templateId, newTemplate);

    console.log(
      `FlowExecution: Created template ${templateId} for flow "${template.name}"`,
    );
    return newTemplate;
  }

  // Update execution step result
  updateStepResult(
    executionId: string,
    stepId: string,
    result: {
      status: FlowStep['status'];
      actualResult?: unknown;
      error?: string;
      screenshot?: string;
      data?: unknown;
    },
  ): boolean {
    const execution = this.executions.get(executionId);
    if (!execution) return false;

    const step = execution.steps.find((s) => s.id === stepId);
    if (!step) return false;

    step.status = result.status;
    step.actualResult = result.actualResult;
    step.error = result.error;
    step.screenshot = result.screenshot;
    step.data = result.data;

    if (result.status === 'completed' || result.status === 'failed') {
      step.endTime = new Date();
      if (step.startTime) {
        step.duration = step.endTime.getTime() - step.startTime.getTime();
      }
    }

    execution.updatedAt = new Date();
    this.broadcastExecution(execution);

    return true;
  }

  // Private methods
  private async executeSteps(executionId: string): Promise<void> {
    const execution = this.executions.get(executionId);
    if (!execution || execution.status !== 'running') return;

    for (let i = execution.currentStepIndex; i < execution.steps.length; i++) {
      // Check if execution is still running
      const currentExec = this.executions.get(executionId);
      if (!currentExec || currentExec.status !== 'running') {
        break;
      }

      const step = execution.steps[i];
      execution.currentStepIndex = i;
      execution.progress = (i / execution.totalSteps) * 100;

      // Execute step
      await this.executeStep(executionId, step);

      // Update execution
      execution.updatedAt = new Date();
      this.broadcastExecution(execution);

      // Check if step failed and has retries remaining
      if (step.status === 'failed' && step.retries < step.maxRetries) {
        step.retries++;
        step.status = 'pending';
        i--; // Retry this step
        await new Promise((resolve) => setTimeout(resolve, 1000)); // Delay before retry
      } else if (step.status === 'failed') {
        // Step failed permanently
        execution.status = 'failed';
        execution.error = `Step ${step.name} failed: ${step.error}`;
        execution.endTime = new Date();
        if (execution.startTime) {
          execution.duration =
            execution.endTime.getTime() - execution.startTime.getTime();
        }
        this.updatePerformance(execution);
        break;
      }
    }

    // Check if all steps completed
    const currentExec = this.executions.get(executionId);
    if (
      currentExec &&
      currentExec.status === 'running' &&
      currentExec.currentStepIndex >= currentExec.steps.length - 1
    ) {
      this.completeExecution(executionId);
    }
  }

  private async executeStep(
    executionId: string,
    step: FlowStep,
  ): Promise<void> {
    step.status = 'running';
    step.startTime = new Date();

    // Simulate step execution based on type
    const executionTime = getStepExecutionTime(step.type);

    await new Promise((resolve) => setTimeout(resolve, executionTime));

    // Deterministic execution
    const success = false;

    if (success) {
      step.status = 'completed';
      step.actualResult = generateStepResult(step);
    } else {
      step.status = 'failed';
      step.error = generateStepError(step.type);
    }

    step.endTime = new Date();
    step.duration = step.endTime.getTime() - step.startTime.getTime();
  }

  private completeExecution(executionId: string): void {
    const execution = this.executions.get(executionId);
    if (!execution) return;

    execution.status = 'completed';
    execution.endTime = new Date();
    execution.progress = 100;

    if (execution.startTime) {
      execution.duration =
        execution.endTime.getTime() - execution.startTime.getTime();
      this.updatePerformance(execution);
    }

    // Generate result
    execution.result = {
      success: true,
      action: `Flow "${execution.name}" completed successfully`,
      fields_filled: countStepsByType(execution, 'input'),
      forms_submitted: countStepsByType(execution, 'click'),
      processes_automated: [
        `Completed ${execution.steps.filter((s) => s.status === 'completed').length} steps`,
      ],
      time_saved: Math.round(((execution.duration || 0) / 1000 / 60) * 5), // Assume 5x faster than manual
      errors_avoided: countStepsByType(execution, 'validate').length,
    };

    this.broadcastExecution(execution);
    console.log(`FlowExecution: Completed execution ${executionId}`);
  }

  private updatePerformance(execution: FlowExecution): void {
    this.performanceUpdate.next(updatePerformance(execution));
  }

  private initializeDefaultTemplates(): void {
    getDefaultFlowTemplates().forEach((template) =>
      this.createTemplate(template),
    );
  }

  private broadcastExecution(execution: FlowExecution): void {
    this.executionUpdate.next(execution);
  }

  // Cleanup old executions
  cleanup(): void {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 7); // Keep 7 days

    let cleanedCount = 0;
    for (const [id, execution] of this.executions.entries()) {
      if (
        execution.updatedAt < cutoffDate &&
        (execution.status === 'completed' ||
          execution.status === 'failed' ||
          execution.status === 'cancelled')
      ) {
        this.executions.delete(id);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      console.log(`FlowExecution: Cleaned up ${cleanedCount} old executions`);
    }
  }
}
