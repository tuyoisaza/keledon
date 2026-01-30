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
    // In-memory storage for now, as per brief (minimal persistence)
    private sessions = new Map<string, ListeningSession>();

    async createSession(data: { source: string; tabUrl?: string; tabTitle?: string }): Promise<ListeningSession> {
        const sessionId = `ls_${uuidv4().split('-')[0]}`; // Short ID for readability
        const expiresAt = new Date(Date.now() + 3600 * 1000).toISOString(); // 1 hour expiry

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
        console.log(`[ListeningService] Session created: ${sessionId}`);

        return session;
    }

    validateSession(sessionId: string): boolean {
        return this.sessions.has(sessionId);
    }

    getSession(sessionId: string): ListeningSession | undefined {
        return this.sessions.get(sessionId);
    }
}
