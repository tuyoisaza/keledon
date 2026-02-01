import { WebSocketGateway, SubscribeMessage, OnGatewayConnection, WebSocketServer } from '@nestjs/websockets';
import { AgentMonitoringService, SystemHealth } from '../services/agent-monitoring.service';
import { AILoopService } from '../services/ai-loop.service';

export interface DashboardSocketData {
  type: 'agent-status-update' | 'system-health-update';
  agentId?: string;
  status?: string;
  audioLevel?: number;
  performance?: any;
  health?: SystemHealth;
}

@WebSocketGateway()
export class DashboardGateway {
  constructor(
    private readonly agentMonitoringService: AgentMonitoringService,
    private readonly aiLoopService: AILoopService
  ) {
    console.log('DashboardGateway: Initialized');
  }

  @OnGatewayConnection()
  handleConnection(client: any): void {
    console.log(`Dashboard client connected: ${client.id}`);
    
    // Send initial data
    this.broadcastAgentStatus();
    this.broadcastSystemHealth();
  }

  @OnGatewayDisconnect()
  handleDisconnect(client: any): void {
    console.log(`Dashboard client disconnected: ${client.id}`);
  }

  @SubscribeMessage('dashboard:get-agent-status')
  handleGetAgentStatus(client: any): void {
    try {
      const agentStatus = this.agentMonitoringService.getAllAgentStatuses();
      client.emit('dashboard:agent-status-update', agentStatus);
      console.log(`DashboardGateway: Sent agent status to ${client.id}`);
    } catch (error) {
      console.error('DashboardGateway: Error getting agent status', error);
      client.emit('error', { message: 'Failed to get agent status' });
    }
  }

  @SubscribeMessage('dashboard:get-system-health')
  handleGetSystemHealth(client: any): void {
    try {
      const health = this.agentMonitoringService.getCurrentHealth();
      client.emit('dashboard:system-health-update', health);
      console.log(`DashboardGateway: Sent system health to ${client.id}`);
    } catch (error) {
      console.error('DashboardGateway: Error getting system health', error);
      client.emit('error', { message: 'Failed to get system health' });
    }
  }

  @SubscribeMessage('dashboard:agent-audio-level')
  handleAgentAudioLevel(client: any, data: DashboardSocketData): void {
    try {
      if (data.agentId && data.audioLevel !== undefined) {
        this.agentMonitoringService.setAudioLevel(data.agentId, data.audioLevel);
        console.log(`DashboardGateway: Updated audio level for agent ${data.agentId}: ${data.audioLevel}`);
        
        // Broadcast the update
        const updatedAgents = this.agentMonitoringService.getAllAgentStatuses();
        this.broadcastAgentStatus();
      }
    } catch (error) {
      console.error('DashboardGateway: Error updating agent audio level', error);
      client.emit('error', { message: 'Failed to update agent audio level' });
    }
  }

  @SubscribeMessage('dashboard:agent-performance-metrics')
  handleAgentPerformanceMetrics(client: any, data: DashboardSocketData): void {
    try {
      if (data.agentId && data.performance) {
        this.agentMonitoringService.recordPerformanceMetrics(data.agentId, data.performance);
        console.log(`DashboardGateway: Updated performance metrics for agent ${data.agentId}`);
        
        // Broadcast the update
        const updatedAgents = this.agentMonitoringService.getAllAgentStatuses();
        this.broadcastAgentStatus();
      }
    } catch (error) {
      console.error('DashboardGateway: Error updating agent performance metrics', error);
      client.emit('error', { message: 'Failed to update agent performance metrics' });
    }
  }

  @SubscribeMessage('dashboard:get-ai-loops')
  handleGetAILoops(client: any): void {
    try {
      const loops = this.aiLoopService.getAllLoops();
      client.emit('dashboard:ai-loop-update', loops);
      console.log(`DashboardGateway: Sent AI loops to ${client.id}`);
    } catch (error) {
      console.error('DashboardGateway: Error getting AI loops', error);
      client.emit('error', { message: 'Failed to get AI loops' });
    }
  }

  @SubscribeMessage('dashboard:ai-loop-step')
  handleAILoopStep(client: any, data: DashboardSocketData): void {
    try {
      // This would be handled by the AILoopService
      // The step update logic is already implemented in the service
      console.log(`DashboardGateway: AI loop step update for loop ${data.loopId}, step ${data.stepId}`);
    } catch (error) {
      console.error('DashboardGateway: Error handling AI loop step', error);
      client.emit('error', { message: 'Failed to handle AI loop step' });
    }
  }

  @SubscribeMessage('dashboard:ai-loop-start')
  handleStartAILoop(client: any, data: DashboardSocketData): void {
    try {
      if (data.loopId) {
        this.aiLoopService.startLoop(data.loopId);
        console.log(`DashboardGateway: Started AI loop ${data.loopId}`);
        
        // Broadcast updated loop status
        const loops = this.aiLoopService.getAllLoops();
        this.broadcastAILoops();
      }
    } catch (error) {
      console.error('DashboardGateway: Error starting AI loop', error);
      client.emit('error', { message: 'Failed to start AI loop' });
    }
  }

  @SubscribeMessage('dashboard:ai-loop-reset')
  handleResetAILoop(client: any, data: DashboardSocketData): void {
    try {
      if (data.loopId) {
        this.aiLoopService.resetLoop(data.loopId);
        console.log(`DashboardGateway: Reset AI loop ${data.loopId}`);
        
        // Broadcast updated loop status
        const loops = this.aiLoopService.getAllLoops();
        this.broadcastAILoops();
      }
    } catch (error) {
      console.error('DashboardGateway: Error resetting AI loop', error);
      client.emit('error', { message: 'Failed to reset AI loop' });
    }
  }

  // Broadcast methods
  private broadcastAgentStatus(): void {
    try {
      const agents = this.agentMonitoringService.getAllAgentStatuses();
      this.server.emit('dashboard:agent-status-update', agents);
      console.log('DashboardGateway: Broadcasted agent status to all dashboard clients');
    } catch (error) {
      console.error('DashboardGateway: Error broadcasting agent status', error);
    }
  }

  private broadcastSystemHealth(): void {
    try {
      const health = this.agentMonitoringService.getCurrentHealth();
      this.server.emit('dashboard:system-health-update', health);
      console.log('DashboardGateway: Broadcasted system health to all dashboard clients');
    } catch (error) {
      console.error('DashboardGateway: Error broadcasting system health', error);
    }
  }

  private broadcastAILoops(): void {
    try {
      const loops = this.aiLoopService.getAllLoops();
      this.server.emit('dashboard:ai-loop-update', loops);
      console.log('DashboardGateway: Broadcasted AI loops to all dashboard clients');
    } catch (error) {
      console.error('DashboardGateway: Error broadcasting AI loops', error);
    }
  }
}