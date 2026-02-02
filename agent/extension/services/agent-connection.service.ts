// Agent Connection Service - Canonical Implementation
// This implements the Agent → Cloud connection per canonical contracts

export class AgentConnection {
  private ws: WebSocket | null = null;
  private sessionId: string | null = null;
  private agentId: string;
  private eventHandlers: Map<string, Function[]> = new Map();

  constructor(agentId: string) {
    this.agentId = agentId;
  }

  async connect(): Promise<string> {
    if (this.ws?.readyState === WebSocket.OPEN) {
      throw new Error('Already connected');
    }

    // Connect to canonical cloud backend
    const wsUrl = process.env.NODE_ENV === 'production' 
      ? 'wss://keledon.tuyoisaza.com' 
      : 'ws://localhost:3001';

    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log(`[AgentConnection] Connected to Cloud`);
        
        // Request real session creation (canonical: no fake sessions)
        this.sendMessage({
          type: 'session.create',
          data: {
            agent_id: this.agentId,
            tab_url: window.location.href,
            tab_title: document.title
          }
        });
      };

      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          this.handleMessage(message);
          
          if (message.type === 'session.created') {
            this.sessionId = message.data.session_id;
            console.log(`[AgentConnection] Real session created: ${this.sessionId}`);
            resolve(this.sessionId!);
          }
        } catch (error) {
          console.error('[AgentConnection] Error parsing message:', error);
        }
      };

      this.ws.onerror = (error) => {
        console.error('[AgentConnection] WebSocket error:', error);
        reject(error);
      };

      this.ws.onclose = () => {
        console.log('[AgentConnection] Disconnected');
        this.sessionId = null;
      };
    });
  }

  async sendEvent(eventType: 'text_input' | 'ui_result' | 'system', payload: any): Promise<void> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN || !this.sessionId) {
      throw new Error('Not connected or no session');
    }

    // Canonical event structure
    const agentEvent = {
      type: 'agent.event',
      data: {
        session_id: this.sessionId,
        event_type: eventType,
        payload: payload,
        ts: new Date().toISOString(),
        agent_id: this.agentId
      }
    };

    this.sendMessage(agentEvent);
    console.log(`[AgentConnection] Event sent: ${eventType}`);
  }

  onCommand(callback: (command: any) => void): void {
    this.addEventListener('command', callback);
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
      this.sessionId = null;
    }
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN && !!this.sessionId;
  }

  getSessionId(): string | null {
    return this.sessionId;
  }

  private sendMessage(message: any): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  private handleMessage(message: any): void {
    const { type, data } = message;
    
    // Handle session-specific commands
    if (type === `command.${this.sessionId}`) {
      this.emit('command', data);
      return;
    }

    // Handle acknowledgments
    if (type === 'event.acknowledged') {
      console.log(`[AgentConnection] Event acknowledged: ${data.event_id}`);
      return;
    }

    // Handle errors
    if (type === 'error') {
      console.error('[AgentConnection] Server error:', data.message);
      this.emit('error', data);
      return;
    }

    this.emit(type, data);
  }

  private addEventListener(event: string, callback: Function): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event)!.push(callback);
  }

  private emit(event: string, data: any): void {
    const handlers = this.eventHandlers.get(event) || [];
    handlers.forEach(handler => handler(data));
  }
}