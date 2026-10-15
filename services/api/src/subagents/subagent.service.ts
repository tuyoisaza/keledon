import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

function readConditionPath(
  context: Record<string, unknown>,
  path: string,
): unknown {
  const normalizedPath = path.replace(/^context\./, '');
  return normalizedPath.split('.').reduce<unknown>((value, key) => {
    if (typeof value !== 'object' || value === null || Array.isArray(value))
      return undefined;
    return (value as Record<string, unknown>)[key];
  }, context);
}

function conditionValue(
  value: string,
  context: Record<string, unknown>,
): unknown {
  const trimmed = value.trim();
  if (trimmed === 'true') return true;
  if (trimmed === 'false') return false;
  if (trimmed === 'null') return null;
  if (/^-?(?:\d+\.?\d*|\.\d+)$/.test(trimmed)) return Number(trimmed);
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  )
    return trimmed.slice(1, -1);
  if (/^(?:context\.)?[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*$/.test(trimmed))
    return readConditionPath(context, trimmed);
  return undefined;
}

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

interface FlowStepExecutionInput {
  id: string;
  type: string;
  selector?: string | null;
  value?: string | null;
  timeout?: number | null;
}

interface FlowStepExecutionResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

@Injectable()
export class SubAgentService {
  private readonly logger = new Logger(SubAgentService.name);

  private readonly activeSubAgents = new Map<string, SubAgentStatus>();
  private readonly taskQueue: Array<{
    task: SubAgentTask;
    resolve: (value: any) => void;
    reject: (reason?: any) => void;
  }> = [];
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
    return Array.from(this.activeSubAgents.values()).filter(
      (agent) => agent.role === role && agent.status === 'idle',
    );
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

  async completeTask(
    agentId: string,
    result: FlowExecutionResult,
    runId: string,
  ): Promise<void> {
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
    await this.prisma.subAgentRun.update({
      where: { id: runId },
      data: {
        status: 'completed',
        result: JSON.stringify(result),
        completedAt: new Date(),
      },
    });
  }

  async failTask(
    agentId: string,
    error: string,
    runId: string,
    result?: FlowExecutionResult,
  ): Promise<void> {
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
    await this.prisma.subAgentRun.update({
      where: { id: runId },
      data: {
        status: 'failed',
        result: JSON.stringify(result ?? { error }),
        completedAt: new Date(),
      },
    });
  }

  async executeFlow(
    flowId: string,
    parameters: Record<string, any>,
    sessionId: string,
  ): Promise<FlowExecutionResult> {
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
        flowId,
        sessionId,
        status: 'running',
      },
    });

    let executorAgentId: string | undefined;
    let subAgentRunId: string | undefined;
    try {
      const availableAgents = this.getAvailableAgentsByRole('flow-executor');
      if (availableAgents.length === 0) {
        throw new Error('No flow executor agents available');
      }

      const executorAgent = availableAgents[0];
      executorAgentId = executorAgent.id;
      const subAgentRun = await this.prisma.subAgentRun.create({
        data: {
          subAgentId: executorAgent.id,
          flowRunId: flowRun.id,
          flowId,
          flowStepIds: JSON.stringify(flow.steps.map((step) => step.id)),
          status: 'running',
        },
      });
      subAgentRunId = subAgentRun.id;
      await this.assignTask(executorAgent.id, {
        id: `task-${Date.now()}`,
        type: 'flow',
        flowId,
        stepIds: flow.steps.map((s) => s.id),
        parameters,
      });

      for (const step of flow.steps) {
        const stepStart = Date.now();

        if (step.type === 'decision' && step.condition) {
          const shouldSkip = !this.evaluateCondition(
            step.condition,
            extractedData,
          );
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

        const result = await this.executeStep(
          step,
          extractedData,
          executorAgent.id,
        );

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

      const flowRunResult: FlowExecutionResult = {
        success: executionLog.every((e) => e.status !== 'failed'),
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

      if (flowRunResult.success) {
        await this.completeTask(
          executorAgent.id,
          flowRunResult,
          subAgentRun.id,
        );
      } else {
        const failure = executionLog.find((entry) => entry.status === 'failed');
        await this.failTask(
          executorAgent.id,
          failure?.error ?? 'Flow execution failed',
          subAgentRun.id,
          flowRunResult,
        );
      }

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
      if (executorAgentId && subAgentRunId) {
        try {
          await this.failTask(
            executorAgentId,
            error instanceof Error ? error.message : 'Flow execution failed',
            subAgentRunId,
          );
        } catch (trackingError) {
          this.logger.error(
            'Failed to persist subagent flow failure state',
            trackingError instanceof Error ? trackingError.stack : undefined,
          );
        }
      }
      throw error;
    }
  }

  private evaluateCondition(
    condition: string,
    context: Record<string, unknown>,
  ): boolean {
    const match = condition
      .trim()
      .match(
        /^((?:context\.)?[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*)\s*(===|!==|==|!=|>=|<=|>|<)\s*("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|-?(?:\d+\.?\d*|\.\d+)|true|false|null|(?:context\.)?[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*)$/,
      );
    if (match) {
      const left = readConditionPath(context, match[1]);
      const right = conditionValue(match[3], context);
      switch (match[2]) {
        case '===':
        case '==':
          return left === right;
        case '!==':
        case '!=':
          return left !== right;
        case '>':
          return (
            typeof left === 'number' &&
            typeof right === 'number' &&
            left > right
          );
        case '>=':
          return (
            typeof left === 'number' &&
            typeof right === 'number' &&
            left >= right
          );
        case '<':
          return (
            typeof left === 'number' &&
            typeof right === 'number' &&
            left < right
          );
        case '<=':
          return (
            typeof left === 'number' &&
            typeof right === 'number' &&
            left <= right
          );
      }
    }
    if (
      /^(?:context\.)?[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*$/.test(
        condition.trim(),
      )
    )
      return Boolean(readConditionPath(context, condition.trim()));
    return false;
  }

  private async executeStep(
    step: FlowStepExecutionInput,
    _context: Record<string, unknown>,
    agentId: string,
  ): Promise<FlowStepExecutionResult> {
    switch (step.type) {
      case 'decision':
        return { success: true };
      case 'wait': {
        const requestedMs = step.timeout ?? 1000;
        const delayMs = Number.isFinite(requestedMs)
          ? Math.min(Math.max(requestedMs, 0), 30_000)
          : 1000;
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        return { success: true };
      }
      default:
        this.logger.warn(
          `[SubAgent:${agentId}] No tenant execution adapter is configured for step type "${step.type}"`,
        );
        return {
          success: false,
          error: `No tenant execution adapter is configured for step type "${step.type}"`,
        };
    }
  }

  async executeParallelFlows(
    flowIds: string[],
    parameters: Record<string, any>,
    sessionId: string,
  ): Promise<FlowExecutionResult[]> {
    const availableExecutors = this.getAvailableAgentsByRole('flow-executor');
    const maxParallel = Math.min(availableExecutors.length, flowIds.length);
    if (flowIds.length > 0 && maxParallel === 0)
      throw new Error('No flow executor agents available');

    const results: FlowExecutionResult[] = [];
    const batches: string[][] = [];

    for (let i = 0; i < flowIds.length; i += maxParallel) {
      batches.push(flowIds.slice(i, i + maxParallel));
    }

    for (const batch of batches) {
      const batchPromises = batch.map((flowId) =>
        this.executeFlow(flowId, parameters, sessionId).catch(
          (error) =>
            ({
              success: false,
              flowId,
              extractedData: {},
              executionLog: [],
              totalDuration: 0,
              error: error.message,
            }) as FlowExecutionResult,
        ),
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

    return dbAgents.map((agent) => ({
      id: agent.id,
      role: agent.role,
      status: agent.status as 'idle' | 'active' | 'waiting' | 'error',
      currentTask: agent.currentTask
        ? JSON.parse(agent.currentTask)
        : undefined,
      lastActivity: agent.updatedAt,
    }));
  }
}
