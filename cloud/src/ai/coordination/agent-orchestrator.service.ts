import { Injectable } from '@nestjs/common';
import { ConfigService } from '../../config/config.service';
import {
  CoordinationOptions,
  CoordinationResult,
  Task,
  TaskPriority,
  TaskStatus,
  AgentStatus,
  CoordinationStrategy,
  ConflictResolutionStrategy,
  LoadBalancingStrategy,
  AgentExecution,
  RecommendedAction,
  Agent,
  SystemLearning,
  LearningEvent
} from './types/coordination.types';

@Injectable()
export class AgentCoordinationService {
  constructor(private readonly configService: ConfigService) {
    this.activeCoordinations = new Map();
    this.agentRegistry = new Map();
    this.systemLearning = new SystemLearning();
    this.taskQueue = new Map();
    this.agentPerformance = new Map();
    this.initializeAgentRegistry();
  }

  private activeCoordinations: Map<string, AgentCoordination> = new Map();
  private agentRegistry: Map<string, Agent> = new Map();
  private systemLearning: SystemLearning = {
    patterns: [],
    adaptations: [],
    insights: [],
    lastUpdated: new Date(),
    modelVersion: '1.0.0',
    performance: {
      overallAccuracy: 0.88,
      responseTime: 250,
      errorRate: 0.12,
      taskSuccessRate: 0.91
    }
  };
  private taskQueue: Map<string, Task[]> = new Map();
  private agentPerformance: Map<string, any> = new Map();

  private initializeAgentRegistry(): void {
    console.log('[Agent Coordination] Initializing agent registry...');
    
    const defaultAgents: Agent[] = [
      {
        id: 'orchestrator-main',
        type: 'orchestrator',
        name: 'Main Orchestrator',
        description: 'Primary agent coordination and task distribution manager',
        status: 'active',
        metrics: {
          successRate: 0.92,
          averageResponseTime: 200,
          tasksCompleted: 1450,
          currentLoad: 3,
          maxCapacity: 5,
          lastUpdated: new Date()
        },
        configuration: {
          maxConcurrentTasks: 5,
          timeoutDuration: 30000,
          retryAttempts: 3,
          learningEnabled: true,
          specialization: ['coordination', 'task_planning', 'agent_management'],
          capabilities: ['workflow_coordination', 'task_distribution', 'load_balancing', 'conflict_resolution']
        },
        specialization: ['coordination', 'planning', 'management', 'optimization']
      }
    ];

    defaultAgents.forEach(agent => {
      this.agentRegistry.set(agent.id, agent);
      this.agentPerformance.set(agent.id, agent.metrics);
    });

    console.log(`[Agent Coordination] Initialized ${defaultAgents.length} agents`);
  }

  async coordinateAgents(options: CoordinationOptions): Promise<CoordinationResult> {
    const startTime = Date.now();
    
    try {
      console.log('[Agent Coordination] Starting agent coordination:', {
        sessionId: options.sessionId,
        agents: options.agents,
        strategy: options.strategy,
        conflictResolver: options.conflictResolver,
        loadBalancing: options.loadBalancing
      });

      // Create coordination context
      const coordination = await this.createCoordinationContext(options);
      this.activeCoordinations.set(options.sessionId, coordination);
      
      // Analyze current state and get available agents
      const availableAgents = this.getAvailableAgents(options.agents);
      
      // Generate task queue
      const tasks = await this.generateTaskQueue(options);
      
      // Coordinate agents for task execution
      const agentExecutions = await this.distributeTasksToAgents(tasks, availableAgents, coordination);
      
      // Generate recommended actions
      const nextActions = await this.generateRecommendedActions(coordination, agentExecutions, tasks);
      
      // Update system learning
      await this.updateSystemLearning(agentExecutions, coordination, options);

      const result: CoordinationResult = {
        sessionId: options.sessionId,
        agents: agentExecutions,
        conversation: {}, // Would be populated by conversation service
        nextActions,
        confidence: this.calculateCoordinationConfidence(agentExecutions, tasks, coordination),
        processingTime: Date.now() - startTime,
        success: true,
        metrics: await this.calculateCoordinationMetrics(coordination, agentExecutions, tasks)
      };

      console.log('[Agent Coordination] Coordination completed:', {
        sessionId: options.sessionId,
        processingTime: result.processingTime,
        agentCount: result.metrics.activeAgents,
        confidence: result.confidence
      });

      return result;
    } catch (error) {
      console.error('[Agent Coordination] Error in coordination:', error);
      throw error;
    }
  }

  private async createCoordinationContext(options: CoordinationOptions): Promise<AgentCoordination> {
    console.log('[Agent Coordination] Creating coordination context for:', options.sessionId);
    
    return {
      coordinationId: `coord_${options.sessionId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      sessionId: options.sessionId,
      primaryAgent: options.agents[0] || 'orchestrator-main',
      supportingAgents: options.agents.slice(1),
      mode: options.strategy || CoordinationStrategy.COLLABORATIVE,
      conflictResolver: options.conflictResolver || ConflictResolutionStrategy.HIERARCHICAL,
      loadBalancing: options.loadBalancing || LoadBalancingStrategy.CAPABILITY_BASED,
      status: 'active',
      createdAt: new Date(),
      lastActivity: new Date()
    };
  }

  private getAvailableAgents(requestedAgents: string[]): Agent[] {
    const availableAgents: Agent[] = [];
    
    for (const agentId of requestedAgents) {
      const agent = this.agentRegistry.get(agentId);
      if (agent && agent.status === 'active') {
        // Check if agent has capacity
        const performance = this.agentPerformance.get(agentId);
        if (performance && performance.currentLoad < performance.configuration.maxConcurrentTasks) {
          availableAgents.push(agent);
        } else {
          console.log(`[Agent Coordination] Agent ${agentId} is at capacity (current: ${performance.currentLoad}/${performance.configuration.maxConcurrentTasks})`);
        }
      }
    }
    
    if (availableAgents.length === 0) {
      // Fallback to orchestrator if no specific agents are available
      const orchestrator = this.agentRegistry.get('orchestrator-main');
      if (orchestrator && orchestrator.status === 'active') {
        availableAgents.push(orchestrator);
      }
    }
    
    console.log('[Agent Coordination] Available agents:', availableAgents.map(a => a.id));
    return availableAgents;
  }

  private async generateTaskQueue(options: CoordinationOptions): Promise<Task[]> {
    console.log('[Agent Coordination] Generating task queue for session:', options.sessionId);
    
    // Mock task generation for Phase 5
    const tasks: Task[] = [
      {
        id: `task_${Date.now()}_1`,
        sessionId: options.sessionId,
        type: 'task_analysis',
        description: 'Analyze automation requirements and break down into subtasks',
        priority: TaskPriority.HIGH,
        status: TaskStatus.PENDING,
        parameters: { complexity: 'medium' },
        createdAt: new Date(),
        scheduledFor: new Date(Date.now() + 5000)
      },
      {
        id: `task_${Date.now()}_2`,
        sessionId: options.sessionId,
        type: 'workflow_design',
        description: 'Design automation workflow with detailed steps',
        priority: TaskPriority.HIGH,
        status: TaskStatus.PENDING,
        parameters: { complexity: 'high' },
        createdAt: new Date(),
        scheduledFor: new Date(Date.now() + 3000)
      },
      {
        id: `task_${Date.now()}_3`,
        sessionId: options.sessionId,
        type: 'resource_optimization',
        description: 'Optimize resource usage and performance',
        priority: TaskPriority.NORMAL,
        status: TaskStatus.PENDING,
        parameters: { target: 'efficiency' },
        createdAt: new Date()
      },
      {
        id: `task_${Date.now()}_4`,
        sessionId: options.sessionId,
        type: 'load_balancing',
        description: 'Analyze current agent performance and redistribute workload',
        priority: TaskPriority.NORMAL,
        status: TaskStatus.PENDING,
        parameters: { analysis_frequency: 'continuous' },
        createdAt: new Date()
      }
    ];

    this.taskQueue.set(options.sessionId, tasks);
    
    console.log('[Agent Coordination] Generated', tasks.length, 'tasks for queue');
    return tasks;
  }

  private async distributeTasksToAgents(tasks: Task[], availableAgents: Agent[], coordination: AgentCoordination): Promise<AgentExecution[]> {
    console.log('[Agent Coordination] Distributing', tasks.length, 'tasks to', availableAgents.length, 'agents');
    
    const executions: AgentExecution[] = [];
    const strategy = coordination.loadBalancing;
    
    for (const task of tasks) {
      const bestAgent = this.selectBestAgentForTask(task, availableAgents, strategy);
      
      if (bestAgent) {
        const execution: AgentExecution = {
          agentId: bestAgent.id,
          agentType: bestAgent.type,
          taskId: task.id,
          taskType: task.type,
          status: TaskStatus.IN_PROGRESS,
          startTime: new Date(),
          coordinationId: coordination.coordinationId,
          confidence: this.calculateTaskConfidence(task, bestAgent),
          error: undefined,
          metadata: {
            strategy: strategy,
            selectionReason: this.getSelectionReason(bestAgent, task, availableAgents)
          }
        };
        
        executions.push(execution);
        console.log('[Agent Coordination] Assigned task', task.id, 'to agent:', bestAgent.id);
      }
    }

    return executions;
  }

  private selectBestAgentForTask(task: Task, availableAgents: Agent[], strategy: LoadBalancingStrategy): Agent | undefined {
    let bestAgent: Agent | undefined;
    let bestScore = 0;
    
    switch (strategy) {
      case LoadBalancing.CAPABILITY_BASED:
        bestAgent = this.selectAgentByCapability(task, availableAgents);
        break;
      case LoadBalancing.LEAST_BUSY:
        bestAgent = this.selectAgentByLoad(availableAgents);
        break;
      case LoadBalancing.PERFORMANCE_BASED:
        bestAgent = this.selectAgentByPerformance(availableAgents);
        break;
      case LoadBalancing.PREDICTIVE:
        bestAgent = this.selectAgentPredictive(task, availableAgents);
        break;
      case LoadBalancing.ROUND_ROBIN:
      default:
        bestAgent = availableAgents[Math.floor(Math.random() * availableAgents.length)];
        break;
    }

    return bestAgent;
  }

  private selectAgentByCapability(task: Task, availableAgents: Agent[]): Agent | undefined {
    const capabilityMapping: Record<string, string[]> = {
      'task_analysis': ['orchestration', 'planning', 'analysis'],
      'workflow_design': ['orchestration', 'automation', 'design'],
      'resource_optimization': ['rpa', 'performance', 'optimization'],
      'load_balancing': ['monitoring', 'coordination']
    };

    const requiredCapabilities = capabilityMapping[task.type] || [];
    
    for (const agent of availableAgents) {
      const agentCapabilities = agent.specialization || [];
      const capabilityScore = this.calculateCapabilityScore(requiredCapabilities, agentCapabilities);
      
      if (capabilityScore > bestScore) {
        bestScore = capabilityScore;
        bestAgent = agent;
      }
    }

    return bestAgent;
  }

  private selectAgentByLoad(availableAgents: Agent[]): Agent | undefined {
    let bestAgent: Agent | undefined;
    let lowestLoad = Infinity;
    
    for (const agent of availableAgents) {
      const performance = this.agentPerformance.get(agent.id);
      if (performance && performance.currentLoad < lowestLoad) {
        lowestLoad = performance.currentLoad;
        bestAgent = agent;
      }
    }

    return bestAgent;
  }

  private selectAgentByPerformance(availableAgents: Agent[]): Agent | undefined {
    let bestAgent: Agent | undefined;
    let highestSuccessRate = 0;
    
    for (const agent of availableAgents) {
      const performance = this.agentPerformance.get(agent.id);
      if (performance && performance.successRate > highestSuccessRate) {
        highestSuccessRate = performance.successRate;
        bestAgent = agent;
      }
    }

    return bestAgent;
  }

  private selectAgentPredictive(task: Task, availableAgents: Agent[]): Agent | undefined {
    // Mock predictive agent selection based on historical performance and task similarity
    const bestAgent = availableAgents.reduce((best, current) => {
      const currentScore = this.agentPerformance.get(current.id).successRate;
      const bestScore = this.agentPerformance.get(best.id).successRate;
      
      // Simple prediction: prefer agent with best recent performance
      return bestScore > currentScore ? best : current;
    }) || availableAgents[0];

    return bestAgent;
  }

  private calculateTaskConfidence(task: Task, agent: Agent): number {
    let baseConfidence = 0.7;
    
    // Adjust based on agent performance
    const performance = this.agentPerformance.get(agent.id);
    if (performance) {
      baseConfidence *= performance.successRate;
    }
    
    // Adjust based on task complexity
    const complexityMultiplier = {
      'simple': 1.2,
      'medium': 1.0,
      'high': 0.8,
      'enterprise': 0.6
    }[task.parameters?.complexity] || 'medium';
    
    baseConfidence *= complexityMultiplier;

    // Adjust based on agent specialization
    const specializationScore = this.calculateSpecializationScore(task.type, agent.specialization || []);
    baseConfidence *= specializationScore;

    return Math.max(0.1, Math.min(0.95, baseConfidence));
  }

  private calculateCapabilityScore(required: string[], available: string[]): number {
    let score = 0;
    
    for (const capability of required) {
      if (available.includes(capability)) {
        score += 1;
      }
    }
    
    return score / required.length;
  }

  private calculateSpecializationScore(taskType: string, specializations: string[]): number {
    let score = 0;
    
    for (const specialization of specializations) {
      if (this.isSpecializationRelevant(taskType, specialization)) {
        score += 1;
      }
    }
    
    return score / Math.max(1, specializations.length);
  }

  private isSpecializationRelevant(taskType: string, specialization: string): boolean {
    const relevanceMap: Record<string, string[]> = {
      'task_analysis': ['orchestration', 'planning', 'analysis'],
      'workflow_design': ['orchestration', 'automation', 'design'],
      'resource_optimization': ['rpa', 'performance', 'optimization'],
      'load_balancing': ['monitoring', 'coordination'],
      'automation': ['rpa', 'workflow', 'browser'],
      'conversation': ['tts', 'stt', 'nlu']
    };
    
    const relevantSpecializations = relevanceMap[taskType] || [];
    
    return relevantSpecializations.some(spec => specializations.includes(spec));
  }

  private getSelectionReason(agent: Agent, task: Task, availableAgents: Agent[]): string {
    const performance = this.agentPerformance.get(agent.id);
    const performanceScore = performance.successRate * 0.5 + performance.tasksCompleted * 0.01;
    const capabilityScore = this.calculateCapabilityScore(task.type, agent.specialization || []);
    
    let reason = `Selected ${agent.name} for ${task.type} task`;
    
    if (performanceScore > 0.8) {
      reason += ' (high performance score)';
    }
    
    if (capabilityScore > 0.6) {
      reason += ' (relevant capabilities)';
    }
    
    if (task.priority === TaskPriority.HIGH) {
      reason += ' (high priority task)';
    }
    
    return reason;
  }

  private async generateRecommendedActions(
    coordination: AgentCoordination,
    executions: AgentExecution[],
    tasks: Task[]
  ): Promise<RecommendedAction[]> {
    console.log('[Agent Coordination] Generating recommended actions...');
    
    const actions: RecommendedAction[] = [];
    
    // Analyze failed or stuck tasks
    const failedTasks = executions.filter(e => e.status === 'failed');
    const longRunningTasks = executions.filter(e => {
      const duration = e.endTime && e.startTime ? e.endTime.getTime() - e.startTime.getTime() : 0;
      return duration > 10000; // 10 seconds threshold
    });
    
    // Recommend actions for failed tasks
    for (const failedTask of failedTasks.slice(0, 3)) {
      actions.push({
        id: `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'escalation',
        description: `Escalate failed task: ${failedTask.taskId} to alternative agent`,
        agentId: 'orchestrator-main',
        priority: TaskPriority.HIGH,
        parameters: { taskId: failedTask.taskId, originalAgent: failedTask.agentId, reason: 'Task execution failed' },
        estimatedDuration: 5000,
        confidence: 0.8,
        reasoning: `Task ${failedTask.taskId} requires escalation due to persistent failure`
      });
    }
    
    // Recommend load rebalancing if workload imbalance detected
    const performanceImbalance = this.detectPerformanceImbalance(executions);
    if (performanceImbalance) {
      actions.push({
        id: `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'load_rebalancing',
        description: 'Redistribute workload to balance agent performance',
        agentId: 'orchestrator-main',
        priority: TaskPriority.NORMAL,
        parameters: { strategy: coordination.loadBalancing, threshold: 0.7 },
        estimatedDuration: 2000,
        confidence: 0.9,
        reasoning: 'Load imbalance detected - rebalancing recommended'
      });
    }
    
    // Recommend performance optimization
    const lowPerformers = executions.filter(e => {
      const performance = this.agentPerformance.get(e.agentId);
      return performance.successRate < 0.8;
    });
    
    if (lowPerformers.length > 0) {
      actions.push({
        id: `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'performance_optimization',
        description: 'Optimize agent configuration and settings',
        agentId: lowPerformers[0].id,
        priority: TaskPriority.NORMAL,
        parameters: { agentIds: lowPerformers.map(a => a.id) },
        estimatedDuration: 3000,
        confidence: 0.8,
        reasoning: 'Performance optimization for underperforming agents'
      });
    }
    
    console.log('[Agent Coordination] Generated', actions.length, 'recommended actions');
    return actions;
  }

  private detectPerformanceImbalance(executions: AgentExecution[]): boolean {
    const performanceScores = executions.map(e => {
      const perf = this.agentPerformance.get(e.agentId);
      return perf ? perf.successRate : 0.5;
    });
    
    if (performanceScores.length === 0) return false;
    
    const averagePerformance = performanceScores.reduce((sum, score) => sum + score, 0) / performanceScores.length;
    const maxPerformance = Math.max(...performanceScores);
    
    // Consider it imbalanced if variance is high
    const variance = performanceScores.reduce((sum, score) => sum + Math.pow(score - averagePerformance, 2), 0) / performanceScores.length;
    
    return variance > 0.25 || (maxPerformance - averagePerformance) > 0.3;
  }

  private async calculateCoordinationMetrics(
    coordination: AgentCoordination,
    executions: AgentExecution[],
    tasks: Task[]
  ): Promise<CoordinationMetrics> {
    const metrics: CoordinationMetrics = {
      totalAgents: coordination.supportingAgents.length + 1, // +1 for primary agent
      activeAgents: executions.map(e => e.agentId).filter((id, index, arr) => arr.indexOf(id) === index).length > 0),
      tasksQueued: tasks.length,
      tasksCompleted: executions.filter(e => e.status === 'completed').length,
      averageTaskDuration: 0,
      systemEfficiency: 0,
      conflictResolutionRate: 0.95,
      loadDistribution: {}
    };

    // Calculate task completion and efficiency
    const completedTasks = executions.filter(e => e.status === 'completed');
    if (completedTasks.length > 0) {
      metrics.tasksCompleted = completedTasks.length;
      
      const durations = completedTasks
        .filter(e => e.duration)
        .map(e => e.duration || 0);
      
      metrics.averageTaskDuration = durations.reduce((sum, duration) => sum + duration, 0) / durations.length;
      
      const successRates = executions.map(e => this.agentPerformance.get(e.agentId).successRate);
      metrics.systemEfficiency = successRates.reduce((sum, rate) => sum + rate, 0) / successRates.length;
    }
    
    // Calculate load distribution
    const agentLoadCounts = {};
    for (const execution of executions) {
      if (!agentLoadCounts[execution.agentId]) {
        agentLoadCounts[execution.agentId] = 0;
      }
      agentLoadCounts[execution.agentId]++;
    }
    
    for (const [agentId, count] of Object.entries(agentLoadCounts)) {
      metrics.loadDistribution[agentId] = count;
    }

    return metrics;
  }

  private async updateSystemLearning(
    executions: AgentExecution[],
    coordination: AgentCoordination,
    options: CoordinationOptions
  ): Promise<void> {
    console.log('[Agent Coordination] Updating system learning...');
    
    // Create learning events from executions
    const learningEvents: LearningEvent[] = [];
    
    for (const execution of executions) {
      const performance = this.agentPerformance.get(execution.agentId);
      
      if (execution.status === 'completed') {
        learningEvents.push({
          id: `learning_${Date.now()}_${execution.agentId}_${Math.random().toString(36).substr(2, 9)}`,
          agentId: execution.agentId,
          agentType: execution.agentType,
          type: 'success',
          description: `Successfully completed task: ${execution.taskType}`,
          data: {
            taskId: execution.taskId,
            duration: execution.duration,
            result: execution.result
          },
          confidence: execution.confidence,
          timestamp: new Date(),
          feedback: performance ? 'Excellent execution speed and accuracy' : 'Task completed'
        });
      } else if (execution.status === 'failed') {
        learningEvents.push({
          id: `learning_${Date.now()}_${execution.agentId}_${Math.random().toString(36).substr(2, 9)}`,
          agentId: execution.agentId,
          agentType: execution.agentType,
          type: 'failure',
          description: `Failed to complete task: ${execution.taskType}`,
          data: {
            taskId: execution.taskId,
            duration: execution.duration,
            error: execution.error
          },
          confidence: Math.max(0.1, execution.confidence - 0.2),
          timestamp: new Date(),
          feedback: 'Error analysis completed - improve error handling'
        });
      }
    }

    // Update system learning with new events
    this.systemLearning.patterns.push(...learningEvents);
    this.systemLearning.lastUpdated = new Date();
    
    console.log('[Agent Coordination] System learning updated with', learningEvents.length, 'new learning events');
  }

  // Public methods for external access
  async getCoordinationStatus(sessionId: string): Promise<AgentCoordination | undefined> {
    return this.activeCoordinations.get(sessionId);
  }

  async getAgentRegistry(): Promise<Agent[]> {
    return Array.from(this.agentRegistry.values());
  }

  async getAgentPerformance(agentId: string): Promise<any> {
    return this.agentPerformance.get(agentId);
  }

  async getSystemLearning(): Promise<SystemLearning> {
    return this.systemLearning;
  }

  async clearCoordination(sessionId: string): Promise<void> {
    this.activeCoordinations.delete(sessionId);
    console.log('[Agent Coordination] Cleared coordination for session:', sessionId);
  }

  async clearAllCoordinations(): Promise<void> {
    this.activeCoordinations.clear();
    this.taskQueue.clear();
    console.log('[Agent Coordination] Cleared all coordinations');
  }
}
}