import { Injectable } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';

export interface ListeningSession {
  sessionId: string;
  wsUrl: string;
  expiresAt: string;
  tabUrl?: string;
  tabTitle?: string;
}

@Injectable()
export class ListeningSessionService {
  // The websocket treats the session ID as a bearer capability, so keep its
  // full UUID entropy and expire it even when no client reconnects.
  private sessions = new Map<string, ListeningSession>();

  createSession(data: {
    source: string;
    tabUrl?: string;
    tabTitle?: string;
  }): ListeningSession {
    this.removeExpiredSessions();
    const sessionId = `ls_${uuidv4()}`;
    const expiresAt = new Date(Date.now() + 3600 * 1000).toISOString();

    // Hardcoded WS URL for now - in production this should be dynamic or env var
    const wsUrl = `ws://localhost:3001/listen/ws?session=${sessionId}`;

    const session: ListeningSession = {
      sessionId,
      wsUrl,
      expiresAt,
      tabUrl: data.tabUrl,
      tabTitle: data.tabTitle,
    };

    this.sessions.set(sessionId, session);
    console.log('[ListeningService] Listening session created');

    return session;
  }

  validateSession(sessionId: string): boolean {
    return this.getSession(sessionId) !== undefined;
  }

  getSession(sessionId: string): ListeningSession | undefined {
    const session = this.sessions.get(sessionId);
    if (session && Date.parse(session.expiresAt) <= Date.now()) {
      this.sessions.delete(sessionId);
      return undefined;
    }
    return session;
  }

  private removeExpiredSessions(): void {
    const now = Date.now();
    for (const [sessionId, session] of this.sessions) {
      if (Date.parse(session.expiresAt) <= now) this.sessions.delete(sessionId);
    }
  }
}
