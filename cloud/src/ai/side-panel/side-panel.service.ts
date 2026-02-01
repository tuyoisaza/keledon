import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '../../config/config.service';
import { WebSocketGateway, WebSocketServer, SubscribeMessage, WebSocketGateway as WSGateway, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import {
  SidePanelConnection,
  SidePanelPermissions,
  SidePanelEvent,
  EnhancedConversationContext,
  RPAExecution,
  FlowExecution,
  TaskPriority
} from '../types/enhanced-orchestration.types';

/**
 * 📱 Side Panel WebSocket Service
 * Manages real-time communication with frontend side panel
 */
@Injectable()
@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true
  },
  namespace: 'side-panel'
})
export class SidePanelService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SidePanelService.name);
  private connections = new Map<string, SidePanelConnection>();
  private eventQueue: SidePanelEvent[] = [];
  private isProcessing = false;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit(): void {
    this.logger.log('[Side Panel Service] Initializing WebSocket gateway...');
    
    // Start event processor
    this.startEventProcessor();
    
    this.logger.log('[Side Panel Service] WebSocket gateway initialized');
  }

  onModuleDestroy(): void {
    this.logger.log('[Side Panel Service] Shutting down WebSocket gateway...');
  }

  /**
   * 🔗 Handle new connection
   */
  async handleConnection(client: Socket, ...args: any[]): Promise<void> {
    try {
      this.logger.log(`[Side Panel Service] Client connected: ${client.id}`);
      
      // Get session info from auth token or query params
      const sessionId = this.extractSessionId(client);
      const userId = this.extractUserId(client);
      
      if (!sessionId) {
        this.logger.warn(`[Side Panel Service] Client connection rejected - no session ID: ${client.id}`);
        client.disconnect();
        return;
      }

      // Create side panel connection
      const connection: SidePanelConnection = {
        id: client.id,
        sessionId,
        socketId: client.id,
        status: 'connected',
        lastActivity: new Date(),
        capabilities: this.determineClientCapabilities(client),
        permissions: await this.getUserPermissions(userId, sessionId),
        events: []
      };

      // Store connection
      this.connections.set(client.id, connection);

      // Join session room
      await client.join(`session:${sessionId}`);

      // Send initial state
      client.emit('connected', {
        connectionId: connection.id,
        sessionId,
        permissions: connection.permissions,
        capabilities: connection.capabilities,
        timestamp: new Date()
      });

      // Request initial data
      this.requestInitialData(client, sessionId);

      this.emit('client:connected', { client, connection });
      
      this.logger.log(`[Side Panel Service] Client connection established: ${client.id} for session ${sessionId}`);
    } catch (error) {
      this.logger.error(`[Side Panel Service] Connection handling failed for ${client.id}:`, error);
      client.disconnect();
    }
  }

  /**
   * 🔌 Handle client disconnection
   */
  async handleDisconnect(client: Socket): Promise<void> {
    try {
      const connection = this.connections.get(client.id);
      const sessionId = connection?.sessionId;
      
      if (connection) {
        connection.status = 'disconnected';
        connection.lastActivity = new Date();
        
        // Leave session room
        await client.leave(`session:${sessionId}`);
        
        // Notify other systems
        this.emit('client:disconnected', { client, connection, sessionId });
      }

      this.connections.delete(client.id);
      
      this.logger.log(`[Side Panel Service] Client disconnected: ${client.id}${sessionId ? ` (session: ${sessionId})` : ''}`);
    } catch (error) {
      this.logger.error(`[Side Panel Service] Disconnect handling failed for ${client.id}:`, error);
    }
  }

  /**
   * 📨 Handle messages from side panel
   */
  @SubscribeMessage('rpa_control')
  async handleRPAControl(client: Socket, payload: {
    action: 'start' | 'pause' | 'stop' | 'resume' | 'screenshot';
    workflowId?: string;
    stepId?: string;
    parameters?: Record<string, any>;
  }): Promise<void> {
    try {
      const connection = this.connections.get(client.id);
      if (!connection || !connection.permissions.canExecuteRPA) {
        client.emit('error', { message: 'RPA execution not permitted' });
        return;
      }

      this.logger.log(`[Side Panel Service] RPA control action: ${payload.action} from client ${client.id}`);

      // Create side panel event
      const event: SidePanelEvent = {
        id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: `rpa_${payload.action}`,
        timestamp: new Date(),
        data: payload,
        source: 'user',
        priority: this.getEventPriority(payload.action)
      };

      // Add to queue
      this.eventQueue.push(event);
      connection.lastActivity = new Date();
      connection.events.push(event);

      // Acknowledge receipt
      client.emit('rpa_control_ack', {
        eventId: event.id,
        action: payload.action,
        status: 'queued',
        timestamp: new Date()
      });

      this.emit('rpa:control', { client, payload, event });
      
    } catch (error) {
      this.logger.error(`[Side Panel Service] RPA control handling failed:`, error);
      client.emit('error', { message: 'Failed to process RPA control action' });
    }
  }

  /**
   * 🌊 Handle flow control messages
   */
  @SubscribeMessage('flow_control')
  async handleFlowControl(client: Socket, payload: {
    action: 'start' | 'pause' | 'stop' | 'resume' | 'update';
    flowId?: string;
    nodeId?: string;
    variables?: Record<string, any>;
  }): Promise<void> {
    try {
      const connection = this.connections.get(client.id);
      if (!connection || !connection.permissions.canControlFlow) {
        client.emit('error', { message: 'Flow control not permitted' });
        return;
      }

      this.logger.log(`[Side Panel Service] Flow control action: ${payload.action} from client ${client.id}`);

      const event: SidePanelEvent = {
        id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: `flow_${payload.action}`,
        timestamp: new Date(),
        data: payload,
        source: 'user',
        priority: this.getEventPriority(payload.action)
      };

      this.eventQueue.push(event);
      connection.lastActivity = new Date();
      connection.events.push(event);

      client.emit('flow_control_ack', {
        eventId: event.id,
        action: payload.action,
        status: 'queued',
        timestamp: new Date()
      });

      this.emit('flow:control', { client, payload, event });
      
    } catch (error) {
      this.logger.error(`[Side Panel Service] Flow control handling failed:`, error);
      client.emit('error', { message: 'Failed to process flow control action' });
    }
  }

  /**
   * 📊 Handle analytics request
   */
  @SubscribeMessage('get_analytics')
  async handleAnalyticsRequest(client: Socket, payload: {
    type: 'session' | 'rpa' | 'flow' | 'system';
    timeframe?: string;
    filters?: Record<string, any>;
  }): Promise<void> {
    try {
      const connection = this.connections.get(client.id);
      if (!connection || !connection.permissions.canAccessAnalytics) {
        client.emit('error', { message: 'Analytics access not permitted' });
        return;
      }

      this.logger.log(`[Side Panel Service] Analytics request: ${payload.type} from client ${client.id}`);

      // Request analytics data
      this.emit('analytics:request', { client, payload });
      
    } catch (error) {
      this.logger.error(`[Side Panel Service] Analytics request handling failed:`, error);
      client.emit('error', { message: 'Failed to process analytics request' });
    }
  }

  /**
   * 🗑️ Handle conversation updates
   */
  @SubscribeMessage('conversation_update')
  async handleConversationUpdate(client: Socket, payload: {
    type: 'context' | 'intent' | 'response' | 'knowledge';
    data: any;
  }): Promise<void> {
    try {
      const connection = this.connections.get(client.id);
      if (!connection || !connection.permissions.canViewConversation) {
        client.emit('error', { message: 'Conversation view not permitted' });
        return;
      }

      this.logger.log(`[Side Panel Service] Conversation update: ${payload.type} from client ${client.id}`);

      this.emit('conversation:update', { client, payload });
      
    } catch (error) {
      this.logger.error(`[Side Panel Service] Conversation update handling failed:`, error);
      client.emit('error', { message: 'Failed to process conversation update' });
    }
  }

  /**
   * 🔄 Broadcast event to specific session
   */
  async broadcastToSession(sessionId: string, event: string, data: any): Promise<void> {
    try {
      const sessionRoom = `session:${sessionId}`;
      
      this.logger.log(`[Side Panel Service] Broadcasting to session ${sessionId}: ${event}`);
      
      // Use WebSocket Server or direct emit
      this.broadcastToRoom(sessionRoom, event, {
        data,
        timestamp: new Date(),
        source: 'system'
      });
    } catch (error) {
      this.logger.error(`[Side Panel Service] Failed to broadcast to session ${sessionId}:`, error);
    }
  }

  /**
   * 🔄 Broadcast RPA execution updates
   */
  async broadcastRPAUpdate(sessionId: string, execution: RPAExecution): Promise<void> {
    await this.broadcastToSession(sessionId, 'rpa_execution_update', {
      executionId: execution.id,
      workflowId: execution.workflowId,
      stepId: execution.stepId,
      status: execution.status,
      result: execution.result,
      error: execution.error,
      screenshot: execution.screenshot,
      duration: execution.metadata?.duration,
      timestamp: execution.endTime || new Date()
    });
  }

  /**
   * 🌊 Broadcast flow execution updates
   */
  async broadcastFlowUpdate(sessionId: string, execution: FlowExecution): Promise<void> {
    await this.broadcastToSession(sessionId, 'flow_execution_update', {
      executionId: execution.id,
      flowId: execution.flowId,
      nodeId: execution.nodeId,
      status: execution.status,
      result: execution.result,
      error: execution.error,
      duration: execution.metadata?.duration,
      timestamp: execution.endTime || new Date()
    });
  }

  /**
   * 📊 Broadcast conversation context updates
   */
  async broadcastConversationUpdate(sessionId: string, context: EnhancedConversationContext): Promise<void> {
    await this.broadcastToSession(sessionId, 'conversation_context_update', {
      sessionId: context.sessionId,
      state: context.conversationState,
      currentIntent: context.intents[context.intents.length - 1],
      entities: context.entities,
      contextScore: context.contextScore,
      lastUpdated: context.lastUpdated,
      agentPerformance: context.performance
    });
  }

  /**
   * 📡 Broadcast system alerts
   */
  async broadcastSystemAlert(sessionId: string, alert: {
    type: 'error' | 'warning' | 'info' | 'success';
    title: string;
    message: string;
    details?: Record<string, any>;
    priority?: TaskPriority;
  }): Promise<void> {
    await this.broadcastToSession(sessionId, 'system_alert', {
      alertId: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: alert.type,
      title,
      message,
      details: alert.details || {},
      priority: alert.priority || TaskPriority.NORMAL,
      timestamp: new Date()
    });
  }

  /**
   * 🔍 Extract session ID from client
   */
  private extractSessionId(client: Socket): string | undefined {
    // Try to get from auth token
    const token = client.handshake.auth.token;
    if (token) {
      try {
        // In production, decode JWT token to get session ID
        const decoded = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
        return decoded.sessionId;
      } catch (error) {
        this.logger.warn(`[Side Panel Service] Failed to decode auth token: ${error.message}`);
      }
    }

    // Fallback to query params
    const query = client.handshake.query;
    return query?.sessionId;
  }

  /**
   * 👤 Extract user ID from client
   */
  private extractUserId(client: Socket): string | undefined {
    const token = client.handshake.auth.token;
    if (token) {
      try {
        const decoded = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
        return decoded.userId;
      } catch (error) {
        this.logger.warn(`[Side Panel Service] Failed to decode user ID from token: ${error.message}`);
      }
    }

    const query = client.handshake.query;
    return query?.userId;
  }

  /**
   * 🔧 Determine client capabilities
   */
  private determineClientCapabilities(client: Socket): string[] {
    const capabilities: string[] = [
      'websocket_connection',
      'real_time_updates',
      'event_listening'
    ];

    const userAgent = client.handshake.headers['user-agent'] || '';
    
    // Add capabilities based on user agent
    if (userAgent.includes('Chrome') || userAgent.includes('Firefox')) {
      capabilities.push('browser_automation');
    }
    
    if (userAgent.includes('Mobile') || userAgent.includes('Android') || userAgent.includes('iOS')) {
      capabilities.push('mobile_optimized');
    }

    return capabilities;
  }

  /**
   * 🔐 Get user permissions
   */
  private async getUserPermissions(userId?: string, sessionId?: string): Promise<SidePanelPermissions> {
    // In production, this would query database or auth service
    const defaultPermissions: SidePanelPermissions = {
      canViewWorkflows: true,
      canExecuteRPA: true,
      canViewConversation: true,
      canControlFlow: true,
      canAccessAnalytics: true,
      canModifySettings: false // By default
    };

    // Customize based on user role (mock implementation)
    if (userId?.includes('admin')) {
      defaultPermissions.canModifySettings = true;
    }

    return defaultPermissions;
  }

  /**
   * 🎯 Get event priority
   */
  private getEventPriority(action: string): TaskPriority {
    const priorityMap: Record<string, TaskPriority> = {
      start: TaskPriority.HIGH,
      stop: TaskPriority.HIGH,
      pause: TaskPriority.NORMAL,
      resume: TaskPriority.NORMAL,
      screenshot: TaskPriority.LOW,
      update: TaskPriority.NORMAL,
      control: TaskPriority.NORMAL
    };

    return priorityMap[action] || TaskPriority.NORMAL;
  }

  /**
   * 📋 Request initial data for new connection
   */
  private async requestInitialData(client: Socket, sessionId: string): Promise<void> {
    try {
      // Request conversation context
      this.emit('request:conversation_context', { sessionId, client });
      
      // Request RPA status
      this.emit('request:rpa_status', { sessionId, client });
      
      // Request flow status
      this.emit('request:flow_status', { sessionId, client });
      
      // Request system status
      this.emit('request:system_status', { sessionId, client });
      
    } catch (error) {
      this.logger.error(`[Side Panel Service] Failed to request initial data:`, error);
    }
  }

  /**
   * 📡 Broadcast to room helper
   */
  private broadcastToRoom(room: string, event: string, data: any): void {
    // This would use WebSocket server instance
    this.logger.log(`[Side Panel Service] Broadcasting to room ${room}: ${event}`);
    
    // In actual implementation, this would emit to specific room
    this.connections.forEach((connection, clientId) => {
      // This is a simplified broadcast - in production would target specific clients in room
      // For now, we'll emit through the event system
      this.emit('room:broadcast', { room, event, data });
    });
  }

  /**
   * 📊 Get connection statistics
   */
  getStatistics(): {
    activeConnections: number;
    totalEvents: number;
    averageLatency: number;
  } {
    const activeConnections = this.connections.size;
    const connections = Array.from(this.connections.values());
    const totalEvents = connections.reduce((sum, conn) => sum + conn.events.length, 0);
    
    return {
      activeConnections,
      totalEvents,
      averageLatency: 0 // Would be calculated from ping measurements
    };
  }

  /**
   * 🔄 Get all active connections
   */
  getActiveConnections(): Map<string, SidePanelConnection> {
    return new Map(this.connections);
  }

  /**
   * 🔄 Disconnect client by session
   */
  async disconnectSession(sessionId: string, reason?: string): Promise<void> {
    const connectionsToDisconnect = Array.from(this.connections.entries())
      .filter(([_, conn]) => conn.sessionId === sessionId);
    
    for (const [clientId, connection] of connectionsToDisconnect) {
      const client = this.getClientById(clientId);
      if (client) {
        client.emit('session_ended', {
          reason: reason || 'Session terminated',
          timestamp: new Date()
        });
        client.disconnect();
      }
    }
  }

  private getClientById(clientId: string): Socket | undefined {
    // This would maintain a map of client sockets
    // For now, return undefined as placeholder
    return undefined;
  }

  /**
   * ⚙️ Start event processor
   */
  private startEventProcessor(): void {
    setInterval(async () => {
      if (this.isProcessing || this.eventQueue.length === 0) {
        return;
      }

      this.isProcessing = true;
      
      while (this.eventQueue.length > 0) {
        const event = this.eventQueue.shift();
        // Process event through the system
        this.emit('event:process', event);
      }
      
      this.isProcessing = false;
    }, 50);
  }
}