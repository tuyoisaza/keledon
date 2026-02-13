import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import {
  Agent,
  AgentHealth,
  Task,
  TaskRequirements,
  AgentPool,
  OrchestrationStrategy,
  Workflow,
  WorkflowStep
} from './interfaces/agent-orchestration.interfaces';

@Injectable()
export class AgentOrchestrationService {
  private agentPools: Map<string, AgentPool> = new Map();
  private tasks: Map<string, Task> = new Map();
  private workflows: Map<string, Workflow> = new Map();
  private strategies: Map<string, OrchestrationStrategy> = new Map();

  constructor() {
    this.initializeDefaultStrategies();
    this.initializeDefaultPool();
  }

  async registerAgent(agent: Agent): Promise<void> {
    const pool = this.agentPools.get('default');
    if (pool) {
      const existingIndex = pool.agents.findIndex(a => a.id === agent.id);
      if (existingIndex >= 0) {
        pool.agents[existingIndex] = agent;
      } else {
        pool.agents.push(agent);
      }
      this.updateAgentHealth(agent.id);
    }
  }

  async submitTask(task: Task): Promise<string> {
    this.tasks.set(task.id, task);
    
    const pool = this.findSuitablePool(task);
    if (pool) {
      pool.taskQueue.push(task);
      pool.currentQueueSize = pool.taskQueue.length;
      await this.processQueue(pool);
    }
    
    return task.id;
  }

  async assignTask(taskId: string, strategy: string = 'priority'): Promise<boolean> {
    const task = this.tasks.get(taskId);
    if (!task || task.status !== 'pending') {
      return false;
    }

    const orchestrationStrategy = this.strategies.get(strategy);
    if (!orchestrationStrategy) {
      return false;
    }

    const pool = this.findSuitablePool(task);
    if (!pool) {
      return false;
    }

    const agent = orchestrationStrategy.selectAgent(task, pool.agents);
    if (!agent) {
      return false;
    }

    return this.executeTask(task, agent);
  }

  async updateAgentHealth(agentId: string, health?: Partial<AgentHealth>): Promise<void> {
    for (const pool of this.agentPools.values()) {
      const agent = pool.agents.find(a => a.id === agentId);
      if (agent) {
        if (health) {
          agent.health = { ...agent.health, ...health, lastCheck: new Date() };
        } else {
          const responseTime = 0;
          const errorRate = agent.health.errorRate;

          agent.health = {
            status: errorRate > 0.5 ? 'unhealthy' : responseTime > 800 ? 'degraded' : 'healthy',
            lastCheck: new Date(),
            responseTime,
            errorRate,
            uptime: Date.now() - new Date().getTime(),
            resources: {
              cpu: 0,
              memory: 0,
              network: 0
            }
          };
        }
        break;
      }
    }
  }

  async executeWorkflow(workflowId: string, context: Record<string, any>): Promise<void> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow ${workflowId} not found`);
    }

    workflow.context = { ...workflow.context, ...context };
    workflow.status = 'active';

    await this.executeWorkflowSteps(workflow);
  }

  getAgentPool(poolId: string): AgentPool | undefined {
    return this.agentPools.get(poolId);
  }

  getTask(taskId: string): Task | undefined {
    return this.tasks.get(taskId);
  }

  getWorkflow(workflowId: string): Workflow | undefined {
    return this.workflows.get(workflowId);
  }

  getAgentsByType(type: string): Agent[] {
    const agents: Agent[] = [];
    for (const pool of this.agentPools.values()) {
      agents.push(...pool.agents.filter(agent => agent.type === type));
    }
    return agents;
  }

  getTasksByStatus(status: Task['status']): Task[] {
    return Array.from(this.tasks.values()).filter(task => task.status === status);
  }

  async monitorAgentHealth(): Promise<Map<string, AgentHealth>> {
    const healthMap = new Map<string, AgentHealth>();

    for (const pool of this.agentPools.values()) {
      for (const agent of pool.agents) {
        await this.updateAgentHealth(agent.id);
        healthMap.set(agent.id, agent.health);
      }
    }

    return healthMap;
  }

  private initializeDefaultStrategies(): void {
    this.strategies.set('priority', {
      name: 'Priority-based',
      description: 'Assigns tasks to highest priority available agent',
      selectAgent: (task: Task, agents: Agent[]): Agent | null => {
        const suitableAgents = agents.filter(agent => 
          this.isAgentSuitable(agent, task) &&
          agent.currentTaskCount < agent.maxConcurrentTasks
        );

        if (suitableAgents.length === 0) return null;

        return suitableAgents.reduce((best, current) => 
          current.priority > best.priority ? current : best
        );
      },
      onTaskComplete: (task: Task, agent: Agent) => {
        agent.currentTaskCount--;
        agent.loadFactor = Math.max(0, agent.loadFactor - 0.1);
      },
      onTaskFail: (task: Task, agent: Agent, error: string) => {
        agent.currentTaskCount--;
        agent.health.errorRate += 0.1;
      },
      onAgentHealthChange: (agentId: string) => {
        for (const pool of this.agentPools.values()) {
          const agent = pool.agents.find(a => a.id === agentId);
          if (agent && agent.health.status === 'unhealthy') {
            agent.status = 'offline';
          }
        }
      }
    });

    this.strategies.set('load_balanced', {
      name: 'Load Balanced',
      description: 'Assigns tasks to least loaded agent',
      selectAgent: (task: Task, agents: Agent[]): Agent | null => {
        const suitableAgents = agents.filter(agent => 
          this.isAgentSuitable(agent, task) &&
          agent.currentTaskCount < agent.maxConcurrentTasks
        );

        if (suitableAgents.length === 0) return null;

        return suitableAgents.reduce((best, current) => 
          current.loadFactor < best.loadFactor ? current : best
        );
      },
      onTaskComplete: (task: Task, agent: Agent) => {
        agent.currentTaskCount--;
        agent.loadFactor = Math.max(0, agent.loadFactor - 0.1);
      },
      onTaskFail: (task: Task, agent: Agent, error: string) => {
        agent.currentTaskCount--;
        agent.health.errorRate += 0.1;
      },
      onAgentHealthChange: (agentId: string) => {
        for (const pool of this.agentPools.values()) {
          const agent = pool.agents.find(a => a.id === agentId);
          if (agent && agent.health.status === 'unhealthy') {
            agent.status = 'offline';
          }
        }
      }
    });
  }

  private initializeDefaultPool(): void {
    const defaultPool: AgentPool = {
      id: 'default',
      name: 'Default Agent Pool',
      agents: [],
      taskQueue: [],
      priorityMode: 'priority',
      maxQueueSize: 1000,
      currentQueueSize: 0
    };

    this.agentPools.set('default', defaultPool);
  }

  private findSuitablePool(task: Task): AgentPool | null {
    for (const pool of this.agentPools.values()) {
      if (pool.currentQueueSize < pool.maxQueueSize) {
        return pool;
      }
    }
    return null;
  }

  private isAgentSuitable(agent: Agent, task: Task): boolean {
    return task.requirements.capabilities.every(cap => 
      agent.capabilities.includes(cap)
    ) && agent.priority >= task.requirements.minPriority;
  }

  private async executeTask(task: Task, agent: Agent): Promise<boolean> {
    task.assignedAgentId = agent.id;
    task.assignedAt = new Date();
    task.status = 'assigned';

    agent.currentTaskCount++;
    agent.loadFactor = Math.min(1, agent.loadFactor + 0.1);
    agent.status = 'busy';

    setTimeout(() => {
      this.completeTask(task.id);
    }, 1000);

    return true;
  }

  private completeTask(taskId: string): void {
    const task = this.tasks.get(taskId);
    if (!task) return;

    task.status = 'completed';
    task.completedAt = new Date();

    for (const pool of this.agentPools.values()) {
      const agent = pool.agents.find(a => a.id === task.assignedAgentId);
      if (agent) {
        agent.currentTaskCount--;
        agent.loadFactor = Math.max(0, agent.loadFactor - 0.1);
        if (agent.currentTaskCount === 0) {
          agent.status = 'idle';
        }
        break;
      }
    }
  }

  private async processQueue(pool: AgentPool): Promise<void> {
    const strategy = this.strategies.get(pool.priorityMode);
    if (!strategy) return;

    while (pool.taskQueue.length > 0) {
      const task = pool.taskQueue[0];
      const agent = strategy.selectAgent(task, pool.agents);

      if (agent && this.executeTask(task, agent)) {
        pool.taskQueue.shift();
        pool.currentQueueSize = pool.taskQueue.length;
      } else {
        break;
      }
    }
  }

  private async executeWorkflowSteps(workflow: Workflow): Promise<void> {
    const steps = workflow.steps.filter(step => step.status === 'pending');

    for (const step of steps) {
      if (this.checkStepDependencies(step, workflow)) {
        await this.executeWorkflowStep(step);
      }
    }
  }

  private checkStepDependencies(step: WorkflowStep, workflow: Workflow): boolean {
    return step.dependencies.every(depId => {
      const depStep = workflow.steps.find(s => s.id === depId);
      return depStep && depStep.status === 'completed';
    });
  }

  private async executeWorkflowStep(step: WorkflowStep): Promise<void> {
    step.status = 'running';

    const task: Task = {
      id: `workflow_${step.id}`,
      type: step.taskType,
      priority: 1,
      payload: step.payload,
      requirements: {
        capabilities: [step.agentType],
        minPriority: 1,
        maxLoadFactor: 0.8,
        estimatedDuration: step.timeout,
        dependencies: step.dependencies,
        resourceRequirements: {}
      },
      status: 'pending',
      createdAt: new Date(),
      retryCount: 0,
      maxRetries: step.retryPolicy.maxRetries
    };

    await this.submitTask(task);
  }


}