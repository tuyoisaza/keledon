import { Injectable } from '@nestjs/common';
import { Socket } from 'socket.io';
import { Observable, Subject, interval } from 'rxjs';

export interface AgentStatus {
  id: string;
  name: string;
  status: 'idle' | 'listening' | 'processing' | 'executing' | 'error';
  audioLevel: number;
  lastActivity: Date;
  capabilities: string[];
  currentSession?: string;
  currentStep?: string;
  performance: {
    cpu: number;
    memory: number;
    network: number;
  };
  errors: string[];
}

export interface SystemHealth {
  overall: 'healthy' | 'warning' | 'critical';
  websocket: 'connected' | 'disconnected' | 'connecting';
  tts: 'ready' | 'busy' | 'error';
  stt: 'ready' | 'busy' | 'error';
  ai: 'ready' | 'busy' | 'error';
}

@Injectable()
export class AgentMonitoringService {
  private agentStatuses = new Map<string, AgentStatus>();
  private systemHealth = new Subject<SystemHealth>();
  private agentStatusUpdates = new Subject<AgentStatus[]>();
  private connectedSockets = new Set<string>();

  constructor() {
    console.log('AgentMonitoringService: Initialized');
    // Start monitoring intervals
    this.startPerformanceMonitoring();
    this.startHealthChecks();
  }

  // Socket lifecycle management
  registerSocket(socket: Socket): void {
    this.connectedSockets.add(socket.id);
    console.log(`AgentMonitoring: Socket ${socket.id} registered`);
    
    // Send initial status
    socket.emit('agent:initial-status', this.getAllAgentStatuses());
    socket.emit('system:health', this.getCurrentHealth());
  }

  unregisterSocket(socket: Socket): void {
    this.connectedSockets.delete(socket.id);
    console.log(`AgentMonitoring: Socket ${socket.id} unregistered`);
  }

  // Agent status management
  updateAgentStatus(socketId: string, status: Partial<AgentStatus>): void {
    const existingAgent = this.agentStatuses.get(socketId);
    if (existingAgent) {
      const updatedAgent = { ...existingAgent, ...status, lastActivity: new Date() };
      this.agentStatuses.set(socketId, updatedAgent);
      this.broadcastAgentUpdate(updatedAgent);
    }
  }

  setAudioLevel(socketId: string, audioLevel: number): void {
    this.updateAgentStatus(socketId, { audioLevel });
  }

  setAgentState(socketId: string, state: AgentStatus['status'], currentStep?: string): void {
    this.updateAgentStatus(socketId, { status: state, currentStep: currentStep });
  }

  recordPerformanceMetrics(socketId: string, performance: AgentStatus['performance']): void {
    this.updateAgentStatus(socketId, { performance: performance });
  }

  // System health monitoring
  private startHealthChecks(): void {
    interval(10000).subscribe(() => {
      const health = this.assessSystemHealth();
      this.systemHealth.next(health);
      this.broadcastHealthUpdate(health);
    });
  }

  private assessSystemHealth(): SystemHealth {
    const connectedSocketCount = this.connectedSockets.size;
    
    return {
      overall: connectedSocketCount > 0 ? 'healthy' : 'warning',
      websocket: connectedSocketCount > 0 ? 'connected' : 'disconnected',
      tts: this.randomHealthStatus(),
      stt: this.randomHealthStatus(),
      ai: this.randomHealthStatus()
    };
  }

  private randomHealthStatus(): 'ready' | 'busy' | 'error' {
    const rand = Math.random();
    if (rand > 0.95) return 'error';
    if (rand > 0.8) return 'busy';
    return 'ready';
  }

  // Performance monitoring
  private startPerformanceMonitoring(): void {
    interval(2000).subscribe(() => {
      this.updateAllPerformances();
    });
  }

  private updateAllPerformances(): void {
    for (const [socketId, agent] of this.agentStatuses) {
      const performance: AgentStatus['performance'] = {
        cpu: Math.random() * 40 + 20,
        memory: Math.random() * 50 + 30,
        network: Math.random() * 20 + 5
      };
      this.recordPerformanceMetrics(socketId, performance);
    }
  }

  // Data access methods
  getAllAgentStatuses(): AgentStatus[] {
    return Array.from(this.agentStatuses.values());
  }

  getAgentStatus(socketId: string): AgentStatus | undefined {
    return this.agentStatuses.get(socketId);
  }

  getCurrentHealth(): SystemHealth {
    return this.assessSystemHealth();
  }

  // Observable streams
  getAgentStatusUpdates(): Observable<AgentStatus[]> {
    return this.agentStatusUpdates.asObservable();
  }

  getSystemHealthUpdates(): Observable<SystemHealth> {
    return this.systemHealth.asObservable();
  }

  // WebSocket broadcasting
  private broadcastAgentUpdate(agent: AgentStatus): void {
    // This would be implemented in the WebSocket gateway
    console.log(`AgentMonitoring: Broadcasting update for agent ${agent.id}`);
  }

  private broadcastHealthUpdate(health: SystemHealth): void {
    // This would be implemented in the WebSocket gateway
    console.log('AgentMonitoring: Broadcasting health update', health);
  }

  // Initialize mock agents for testing
  initializeMockAgents(): void {
    const mockAgents: AgentStatus[] = [
      {
        id: 'agent-001',
        name: 'Primary Agent',
        status: 'idle',
        audioLevel: 0,
        lastActivity: new Date(),
        capabilities: ['STT', 'TTS', 'RPA', 'AI'],
        performance: { cpu: 25, memory: 45, network: 8 },
        errors: []
      },
      {
        id: 'agent-002',
        name: 'RPA Specialist',
        status: 'idle',
        audioLevel: 0,
        lastActivity: new Date(),
        capabilities: ['RPA', 'Vision'],
        performance: { cpu: 15, memory: 30, network: 5 },
        errors: []
      }
    ];

    mockAgents.forEach(agent => {
      this.agentStatuses.set(agent.id, agent);
    });

    console.log(`AgentMonitoring: Initialized ${mockAgents.length} mock agents`);
  }
}