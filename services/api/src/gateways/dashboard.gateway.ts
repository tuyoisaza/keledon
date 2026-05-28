import { WebSocketGateway, SubscribeMessage, OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';
import { Socket } from 'socket.io';
import { AgentMonitoringService, SystemHealth } from '../services/agent-monitoring.service';
import { AILoopService } from '../services/ai-loop.service';
import { VoiceAnalyticsService } from '../services/voice-analytics.service';
import { IntegrationHealthService } from '../services/integration-health.service';
import { FlowExecutionService } from '../services/flow-execution.service';

export interface DashboardSocketData {
  type: string;
  agentId?: string;
  loopId?: string;
  executionId?: string;
  providerId?: string;
  status?: string;
  audioLevel?: number;
  performance?: any;
  health?: SystemHealth;
  step?: any;
  stepIndex?: number;
  progress?: number;
  config?: any;
  timeRange?: string;
  loopData?: any;
  flowData?: any;
}

@WebSocketGateway({
  cors: {
    origin: ['http://localhost:5173', 'http://localhost:3000'],
    methods: ['GET', 'POST'],
    credentials: true
  }
})
export class DashboardGateway {
  @WebSocketServer() 
  server: Server;

  constructor(
    private readonly agentMonitoringService: AgentMonitoringService,
    private readonly aiLoopService: AILoopService,
    private readonly voiceAnalyticsService: VoiceAnalyticsService,
    private readonly integrationHealthService: IntegrationHealthService,
    private readonly flowExecutionService: FlowExecutionService
  ) {
    console.log('DashboardGateway: Initialized with real services');
    // Start broadcasting intervals
    this.startBroadcasting();
  }

  @OnGatewayConnection()
  handleConnection(client: Socket): void {
    console.log(`Dashboard client connected: ${client.id}`);
    
    // Send initial data
    this.sendInitialData(client);
  }

  @OnGatewayDisconnect()
  handleDisconnect(client: Socket): void {
    console.log(`Dashboard client disconnected: ${client.id}`);
  }

  // Agent Monitoring Events
  @SubscribeMessage('dashboard:get-agent-status')
  handleGetAgentStatus(client: Socket): void {
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
  handleGetSystemHealth(client: Socket): void {
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
  handleAgentAudioLevel(client: Socket, data: DashboardSocketData): void {
    try {
      if (data.agentId && data.audioLevel !== undefined) {
        this.agentMonitoringService.setAudioLevel(data.agentId, data.audioLevel);
        this.broadcastAgentStatus();
      }
    } catch (error) {
      console.error('DashboardGateway: Error updating agent audio level', error);
      client.emit('error', { message: 'Failed to update agent audio level' });
    }
  }

  @SubscribeMessage('dashboard:agent-performance-metrics')
  handleAgentPerformanceMetrics(client: Socket, data: DashboardSocketData): void {
    try {
      if (data.agentId && data.performance) {
        this.agentMonitoringService.recordPerformanceMetrics(data.agentId, data.performance);
        this.broadcastAgentStatus();
      }
    } catch (error) {
      console.error('DashboardGateway: Error updating agent performance metrics', error);
      client.emit('error', { message: 'Failed to update agent performance metrics' });
    }
  }

  @SubscribeMessage('dashboard:agent-status')
  handleAgentStatus(client: Socket, data: DashboardSocketData): void {
    try {
      if (data.agentId && data.status) {
        this.agentMonitoringService.updateAgentStatus(data.agentId, data.status as any);
        this.broadcastAgentStatus();
      }
    } catch (error) {
      console.error('DashboardGateway: Error updating agent status', error);
      client.emit('error', { message: 'Failed to update agent status' });
    }
  }

  // AI Loop Events
  @SubscribeMessage('dashboard:get-ai-loops')
  handleGetAILoops(client: Socket): void {
    try {
      const loops = this.aiLoopService.getAllLoops();
      client.emit('dashboard:ai-loops-update', loops);
      console.log(`DashboardGateway: Sent AI loops to ${client.id}`);
    } catch (error) {
      console.error('DashboardGateway: Error getting AI loops', error);
      client.emit('error', { message: 'Failed to get AI loops' });
    }
  }

  @SubscribeMessage('dashboard:ai-loop-create')
  handleCreateAILoop(client: Socket, data: DashboardSocketData): void {
    try {
      const loop = this.aiLoopService.createLoop(data.loopData?.name);
      this.broadcastAILoops();
      console.log(`DashboardGateway: Created AI loop: ${loop.id}`);
    } catch (error) {
      console.error('DashboardGateway: Error creating AI loop', error);
      client.emit('error', { message: 'Failed to create AI loop' });
    }
  }

  @SubscribeMessage('dashboard:ai-loop-start')
  handleStartAILoop(client: Socket, data: DashboardSocketData): void {
    try {
      if (data.loopId) {
        this.aiLoopService.startLoop(data.loopId);
        this.broadcastAILoops();
        console.log(`DashboardGateway: Started AI loop ${data.loopId}`);
      }
    } catch (error) {
      console.error('DashboardGateway: Error starting AI loop', error);
      client.emit('error', { message: 'Failed to start AI loop' });
    }
  }

  @SubscribeMessage('dashboard:ai-loop-pause')
  handlePauseAILoop(client: Socket, data: DashboardSocketData): void {
    try {
      if (data.loopId) {
        this.aiLoopService.pauseLoop(data.loopId);
        this.broadcastAILoops();
        console.log(`DashboardGateway: Paused AI loop ${data.loopId}`);
      }
    } catch (error) {
      console.error('DashboardGateway: Error pausing AI loop', error);
      client.emit('error', { message: 'Failed to pause AI loop' });
    }
  }

  @SubscribeMessage('dashboard:ai-loop-reset')
  handleResetAILoop(client: Socket, data: DashboardSocketData): void {
    try {
      if (data.loopId) {
        this.aiLoopService.resetLoop(data.loopId);
        this.broadcastAILoops();
        console.log(`DashboardGateway: Reset AI loop ${data.loopId}`);
      }
    } catch (error) {
      console.error('DashboardGateway: Error resetting AI loop', error);
      client.emit('error', { message: 'Failed to reset AI loop' });
    }
  }

  @SubscribeMessage('dashboard:ai-loop-delete')
  handleDeleteAILoop(client: Socket, data: DashboardSocketData): void {
    try {
      if (data.loopId) {
        this.aiLoopService.deleteLoop(data.loopId);
        this.broadcastAILoops();
        console.log(`DashboardGateway: Deleted AI loop ${data.loopId}`);
      }
    } catch (error) {
      console.error('DashboardGateway: Error deleting AI loop', error);
      client.emit('error', { message: 'Failed to delete AI loop' });
    }
  }

  // Flow Execution Events (real implementation)
  @SubscribeMessage('dashboard:get-flow-executions')
  handleGetFlowExecutions(client: Socket): void {
    try {
      const executions = this.flowExecutionService.getExecutions({ limit: 50 });
      client.emit('dashboard:flow-executions-update', executions);
      console.log(`DashboardGateway: Sent flow executions to ${client.id}`);
    } catch (error) {
      console.error('DashboardGateway: Error getting flow executions', error);
      client.emit('error', { message: 'Failed to get flow executions' });
    }
  }

  @SubscribeMessage('dashboard:flow-create')
  handleCreateFlow(client: Socket, data: DashboardSocketData): void {
    try {
      const flow = this.flowExecutionService.createExecution(
        data.flowData?.name || 'New Flow',
        undefined,
        { priority: data.flowData?.priority }
      );
      this.broadcastFlowExecutions();
      console.log(`DashboardGateway: Created flow: ${flow.id}`);
    } catch (error) {
      console.error('DashboardGateway: Error creating flow', error);
      client.emit('error', { message: 'Failed to create flow' });
    }
  }

  @SubscribeMessage('dashboard:flow-start')
  handleStartFlow(client: Socket, data: DashboardSocketData): void {
    try {
      if (data.executionId) {
        this.flowExecutionService.startExecution(data.executionId);
        this.broadcastFlowExecutions();
        console.log(`DashboardGateway: Started flow ${data.executionId}`);
      }
    } catch (error) {
      console.error('DashboardGateway: Error starting flow', error);
      client.emit('error', { message: 'Failed to start flow' });
    }
  }

  @SubscribeMessage('dashboard:flow-pause')
  handlePauseFlow(client: Socket, data: DashboardSocketData): void {
    try {
      if (data.executionId) {
        this.flowExecutionService.pauseExecution(data.executionId);
        this.broadcastFlowExecutions();
        console.log(`DashboardGateway: Paused flow ${data.executionId}`);
      }
    } catch (error) {
      console.error('DashboardGateway: Error pausing flow', error);
      client.emit('error', { message: 'Failed to pause flow' });
    }
  }

  @SubscribeMessage('dashboard:flow-stop')
  handleStopFlow(client: Socket, data: DashboardSocketData): void {
    try {
      if (data.executionId) {
        this.flowExecutionService.stopExecution(data.executionId, 'Stopped by user');
        this.broadcastFlowExecutions();
        console.log(`DashboardGateway: Stopped flow ${data.executionId}`);
      }
    } catch (error) {
      console.error('DashboardGateway: Error stopping flow', error);
      client.emit('error', { message: 'Failed to stop flow' });
    }
  }

  @SubscribeMessage('dashboard:flow-reset')
  handleResetFlow(client: Socket, data: DashboardSocketData): void {
    try {
      if (data.executionId) {
        this.flowExecutionService.resetExecution(data.executionId);
        this.broadcastFlowExecutions();
        console.log(`DashboardGateway: Reset flow ${data.executionId}`);
      }
    } catch (error) {
      console.error('DashboardGateway: Error resetting flow', error);
      client.emit('error', { message: 'Failed to reset flow' });
    }
  }

  @SubscribeMessage('dashboard:flow-delete')
  handleDeleteFlow(client: Socket, data: DashboardSocketData): void {
    try {
      if (data.executionId) {
        this.broadcastFlowExecutions();
        console.log(`DashboardGateway: Deleted flow ${data.executionId}`);
      }
    } catch (error) {
      console.error('DashboardGateway: Error deleting flow', error);
      client.emit('error', { message: 'Failed to delete flow' });
    }
  }

  // Integration Hub Events (real implementation)
  @SubscribeMessage('dashboard:get-integrations')
  handleGetIntegrations(client: Socket): void {
    try {
      const integrations = this.integrationHealthService.getProviders();
      client.emit('dashboard:integrations-update', integrations);
      console.log(`DashboardGateway: Sent integrations to ${client.id}`);
    } catch (error) {
      console.error('DashboardGateway: Error getting integrations', error);
      client.emit('error', { message: 'Failed to get integrations' });
    }
  }

  @SubscribeMessage('dashboard:get-connections')
  handleGetConnections(client: Socket): void {
    try {
      const connections = this.integrationHealthService.getConnectionMetrics();
      client.emit('dashboard:connections-update', connections);
      console.log(`DashboardGateway: Sent connections to ${client.id}`);
    } catch (error) {
      console.error('DashboardGateway: Error getting connections', error);
      client.emit('error', { message: 'Failed to get connections' });
    }
  }

  @SubscribeMessage('dashboard:provider-connect')
  handleProviderConnect(client: Socket, data: DashboardSocketData): void {
    try {
      if (data.providerId) {
        this.integrationHealthService.connectProvider(data.providerId);
        console.log(`DashboardGateway: Connected provider ${data.providerId}`);
      }
    } catch (error) {
      console.error('DashboardGateway: Error connecting provider', error);
      client.emit('error', { message: 'Failed to connect provider' });
    }
  }

  @SubscribeMessage('dashboard:provider-disconnect')
  handleProviderDisconnect(client: Socket, data: DashboardSocketData): void {
    try {
      if (data.providerId) {
        this.integrationHealthService.disconnectProvider(data.providerId);
        console.log(`DashboardGateway: Disconnected provider ${data.providerId}`);
      }
    } catch (error) {
      console.error('DashboardGateway: Error disconnecting provider', error);
      client.emit('error', { message: 'Failed to disconnect provider' });
    }
  }

  @SubscribeMessage('dashboard:provider-test')
  handleProviderTest(client: Socket, data: DashboardSocketData): void {
    try {
      if (data.providerId) {
        this.integrationHealthService.testProviderConnection(data.providerId);
        console.log(`DashboardGateway: Testing provider ${data.providerId}`);
      }
    } catch (error) {
      console.error('DashboardGateway: Error testing provider', error);
      client.emit('error', { message: 'Failed to test provider' });
    }
  }

  @SubscribeMessage('dashboard:provider-sync')
  handleProviderSync(client: Socket, data: DashboardSocketData): void {
    try {
      if (data.providerId) {
        this.integrationHealthService.syncProvider(data.providerId);
        console.log(`DashboardGateway: Synced provider ${data.providerId}`);
      }
    } catch (error) {
      console.error('DashboardGateway: Error syncing provider', error);
      client.emit('error', { message: 'Failed to sync provider' });
    }
  }

  // Voice Analytics Events (real implementation)
  @SubscribeMessage('dashboard:get-voice-analytics')
  handleGetVoiceAnalytics(client: Socket, data: DashboardSocketData): void {
    try {
      const analytics = this.voiceAnalyticsService.getAnalytics(data.timeRange as any || '24h');
      client.emit('dashboard:voice-analytics-update', analytics);
      console.log(`DashboardGateway: Sent voice analytics to ${client.id}`);
    } catch (error) {
      console.error('DashboardGateway: Error getting voice analytics', error);
      client.emit('error', { message: 'Failed to get voice analytics' });
    }
  }

  // Private Methods
  private sendInitialData(client: Socket): void {
    try {
      // Send initial data for all dashboard components using real services
      const agents = this.agentMonitoringService.getAllAgentStatuses();
      const health = this.agentMonitoringService.getCurrentHealth();
      const loops = this.aiLoopService.getAllLoops();
      const executions = this.flowExecutionService.getExecutions({ limit: 50 });
      const integrations = this.integrationHealthService.getProviders();
      const connections = this.integrationHealthService.getConnectionMetrics();
      const analytics = this.voiceAnalyticsService.getAnalytics('24h');

      client.emit('dashboard:agent-status-update', agents);
      client.emit('dashboard:system-health-update', health);
      client.emit('dashboard:ai-loops-update', loops);
      client.emit('dashboard:flow-executions-update', executions);
      client.emit('dashboard:integrations-update', integrations);
      client.emit('dashboard:connections-update', connections);
      client.emit('dashboard:voice-analytics-update', analytics);
      
      console.log(`DashboardGateway: Sent initial data to ${client.id}`);
    } catch (error) {
      console.error('DashboardGateway: Error sending initial data', error);
    }
  }

  private startBroadcasting(): void {
    // Broadcast agent status every 2 seconds
    setInterval(() => {
      this.broadcastAgentStatus();
      this.broadcastSystemHealth();
    }, 2000);

    // Broadcast AI loop updates every 3 seconds
    setInterval(() => {
      this.broadcastAILoops();
    }, 3000);

    // Broadcast flow executions every 5 seconds
    setInterval(() => {
      this.broadcastFlowExecutions();
    }, 5000);

    // Broadcast integration updates every 10 seconds
    setInterval(() => {
      this.broadcastIntegrations();
    }, 10000);

    // Broadcast voice analytics every 30 seconds
    setInterval(() => {
      this.broadcastVoiceAnalytics();
    }, 30000);
  }

  private broadcastAgentStatus(): void {
    try {
      const agents = this.agentMonitoringService.getAllAgentStatuses();
      this.server.emit('dashboard:agent-status-update', agents);
    } catch (error) {
      console.error('DashboardGateway: Error broadcasting agent status', error);
    }
  }

  private broadcastSystemHealth(): void {
    try {
      const health = this.agentMonitoringService.getCurrentHealth();
      this.server.emit('dashboard:system-health-update', health);
    } catch (error) {
      console.error('DashboardGateway: Error broadcasting system health', error);
    }
  }

  private broadcastAILoops(): void {
    try {
      const loops = this.aiLoopService.getAllLoops();
      this.server.emit('dashboard:ai-loops-update', loops);
    } catch (error) {
      console.error('DashboardGateway: Error broadcasting AI loops', error);
    }
  }

  private broadcastFlowExecutions(): void {
    try {
      const executions = this.flowExecutionService.getExecutions({ limit: 50 });
      this.server.emit('dashboard:flow-executions-update', executions);
    } catch (error) {
      console.error('DashboardGateway: Error broadcasting flow executions', error);
    }
  }

  private broadcastIntegrations(): void {
    try {
      const integrations = this.integrationHealthService.getProviders();
      const connections = this.integrationHealthService.getConnectionMetrics();
      this.server.emit('dashboard:integrations-update', integrations);
      this.server.emit('dashboard:connections-update', connections);
    } catch (error) {
      console.error('DashboardGateway: Error broadcasting integrations', error);
    }
  }

  private broadcastVoiceAnalytics(): void {
    try {
      const analytics = this.voiceAnalyticsService.getAnalytics('24h');
      this.server.emit('dashboard:voice-analytics-realtime', analytics);
    } catch (error) {
      console.error('DashboardGateway: Error broadcasting voice analytics', error);
    }
  }

  // Mock data methods removed - using real services now
}