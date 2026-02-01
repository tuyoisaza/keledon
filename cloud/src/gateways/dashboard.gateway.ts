import { WebSocketGateway, SubscribeMessage, OnGatewayConnection, OnGatewayDisconnect, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';
import { Socket } from 'socket.io';
import { AgentMonitoringService, SystemHealth } from '../services/agent-monitoring.service';
import { AILoopService } from '../services/ai-loop.service';

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
    private readonly aiLoopService: AILoopService
  ) {
    console.log('DashboardGateway: Initialized with enhanced WebSocket support');
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

  // Flow Execution Events (mock implementation for now)
  @SubscribeMessage('dashboard:get-flow-executions')
  handleGetFlowExecutions(client: Socket): void {
    try {
      const executions = this.getMockFlowExecutions();
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
      const flow = this.createMockFlow(data.flowData);
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
        this.updateFlowStatus(data.executionId, 'running');
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
        this.updateFlowStatus(data.executionId, 'paused');
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
        this.updateFlowStatus(data.executionId, 'failed');
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
        this.updateFlowStatus(data.executionId, 'idle');
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

  // Integration Hub Events (mock implementation)
  @SubscribeMessage('dashboard:get-integrations')
  handleGetIntegrations(client: Socket): void {
    try {
      const integrations = this.getMockIntegrations();
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
      const connections = this.getMockConnections();
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
        this.updateProviderStatus(data.providerId, 'connected');
        this.broadcastIntegrations();
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
        this.updateProviderStatus(data.providerId, 'disconnected');
        this.broadcastIntegrations();
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
        setTimeout(() => {
          this.updateProviderHealth(data.providerId, {
            responseTime: Math.random() * 200,
            uptime: 99 + Math.random(),
            errorRate: Math.random() * 2
          });
          this.broadcastIntegrations();
        }, 1000);
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
        setTimeout(() => {
          this.updateProviderStatus(data.providerId, 'connected');
          this.broadcastIntegrations();
        }, 500);
        console.log(`DashboardGateway: Synced provider ${data.providerId}`);
      }
    } catch (error) {
      console.error('DashboardGateway: Error syncing provider', error);
      client.emit('error', { message: 'Failed to sync provider' });
    }
  }

  // Voice Analytics Events (mock implementation)
  @SubscribeMessage('dashboard:get-voice-analytics')
  handleGetVoiceAnalytics(client: Socket, data: DashboardSocketData): void {
    try {
      const analytics = this.getMockVoiceAnalytics(data.timeRange || '24h');
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
      // Send initial data for all dashboard components
      const agents = this.agentMonitoringService.getAllAgentStatuses();
      const health = this.agentMonitoringService.getCurrentHealth();
      const loops = this.aiLoopService.getAllLoops();
      const executions = this.getMockFlowExecutions();
      const integrations = this.getMockIntegrations();
      const connections = this.getMockConnections();
      const analytics = this.getMockVoiceAnalytics('24h');

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
      const executions = this.getMockFlowExecutions();
      this.server.emit('dashboard:flow-executions-update', executions);
    } catch (error) {
      console.error('DashboardGateway: Error broadcasting flow executions', error);
    }
  }

  private broadcastIntegrations(): void {
    try {
      const integrations = this.getMockIntegrations();
      const connections = this.getMockConnections();
      this.server.emit('dashboard:integrations-update', integrations);
      this.server.emit('dashboard:connections-update', connections);
    } catch (error) {
      console.error('DashboardGateway: Error broadcasting integrations', error);
    }
  }

  private broadcastVoiceAnalytics(): void {
    try {
      const analytics = this.getMockVoiceAnalytics('24h');
      this.server.emit('dashboard:voice-analytics-realtime', analytics);
    } catch (error) {
      console.error('DashboardGateway: Error broadcasting voice analytics', error);
    }
  }

  // Mock data methods (these would be replaced with real service integrations)
  private mockFlows: any[] = [];
  private mockIntegrations: any[] = [];

  private getMockFlowExecutions() {
    if (this.mockFlows.length === 0) {
      this.mockFlows = [
        {
          id: 'exec_001',
          name: 'Login Flow',
          status: 'completed',
          steps: [],
          startTime: new Date(Date.now() - 180000),
          endTime: new Date(Date.now() - 120000),
          currentStepIndex: 5,
          totalSteps: 5,
          progress: 100,
          performance: {
            totalDuration: 60000,
            averageStepTime: 12000,
            successRate: 100,
            errorRate: 0
          }
        }
      ];
    }
    return this.mockFlows;
  }

  private createMockFlow(flowData: any) {
    const newFlow = {
      id: 'exec_' + Date.now(),
      name: flowData?.name || `Flow Execution ${this.mockFlows.length + 1}`,
      status: 'idle',
      steps: [],
      startTime: null,
      endTime: null,
      currentStepIndex: 0,
      totalSteps: 0,
      progress: 0,
      performance: {
        totalDuration: 0,
        averageStepTime: 0,
        successRate: 0,
        errorRate: 0
      }
    };
    this.mockFlows.push(newFlow);
    return newFlow;
  }

  private updateFlowStatus(executionId: string, status: string) {
    const flow = this.mockFlows.find(f => f.id === executionId);
    if (flow) {
      flow.status = status as any;
      if (status === 'running' && !flow.startTime) {
        flow.startTime = new Date();
      } else if (status === 'completed' || status === 'failed') {
        flow.endTime = new Date();
        flow.progress = 100;
      }
    }
  }

  private getMockIntegrations() {
    if (this.mockIntegrations.length === 0) {
      this.mockIntegrations = [
        {
          id: 'salesforce',
          name: 'Salesforce',
          category: 'crm',
          icon: 'Globe',
          description: 'CRM and customer management platform',
          status: 'connected',
          version: '2.1.0',
          lastSync: new Date(),
          health: {
            responseTime: 120,
            uptime: 99.8,
            errorRate: 0.1
          },
          features: ['Contact Management', 'Lead Tracking', 'Analytics'],
          config: {
            apiKey: true,
            oauth: true,
            customFields: true
          }
        }
      ];
    }
    return this.mockIntegrations;
  }

  private getMockConnections() {
    return this.mockIntegrations.map(provider => ({
      providerId: provider.id,
      status: provider.status,
      lastSync: provider.lastSync,
      metrics: {
        requestsPerMinute: Math.floor(Math.random() * 50) + 10,
        dataTransfer: Math.floor(Math.random() * 1000) + 100,
        errorCount: Math.floor(Math.random() * 2)
      }
    }));
  }

  private updateProviderStatus(providerId: string, status: string) {
    const provider = this.mockIntegrations.find(p => p.id === providerId);
    if (provider) {
      provider.status = status as any;
      provider.lastSync = new Date();
    }
  }

  private updateProviderHealth(providerId: string, health: any) {
    const provider = this.mockIntegrations.find(p => p.id === providerId);
    if (provider) {
      provider.health = { ...provider.health, ...health };
    }
  }

  private getMockVoiceAnalytics(timeRange: string) {
    return {
      totalConversations: Math.floor(Math.random() * 500) + 1000,
      avgDuration: Math.floor(Math.random() * 60) + 180,
      successRate: Math.floor(Math.random() * 10) + 85,
      sentimentDistribution: {
        positive: Math.floor(Math.random() * 20) + 60,
        neutral: Math.floor(Math.random() * 15) + 20,
        negative: Math.floor(Math.random() * 10) + 5
      },
      topKeywords: [
        { word: 'billing', count: Math.floor(Math.random() * 100) + 200, trend: 'up' },
        { word: 'password', count: Math.floor(Math.random() * 50) + 150, trend: 'stable' },
        { word: 'delivery', count: Math.floor(Math.random() * 80) + 120, trend: 'down' }
      ],
      speakerStats: {
        customer: {
          totalSpeakTime: Math.floor(Math.random() * 30) + 60,
          avgSpeakingRate: Math.floor(Math.random() * 20) + 140,
          interruptions: Math.floor(Math.random() * 10) + 20
        },
        agent: {
          totalSpeakTime: Math.floor(Math.random() * 20) + 30,
          avgSpeakingRate: Math.floor(Math.random() * 30) + 150,
          interruptions: Math.floor(Math.random() * 5) + 5
        }
      },
      qualityMetrics: {
        clarity: Math.floor(Math.random() * 10) + 85,
        completeness: Math.floor(Math.random() * 15) + 80,
        relevance: Math.floor(Math.random() * 10) + 90,
        satisfaction: Math.floor(Math.random() * 15) + 80
      },
      recentConversations: [
        {
          id: 'conv_001',
          timestamp: new Date(),
          duration: Math.floor(Math.random() * 120) + 120,
          sentiment: 'positive',
          summary: 'Customer successfully completed order process',
          issues: []
        }
      ]
    };
  }
}