import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '../../config/config.service';
import { EventEmitter } from 'events';
import {
  FlowState,
  FlowDefinition,
  FlowNode,
  FlowConnection,
  FlowExecution,
  FlowContext,
  FlowVariable,
  TaskStatus,
  EnhancedAgent
} from '../types/enhanced-orchestration.types';

/**
 * 🌊 Flow Execution Engine
 * Manages conversation flow execution and state transitions
 */
@Injectable()
export class FlowExecutionEngine extends EventEmitter {
  private readonly logger = new Logger(FlowExecutionEngine.name);
  private activeFlows = new Map<string, FlowState>();
  private flowDefinitions = new Map<string, FlowDefinition>();
  private executionQueue: FlowExecution[] = [];
  private isProcessing = false;

  constructor(private readonly configService: ConfigService) {
    super();
    this.initializeFlowEngine();
  }

  private initializeFlowEngine(): void {
    this.logger.log('[Flow Engine] Initializing flow execution engine...');
    
    // Load predefined flow definitions
    this.loadBuiltinFlows();
    
    // Start execution processor
    this.startExecutionProcessor();
    
    this.logger.log('[Flow Engine] Flow execution engine initialized');
  }

  /**
   * 🚀 Start executing a flow
   */
  async executeFlow(flowId: string, context: {
    sessionId: string;
    userId?: string;
    companyId?: string;
    initialVariables?: Record<string, any>;
    trigger?: string;
  }): Promise<FlowState> {
    try {
      this.logger.log(`[Flow Engine] Starting flow execution: ${flowId}`);
      
      const flowDefinition = this.flowDefinitions.get(flowId);
      if (!flowDefinition) {
        throw new Error(`Flow definition not found: ${flowId}`);
      }

      // Initialize flow state
      const flowState: FlowState = {
        flowId,
        currentNode: this.findStartNode(flowDefinition).id,
        previousNodes: [],
        variables: {
          ...context.initialVariables,
          sessionId: context.sessionId,
          userId: context.userId,
          companyId: context.companyId,
          startTime: new Date(),
          trigger: context.trigger || 'manual'
        },
        history: [],
        status: 'idle',
        flowDefinition,
        context: {
          variables: context.initialVariables || {},
          history: [],
          environment: {
            sessionId: context.sessionId,
            userId: context.userId,
            companyId: context.companyId,
            timestamp: new Date()
          }
        }
      };

      // Store active flow
      this.activeFlows.set(context.sessionId, flowState);
      
      // Start execution
      await this.executeNextNode(flowState);
      
      // Emit flow started event
      this.emit('flow:started', {
        flowId,
        sessionId: context.sessionId,
        state: flowState
      });

      this.logger.log(`[Flow Engine] Flow started successfully: ${flowId}`);
      return flowState;
    } catch (error) {
      this.logger.error(`[Flow Engine] Failed to start flow ${flowId}:`, error);
      throw error;
    }
  }

  /**
   * ⏸️ Pause flow execution
   */
  async pauseFlow(sessionId: string): Promise<boolean> {
    try {
      const flowState = this.activeFlows.get(sessionId);
      if (!flowState) {
        return false;
      }

      flowState.status = 'waiting';
      this.emit('flow:paused', { sessionId, flowId: flowState.flowId });
      
      this.logger.log(`[Flow Engine] Flow paused: ${flowState.flowId} for session ${sessionId}`);
      return true;
    } catch (error) {
      this.logger.error(`[Flow Engine] Failed to pause flow for session ${sessionId}:`, error);
      return false;
    }
  }

  /**
   * ▶️ Resume flow execution
   */
  async resumeFlow(sessionId: string): Promise<boolean> {
    try {
      const flowState = this.activeFlows.get(sessionId);
      if (!flowState) {
        return false;
      }

      flowState.status = 'executing';
      await this.executeNextNode(flowState);
      
      this.emit('flow:resumed', { sessionId, flowId: flowState.flowId });
      
      this.logger.log(`[Flow Engine] Flow resumed: ${flowState.flowId} for session ${sessionId}`);
      return true;
    } catch (error) {
      this.logger.error(`[Flow Engine] Failed to resume flow for session ${sessionId}:`, error);
      return false;
    }
  }

  /**
   * 🛑 Stop flow execution
   */
  async stopFlow(sessionId: string, reason?: string): Promise<boolean> {
    try {
      const flowState = this.activeFlows.get(sessionId);
      if (!flowState) {
        return false;
      }

      flowState.status = 'completed';
      
      // Create final execution record
      const finalExecution: FlowExecution = {
        id: `exec_${Date.now()}`,
        nodeId: flowState.currentNode,
        flowId: flowState.flowId,
        sessionId,
        startTime: new Date(),
        endTime: new Date(),
        status: TaskStatus.COMPLETED,
        metadata: {
          duration: 0,
          reason: reason || 'user_requested'
        }
      };

      flowState.history.push(finalExecution);
      
      // Clean up
      this.activeFlows.delete(sessionId);
      
      this.emit('flow:stopped', {
        sessionId,
        flowId: flowState.flowId,
        reason,
        finalExecution
      });

      this.logger.log(`[Flow Engine] Flow stopped: ${flowState.flowId} for session ${sessionId}`);
      return true;
    } catch (error) {
      this.logger.error(`[Flow Engine] Failed to stop flow for session ${sessionId}:`, error);
      return false;
    }
  }

  /**
   * 🔄 Update flow variable
   */
  async updateFlowVariable(sessionId: string, variableName: string, value: any): Promise<boolean> {
    try {
      const flowState = this.activeFlows.get(sessionId);
      if (!flowState) {
        return false;
      }

      flowState.variables[variableName] = value;
      flowState.context.variables[variableName] = value;
      
      this.emit('flow:variable:updated', {
        sessionId,
        flowId: flowState.flowId,
        variableName,
        value
      });

      return true;
    } catch (error) {
      this.logger.error(`[Flow Engine] Failed to update variable ${variableName}:`, error);
      return false;
    }
  }

  /**
   * 🔍 Get current flow state
   */
  getFlowState(sessionId: string): FlowState | undefined {
    return this.activeFlows.get(sessionId);
  }

  /**
   * 📊 Get all active flows
   */
  getActiveFlows(): Map<string, FlowState> {
    return new Map(this.activeFlows);
  }

  /**
   * 📋 Add or update flow definition
   */
  addFlowDefinition(flowDefinition: FlowDefinition): void {
    this.flowDefinitions.set(flowDefinition.id, flowDefinition);
    this.logger.log(`[Flow Engine] Flow definition added: ${flowDefinition.id}`);
  }

  /**
   * 🎯 Execute next node in flow
   */
  private async executeNextNode(flowState: FlowState): Promise<void> {
    try {
      flowState.status = 'executing';
      
      const currentNode = this.findNodeById(flowState.flowDefinition, flowState.currentNode);
      if (!currentNode) {
        throw new Error(`Node not found: ${flowState.currentNode}`);
      }

      this.logger.log(`[Flow Engine] Executing node: ${currentNode.id} (${currentNode.type})`);

      // Create execution record
      const execution: FlowExecution = {
        id: `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        nodeId: currentNode.id,
        flowId: flowState.flowId,
        sessionId: flowState.context.environment.sessionId,
        startTime: new Date(),
        status: TaskStatus.IN_PROGRESS,
        agentId: currentNode.configuration?.agent
      };

      flowState.history.push(execution);

      // Execute node based on type
      let result: any;
      switch (currentNode.type) {
        case 'start':
          result = await this.executeStartNode(currentNode, flowState);
          break;
        case 'process':
          result = await this.executeProcessNode(currentNode, flowState);
          break;
        case 'decision':
          result = await this.executeDecisionNode(currentNode, flowState);
          break;
        case 'action':
          result = await this.executeActionNode(currentNode, flowState);
          break;
        case 'subflow':
          result = await this.executeSubflowNode(currentNode, flowState);
          break;
        case 'end':
          result = await this.executeEndNode(currentNode, flowState);
          break;
        default:
          throw new Error(`Unknown node type: ${currentNode.type}`);
      }

      // Update execution with result
      execution.endTime = new Date();
      execution.status = result.success ? TaskStatus.COMPLETED : TaskStatus.FAILED;
      execution.result = result.data;
      execution.error = result.error;
      execution.metadata = {
        ...execution.metadata,
        duration: execution.endTime.getTime() - execution.startTime.getTime(),
        inputUsed: { ...flowState.variables },
        outputGenerated: result.data
      };

      // Determine next node
      if (result.success && currentNode.type !== 'end') {
        const nextNode = this.findNextNode(currentNode, result, flowState);
        if (nextNode) {
          flowState.previousNodes.push(currentNode.id);
          flowState.currentNode = nextNode.id;
          flowState.status = 'idle';
        } else {
          // No next node - end flow
          flowState.status = 'completed';
        }
      } else if (!result.success) {
        // Execution failed - check for error handling
        flowState.status = 'error';
      }

      // Emit node execution completed
      this.emit('flow:node:completed', {
        sessionId: flowState.context.environment.sessionId,
        flowId: flowState.flowId,
        nodeId: currentNode.id,
        execution,
        result
      });

    } catch (error) {
      this.logger.error(`[Flow Engine] Node execution failed: ${flowState.currentNode}`, error);
      flowState.status = 'error';
      throw error;
    }
  }

  /**
   * 🚀 Execute start node
   */
  private async executeStartNode(node: FlowNode, flowState: FlowState): Promise<any> {
    this.logger.log(`[Flow Engine] Executing start node: ${node.name}`);
    
    // Start nodes typically just initialize variables
    if (node.configuration.parameters) {
      Object.entries(node.configuration.parameters).forEach(([key, value]) => {
        flowState.variables[key] = value;
      });
    }

    return { success: true, data: { message: 'Flow started' } };
  }

  /**
   * ⚙️ Execute process node
   */
  private async executeProcessNode(node: FlowNode, flowState: FlowState): Promise<any> {
    this.logger.log(`[Flow Engine] Executing process node: ${node.name}`);
    
    // Process nodes would integrate with other agents
    const agentType = node.configuration?.agent;
    
    if (agentType) {
      // This would integrate with the orchestrator service
      const result = await this.executeAgentTask(agentType, node.configuration?.task, flowState);
      return result;
    }

    // Default processing
    return { 
      success: true, 
      data: { 
        message: `Process ${node.name} completed`,
        variables: flowState.variables
      } 
    };
  }

  /**
   * 🎯 Execute decision node
   */
  private async executeDecisionNode(node: FlowNode, flowState: FlowState): Promise<any> {
    this.logger.log(`[Flow Engine] Executing decision node: ${node.name}`);
    
    const condition = node.configuration?.condition;
    if (!condition) {
      throw new Error(`Decision node ${node.id} has no condition`);
    }

    // Evaluate condition
    const result = this.evaluateCondition(condition, flowState.variables);
    
    return {
      success: true,
      data: {
        condition,
        result,
        variables: flowState.variables
      }
    };
  }

  /**
   * 🎬 Execute action node
   */
  private async executeActionNode(node: FlowNode, flowState: FlowState): Promise<any> {
    this.logger.log(`[Flow Engine] Executing action node: ${node.name}`);
    
    // Action nodes perform specific actions
    const actionType = node.configuration?.action || node.parameters?.action;
    
    switch (actionType) {
      case 'send_message':
        return await this.executeSendMessageAction(node, flowState);
      case 'trigger_rpa':
        return await this.executeTriggerRPAAction(node, flowState);
      case 'update_knowledge':
        return await this.executeUpdateKnowledgeAction(node, flowState);
      case 'call_webhook':
        return await this.executeCallWebhookAction(node, flowState);
      default:
        return { success: true, data: { message: `Action ${actionType} executed` } };
    }
  }

  /**
   * 🌊 Execute subflow node
   */
  private async executeSubflowNode(node: FlowNode, flowState: FlowState): Promise<any> {
    this.logger.log(`[Flow Engine] Executing subflow node: ${node.name}`);
    
    const subflowId = node.configuration?.subflowId || node.parameters?.subflowId;
    if (!subflowId) {
      throw new Error(`Subflow node ${node.id} has no subflow ID`);
    }

    // Execute subflow
    const subflowResult = await this.executeFlow(subflowId, {
      sessionId: flowState.context.environment.sessionId,
      initialVariables: { ...flowState.variables }
    });

    return {
      success: true,
      data: { subflowResult, variables: subflowResult.variables }
    };
  }

  /**
   * 🏁 Execute end node
   */
  private async executeEndNode(node: FlowNode, flowState: FlowState): Promise<any> {
    this.logger.log(`[Flow Engine] Executing end node: ${node.name}`);
    
    flowState.status = 'completed';
    
    return {
      success: true,
      data: {
        message: 'Flow completed successfully',
        variables: flowState.variables,
        history: flowState.history
      }
    };
  }

  /**
   * 🔍 Find start node in flow definition
   */
  private findStartNode(flowDefinition: FlowDefinition): FlowNode {
    const startNode = flowDefinition.nodes.find(node => node.type === 'start');
    if (!startNode) {
      throw new Error(`No start node found in flow ${flowDefinition.id}`);
    }
    return startNode;
  }

  /**
   * 🔍 Find node by ID
   */
  private findNodeById(flowDefinition: FlowDefinition, nodeId: string): FlowNode | undefined {
    return flowDefinition.nodes.find(node => node.id === nodeId);
  }

  /**
   * ➡️ Find next node based on current node result
   */
  private findNextNode(currentNode: FlowNode, result: any, flowState: FlowState): FlowNode | undefined {
    const connections = flowDefinition.connections.filter(
      conn => conn.fromNode === currentNode.id
    );

    if (connections.length === 0) {
      return undefined;
    }

    // For decision nodes, evaluate conditions
    if (currentNode.type === 'decision') {
      const conditionResult = result.data?.result;
      const matchingConnection = connections.find(conn => 
        this.evaluateCondition(conn.condition || 'true', { ...flowState.variables, result: conditionResult })
      );
      
      return matchingConnection ? 
        this.findNodeById(flowState.flowDefinition, matchingConnection.toNode) : 
        undefined;
    }

    // For other nodes, return first connection
    const firstConnection = connections[0];
    return firstConnection ? 
      this.findNodeById(flowState.flowDefinition, firstConnection.toNode) : 
      undefined;
  }

  /**
   * 🔧 Evaluate condition expression
   */
  private evaluateCondition(condition: string, variables: Record<string, any>): boolean {
    try {
      // Simple condition evaluation - in production would use a proper expression parser
      const processedCondition = condition.replace(/\$(\w+)/g, (match, varName) => {
        return variables[varName] !== undefined ? JSON.stringify(variables[varName]) : 'undefined';
      });

      // Use Function constructor for safe evaluation
      const func = new Function('variables', `return ${processedCondition}`);
      return func(variables);
    } catch (error) {
      this.logger.error(`[Flow Engine] Condition evaluation failed: ${condition}`, error);
      return false;
    }
  }

  /**
   * 🤖 Execute agent task
   */
  private async executeAgentTask(agentType: string, task: string, flowState: FlowState): Promise<any> {
    try {
      // This would integrate with the agent orchestration service
      this.emit('flow:agent:task', {
        sessionId: flowState.context.environment.sessionId,
        flowId: flowState.flowId,
        agentType,
        task,
        variables: flowState.variables
      });

      // Mock agent execution
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      return {
        success: true,
        data: { message: `Agent task completed: ${task}` }
      };
    } catch (error) {
      this.logger.error(`[Flow Engine] Agent task execution failed:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 📤 Send message action
   */
  private async executeSendMessageAction(node: FlowNode, flowState: FlowState): Promise<any> {
    const message = node.parameters?.message || node.configuration?.message;
    const recipient = node.parameters?.recipient || node.configuration?.recipient;
    
    this.emit('flow:action:send_message', {
      sessionId: flowState.context.environment.sessionId,
      flowId: flowState.flowId,
      message,
      recipient
    });

    return {
      success: true,
      data: { message: `Message sent to ${recipient}: ${message}` }
    };
  }

  /**
   * 🤖 Trigger RPA action
   */
  private async executeTriggerRPAAction(node: FlowNode, flowState: FlowState): Promise<any> {
    const rpaWorkflowId = node.parameters?.workflowId || node.configuration?.workflowId;
    
    this.emit('flow:action:trigger_rpa', {
      sessionId: flowState.context.environment.sessionId,
      flowId: flowState.flowId,
      rpaWorkflowId,
      variables: flowState.variables
    });

    return {
      success: true,
      data: { rpaWorkflowId, message: 'RPA workflow triggered' }
    };
  }

  /**
   * 📚 Update knowledge action
   */
  private async executeUpdateKnowledgeAction(node: FlowNode, flowState: FlowState): Promise<any> {
    const content = node.parameters?.content || node.configuration?.content;
    const source = node.parameters?.source || node.configuration?.source || 'flow_execution';
    
    this.emit('flow:action:update_knowledge', {
      sessionId: flowState.context.environment.sessionId,
      flowId: flowState.flowId,
      content,
      source,
      metadata: { flowId: flowState.flowId, nodeId: node.id }
    });

    return {
      success: true,
      data: { message: 'Knowledge updated', content, source }
    };
  }

  /**
   * 🌐 Call webhook action
   */
  private async executeCallWebhookAction(node: FlowNode, flowState: FlowState): Promise<any> {
    const webhookUrl = node.parameters?.url || node.configuration?.url;
    const method = node.parameters?.method || node.configuration?.method || 'POST';
    const payload = {
      sessionId: flowState.context.environment.sessionId,
      flowId: flowState.flowId,
      variables: flowState.variables,
      timestamp: new Date()
    };

    try {
      // In production, would use axios or fetch
      this.emit('flow:action:call_webhook', {
        sessionId: flowState.context.environment.sessionId,
        flowId: flowState.flowId,
        webhookUrl,
        method,
        payload
      });

      return {
        success: true,
        data: { message: 'Webhook called', url: webhookUrl }
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * 📚 Load built-in flow definitions
   */
  private loadBuiltinFlows(): void {
    // Customer service flow
    const customerServiceFlow: FlowDefinition = {
      id: 'customer_service_main',
      name: 'Customer Service Main Flow',
      description: 'Main customer service conversation flow with RAG and RPA integration',
      nodes: [
        {
          id: 'start',
          type: 'start',
          name: 'Start',
          description: 'Flow entry point',
          position: { x: 100, y: 50 },
          configuration: {
            agent: 'orchestrator-main'
          },
          metadata: {
            category: 'control',
            estimatedDuration: 100,
            requirements: []
          }
        },
        {
          id: 'understand_intent',
          type: 'process',
          name: 'Understand Intent',
          description: 'Use AI to understand customer intent',
          position: { x: 100, y: 150 },
          configuration: {
            agent: 'orchestrator-main',
            task: 'recognize_intent'
          },
          metadata: {
            category: 'ai_processing',
            estimatedDuration: 500,
            requirements: ['conversation_orchestrator']
          }
        },
        {
          id: 'retrieve_knowledge',
          type: 'process',
          name: 'Retrieve Knowledge',
          description: 'Search knowledge base for relevant information',
          position: { x: 100, y: 250 },
          configuration: {
            agent: 'rag-agent',
            task: 'search_knowledge'
          },
          metadata: {
            category: 'knowledge_retrieval',
            estimatedDuration: 800,
            requirements: ['rag_service']
          }
        },
        {
          id: 'check_automation_needed',
          type: 'decision',
          name: 'Check if Automation Needed',
          description: 'Determine if RPA automation should be triggered',
          position: { x: 100, y: 350 },
          configuration: {
            condition: '$intent === "account_update" || $intent === "payment_issue"'
          },
          metadata: {
            category: 'decision',
            estimatedDuration: 200,
            requirements: []
          }
        },
        {
          id: 'execute_automation',
          type: 'action',
          name: 'Execute Automation',
          description: 'Trigger RPA workflow if needed',
          position: { x: 250, y: 350 },
          configuration: {
            action: 'trigger_rpa',
            workflowId: 'customer_account_update'
          },
          metadata: {
            category: 'action',
            estimatedDuration: 2000,
            requirements: ['rpa_service']
          }
        },
        {
          id: 'provide_response',
          type: 'process',
          name: 'Provide Response',
          description: 'Generate and provide response to customer',
          position: { x: 100, y: 450 },
          configuration: {
            agent: 'tts-specialist',
            task: 'generate_response'
          },
          metadata: {
            category: 'response_generation',
            estimatedDuration: 1000,
            requirements: ['tts_service']
          }
        },
        {
          id: 'end',
          type: 'end',
          name: 'End',
          description: 'Flow completion',
          position: { x: 100, y: 550 },
          metadata: {
            category: 'control',
            estimatedDuration: 100,
            requirements: []
          }
        }
      ],
      connections: [
        { id: 'conn_1', fromNode: 'start', toNode: 'understand_intent' },
        { id: 'conn_2', fromNode: 'understand_intent', toNode: 'retrieve_knowledge' },
        { id: 'conn_3', fromNode: 'retrieve_knowledge', toNode: 'check_automation_needed' },
        { id: 'conn_4', fromNode: 'check_automation_needed', toNode: 'execute_automation', condition: '$result === true' },
        { id: 'conn_5', fromNode: 'check_automation_needed', toNode: 'provide_response', condition: '$result === false' },
        { id: 'conn_6', fromNode: 'execute_automation', toNode: 'provide_response' },
        { id: 'conn_7', fromNode: 'provide_response', toNode: 'end' }
      ],
      variables: [
        { name: 'intent', type: 'string', description: 'Customer intent', required: true },
        { name: 'customer_info', type: 'object', description: 'Customer information', required: false },
        { name: 'automation_result', type: 'object', description: 'RPA automation result', required: false }
      ],
      triggers: [
        { type: 'intent', condition: 'customer_service', parameters: {} }
      ],
      metadata: {
        version: '1.0.0',
        author: 'KELEDON Team',
        created: new Date(),
        updated: new Date(),
        category: 'customer_service',
        complexity: 'medium'
      }
    };

    this.addFlowDefinition(customerServiceFlow);
  }

  /**
   * ⚙️ Start execution processor
   */
  private startExecutionProcessor(): void {
    setInterval(async () => {
      if (this.isProcessing || this.executionQueue.length === 0) {
        return;
      }

      this.isProcessing = true;
      
      while (this.executionQueue.length > 0) {
        const execution = this.executionQueue.shift();
        try {
          const flowState = this.activeFlows.get(execution.sessionId);
          if (flowState && flowState.status === 'idle') {
            await this.executeNextNode(flowState);
          }
        } catch (error) {
          this.logger.error('[Flow Engine] Execution queue processing failed:', error);
        }
      }
      
      this.isProcessing = false;
    }, 100);
  }

  /**
   * 📊 Get flow engine statistics
   */
  getStatistics(): {
    activeFlows: number;
    totalExecutions: number;
    averageExecutionTime: number;
    successRate: number;
  } {
    const activeFlows = this.activeFlows.size;
    const totalExecutions = Array.from(this.activeFlows.values())
      .reduce((sum, flow) => sum + flow.history.length, 0);
    
    const completedExecutions = Array.from(this.activeFlows.values())
      .reduce((sum, flow) => 
        sum + flow.history.filter(exec => exec.status === TaskStatus.COMPLETED).length, 0
      );
    
    const successRate = totalExecutions > 0 ? completedExecutions / totalExecutions : 0;
    
    return {
      activeFlows,
      totalExecutions,
      averageExecutionTime: 0, // Would be calculated from execution durations
      successRate
    };
  }
}