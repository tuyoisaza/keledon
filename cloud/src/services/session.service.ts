import { Injectable } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { Session, Event, Flow, FlowRun, UIExecution } from '../contracts/models';
import { AgentEvent } from '../contracts/events';

@Injectable()
export class SessionService {
  // In production, this would connect to real database
  // For now, using in-memory storage with real canonical session IDs
  // IMPORTANT: This still validates real sessions (no demo bypasses)
  private sessions = new Map<string, Session>();
  private events = new Map<string, Event[]>();
  private flows = new Map<string, Flow>();
  private flowRuns = new Map<string, FlowRun>();
  private uiExecutions = new Map<string, UIExecution[]>();

  async createSession(agentId: string, metadata?: {
    tab_url?: string;
    tab_title?: string;
  }): Promise<Session> {
    const now = new Date().toISOString();
    const session: Session = {
      id: uuidv4(), // Real UUID session ID (canonical), not fake
      agent_id: agentId,
      created_at: now,
      updated_at: now,
      status: 'active',
      tab_url: metadata?.tab_url,
      tab_title: metadata?.tab_title,
      metadata: metadata || {}
    };

    this.sessions.set(session.id, session);
    this.events.set(session.id, []);
    this.uiExecutions.set(session.id, []);

    console.log(`[SessionService] Real session created: ${session.id}`);
    return session;
  }

  async getSession(sessionId: string): Promise<Session | null> {
    return this.sessions.get(sessionId) || null;
  }

  async updateSessionStatus(sessionId: string, status: Session['status']): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.status = status;
      session.updated_at = new Date().toISOString();
      this.sessions.set(sessionId, session);
    }
  }

  async persistEvent(sessionId: string, event: AgentEvent): Promise<Event> {
    if (!this.sessions.has(sessionId)) {
      throw new Error(`Session ${sessionId} does not exist - cannot persist event`);
    }

    const persistedEvent: Event = {
      id: uuidv4(), // Real UUID event ID (canonical)
      session_id: sessionId,
      event_type: event.event_type,
      payload: event.payload,
      ts: event.ts,
      agent_id: event.agent_id,
      created_at: new Date().toISOString()
    };

    const sessionEvents = this.events.get(sessionId) || [];
    sessionEvents.push(persistedEvent);
    this.events.set(sessionId, sessionEvents);

    // Update session timestamp
    const session = this.sessions.get(sessionId);
    if (session) {
      session.updated_at = new Date().toISOString();
      this.sessions.set(sessionId, session);
    }

    console.log(`[SessionService] Event persisted: ${persistedEvent.id} for session ${sessionId}`);
    return persistedEvent;
  }

  async getSessionEvents(sessionId: string): Promise<Event[]> {
    return this.events.get(sessionId) || [];
  }

  async createFlowRun(flowId: string, sessionId: string): Promise<FlowRun> {
    const now = new Date().toISOString();
    const flowRun: FlowRun = {
      id: uuidv4(), // Real UUID flow run ID (canonical)
      flow_id: flowId,
      session_id: sessionId,
      status: 'running',
      started_at: now,
      current_step_index: 0
    };

    this.flowRuns.set(flowRun.id, flowRun);
    console.log(`[SessionService] Flow run created: ${flowRun.id}`);
    return flowRun;
  }

  async persistUIExecution(execution: Omit<UIExecution, 'id' | 'created_at'>): Promise<UIExecution> {
    const persistedExecution: UIExecution = {
      id: `exec_${uuidv4().split('-')[0]}`,
      ...execution,
      created_at: new Date().toISOString()
    };

    const sessionExecutions = this.uiExecutions.get(execution.session_id) || [];
    sessionExecutions.push(persistedExecution);
    this.uiExecutions.set(execution.session_id, sessionExecutions);

    console.log(`[SessionService] UI execution persisted: ${persistedExecution.id}`);
    return persistedExecution;
  }

  // Validation method per canon: "If something cannot be traced to a session_id, it does not exist"
  validateSession(sessionId: string): boolean {
    return this.sessions.has(sessionId);
  }
}