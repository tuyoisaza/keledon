import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface SubAgentTask {
  id: string;
  type: 'flow' | 'read' | 'write' | 'wait';
  flowId?: string;
  stepIds?: string[];
  parameters?: Record<string, any>;
  priority?: number;
}

export interface SubAgentStatus {
  id: string;
  role: string;
  status: 'idle' | 'active' | 'waiting' | 'error';
  currentTask?: SubAgentTask;
  lastActivity?: Date;
}

export interface FlowExecutionResult {
  success: boolean;
  flowId: string;
  extractedData: Record<string, any>;
  executionLog: Array<{
    stepId: string;
    stepType: string;
    status: 'success' | 'failed' | 'skipped';
    duration: number;
    result?: any;
    error?: string;
  }>;
  totalDuration: number;
}

@Injectable()
export class SubAgentService {
  private readonly logger = new Logger(SubAgentService.name);
  
  private readonly activeSubAgents = new Map<string, SubAgentStatus>();
  private readonly taskQueue: Array<{ task: SubAgentTask; resolve: Function; reject: Function }> = [];
  private readonly maxConcurrentPerAgent = 3;

  constructor(private prisma: PrismaService) {}

  async initializeSession(sessionId: string): Promise<SubAgentStatus[]> {
    this.logger.log(`[SubAgent] Initializing agents for session: ${sessionId}`);

    const agentConfigs = [
      { name: 'listener-1', role: 'listener', maxParallel: 1 },
      { name: 'processor-1', role: 'processor', maxParallel: 2 },
      { name: 'tool-salesforce', role: 'tool-operator', maxParallel: 3 },
      { name: 'tool-genesys', role: 'tool-operator', maxParallel: 2 },
      { name: 'flow-executor-1', role: 'flow-executor', maxParallel: 3 },
    ];

    const agents: SubAgentStatus[] = [];

    for (const config of agentConfigs) {
      const dbAgent = await this.prisma.subAgent.upsert({
        where: { id: `${sessionId}-${config.name}` },
        create: {
          id: `${sessionId}-${config.name}`,
          name: config.name,
          role: config.role,
          status: 'idle',
          sessionId,
          maxParallel: config.maxParallel,
        },
        update: {
          sessionId,
          status: 'idle',
          currentTask: null,
        },
      });

      const status: SubAgentStatus = {
        id: dbAgent.id,
        role: dbAgent.role,
        status: 'idle',
      };
      
      this.activeSubAgents.set(dbAgent.id, status);
      agents.push(status);
    }

    return agents;
  }

  async cleanupSession(sessionId: string): Promise<void> {
    this.logger.log(`[SubAgent] Cleaning up agents for session: ${sessionId}`);

    await this.prisma.subAgent.updateMany({
      where: { sessionId },
      data: { status: 'idle', sessionId: null, currentTask: null },
    });

    for (const [id] of this.activeSubAgents) {
      if (id.includes(sessionId)) {
        this.activeSubAgents.delete(id);
      }
    }
  }

  getAgentStatus(agentId: string): SubAgentStatus | undefined {
    return this.activeSubAgents.get(agentId);
  }

  getAllAgentStatuses(): SubAgentStatus[] {
    return Array.from(this.activeSubAgents.values());
  }

  getAvailableAgentsByRole(role: string): SubAgentStatus[] {
    return Array.from(this.activeSubAgents.values())
      .filter(agent => agent.role === role && agent.status === 'idle');
  }

  async assignTask(agentId: string, task: SubAgentTask): Promise<void> {
    const agent = this.activeSubAgents.get(agentId);
    if (!agent) {
      throw new Error(`Agent ${agentId} not found`);
    }

    agent.status = 'active';
    agent.currentTask = task;
    agent.lastActivity = new Date();

    await this.prisma.subAgent.update({
      where: { id: agentId },
      data: {
        status: 'active',
        currentTask: JSON.stringify(task),
      },
    });
  }

  async completeTask(agentId: string, result: any): Promise<void> {
    const agent = this.activeSubAgents.get(agentId);
    if (!agent) {
      throw new Error(`Agent ${agentId} not found`);
    }

    agent.status = 'idle';
    agent.currentTask = undefined;
    agent.lastActivity = new Date();

    await this.prisma.subAgent.update({
      where: { id: agentId },
      data: {
        status: 'idle',
        currentTask: null,
      },
    });
  }

  async failTask(agentId: string, error: string): Promise<void> {
    const agent = this.activeSubAgents.get(agentId);
    if (!agent) {
      throw new Error(`Agent ${agentId} not found`);
    }

    agent.status = 'error';
    agent.lastActivity = new Date();

    await this.prisma.subAgent.update({
      where: { id: agentId },
      data: {
        status: 'error',
      },
    });
  }

  async executeFlow(flowId: string, parameters: Record<string, any>, sessionId: string): Promise<FlowExecutionResult> {
    const flow = await this.prisma.flow.findUnique({
      where: { id: flowId },
      include: { steps: { orderBy: { order: 'asc' } } },
    });

    if (!flow) {
      throw new Error(`Flow ${flowId} not found`);
    }

    const startTime = Date.now();
    const extractedData: Record<string, any> = { ...parameters };
    const executionLog: FlowExecutionResult['executionLog'] = [];

    const flowRun = await this.prisma.flowRun.create({
      data: {
        workflowId: flowId,
        sessionId,
        status: 'running',
      },
    });

    try {
      const availableAgents = this.getAvailableAgentsByRole('flow-executor');
      if (availableAgents.length === 0) {
        throw new Error('No flow executor agents available');
      }

      const executorAgent = availableAgents[0];
      await this.assignTask(executorAgent.id, {
        id: `task-${Date.now()}`,
        type: 'flow',
        flowId,
        stepIds: flow.steps.map(s => s.id),
        parameters,
      });

      for (const step of flow.steps) {
        const stepStart = Date.now();

        if (step.type === 'decision' && step.condition) {
          const shouldSkip = !this.evaluateCondition(step.condition, extractedData);
          if (shouldSkip) {
            executionLog.push({
              stepId: step.id,
              stepType: step.type,
              status: 'skipped',
              duration: Date.now() - stepStart,
            });
            continue;
          }
        }

        const result = await this.simulateStepExecution(step, extractedData, executorAgent.id);

        executionLog.push({
          stepId: step.id,
          stepType: step.type,
          status: result.success ? 'success' : 'failed',
          duration: Date.now() - stepStart,
          result: result.data,
          error: result.error,
        });

        if (result.data && step.extract) {
          extractedData[step.extract] = result.data;
        }

        if (!result.success && !step.optional) {
          break;
        }
      }

      await this.completeTask(executorAgent.id, { extractedData, executionLog });

      const flowRunResult: FlowExecutionResult = {
        success: executionLog.every(e => e.status !== 'failed'),
        flowId,
        extractedData,
        executionLog,
        totalDuration: Date.now() - startTime,
      };

      await this.prisma.flowRun.update({
        where: { id: flowRun.id },
        data: {
          status: flowRunResult.success ? 'completed' : 'failed',
          result: JSON.stringify(flowRunResult),
          completedAt: new Date(),
        },
      });

      return flowRunResult;
    } catch (error) {
      await this.prisma.flowRun.update({
        where: { id: flowRun.id },
        data: {
          status: 'failed',
          error: error.message,
          completedAt: new Date(),
        },
      });
      throw error;
    }
  }

  private evaluateCondition(condition: string, context: Record<string, any>): boolean {
    try {
      const func = new Function('context', `return ${condition}`);
      return func(context);
    } catch {
      return false;
    }
  }

  private async simulateStepExecution(step: any, context: Record<string, any>, agentId: string): Promise<{ success: boolean; data?: any; error?: string }> {
    this.logger.log(`[SubAgent:${agentId}] Executing step: ${step.type} - ${step.selector || step.value || ''}`);

    await new Promise(resolve => setTimeout(resolve, 100));

    switch (step.type) {
      case 'navigate':
        return { success: true, data: { url: step.value } };
      case 'click':
        return { success: true, data: { clicked: step.selector } };
      case 'input':
        const inputValue = step.value?.replace(/\{\{(\w+)\}\}/g, (_, key) => context[key] || '');
        return { success: true, data: { input: inputValue } };
      case 'read':
        return { success: true, data: { extracted: `Mock data for ${step.extract}` } };
      case 'wait':
        await new Promise(resolve => setTimeout(resolve, step.timeout || 1000));
        return { success: true };
      case 'submit':
        return { success: true };
      case 'speak':
        return { success: true, data: { spoken: step.value } };
      default:
        return { success: true };
    }
  }

  async executeParallelFlows(flowIds: string[], parameters: Record<string, any>, sessionId: string): Promise<FlowExecutionResult[]> {
    const availableExecutors = this.getAvailableAgentsByRole('flow-executor');
    const maxParallel = Math.min(availableExecutors.length, flowIds.length);

    const results: FlowExecutionResult[] = [];
    const batches: string[][] = [];

    for (let i = 0; i < flowIds.length; i += maxParallel) {
      batches.push(flowIds.slice(i, i + maxParallel));
    }

    for (const batch of batches) {
      const batchPromises = batch.map(flowId => 
        this.executeFlow(flowId, parameters, sessionId)
          .catch(error => ({
            success: false,
            flowId,
            extractedData: {},
            executionLog: [],
            totalDuration: 0,
            error: error.message,
          } as FlowExecutionResult))
      );
      
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    }

    return results;
  }

  async getFlowRunStatus(runId: string): Promise<any> {
    return this.prisma.flowRun.findUnique({
      where: { id: runId },
      include: { subAgentRuns: true },
    });
  }

  async getSessionSubAgents(sessionId: string): Promise<SubAgentStatus[]> {
    const dbAgents = await this.prisma.subAgent.findMany({
      where: { sessionId },
    });

    return dbAgents.map(agent => ({
      id: agent.id,
      role: agent.role,
      status: agent.status as 'idle' | 'active' | 'waiting' | 'error',
      currentTask: agent.currentTask ? JSON.parse(agent.currentTask) : undefined,
      lastActivity: agent.updatedAt,
    }));
  }
}
