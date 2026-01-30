import {
    OnGatewayConnection,
    OnGatewayDisconnect,
    SubscribeMessage,
    WebSocketGateway,
    WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ListeningSessionService } from './listening-session.service';
import { Worker } from 'worker_threads';
import * as path from 'path';

// Note: Namespace '/listen' might need client adjustment if using the same port.
// For simplicity with existing setup, we'll try to use a namespace.
@WebSocketGateway({
    namespace: 'listen',
    cors: { 
        origin: process.env.NODE_ENV === 'production' 
            ? process.env.CORS_ORIGINS?.split(',') || ['chrome-extension://*']
            : '*', // Allow all origins in development
        credentials: true 
    },
    path: '/listen/ws', // Exact path requested
    transports: ['websocket', 'polling'], // Support both for Cloud Run compatibility
})
export class ListeningSessionGateway implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server: Server;

    // Track workers per socket
    private workers = new Map<string, Worker>();

    constructor(private readonly sessionService: ListeningSessionService) { }

    handleConnection(client: Socket) {
        const sessionId = client.handshake.query.session as string;
        console.log(`[ListeningGateway] Incoming connection: ${client.id} (Session: ${sessionId})`);

        if (!sessionId || !this.sessionService.validateSession(sessionId)) {
            console.log(`[ListeningGateway] Invalid session ${sessionId}, disconnecting.`);
            client.emit('session.ended', { reason: 'invalid_session' });
            client.disconnect(true);
            return;
        }

        // Spawn Worker
        this.startWorker(client, sessionId);
    }

    handleDisconnect(client: Socket) {
        console.log(`[ListeningGateway] Disconnect: ${client.id}`);
        this.stopWorker(client.id);
    }

    @SubscribeMessage('audio.chunk')
    handleLegacyAudioChunk(client: Socket, chunk: any) {
        this.processAudioChunk(client, chunk);
    }

    @SubscribeMessage('AUDIO_CHUNK')
    handleAudioChunk(client: Socket, chunk: any) {
        this.processAudioChunk(client, chunk);
    }

    @SubscribeMessage('session.stop')
    handleSessionStop(client: Socket) {
        console.log(`[ListeningGateway] Session stopped by client: ${client.id}`);
        this.stopWorker(client.id);
        client.emit('session.ended', { reason: 'user' });
        client.disconnect();
    }

    private startWorker(client: Socket, sessionId: string) {
        try {
            // Path to worker file (needs to be compiled JS)
            // Fix: Use process.cwd() to find dist/listening-sessions explicitly
            const workerPath = path.join(process.cwd(), 'dist/listening-sessions/vosk.worker.js');

            const debug = client.handshake.query.debug === 'true';
            const language = (client.handshake.query.language as string) || 'en';

            console.log(`[ListeningGateway] Spawning worker from ${workerPath}`);

            const worker = new Worker(workerPath, {
                workerData: { sessionId, debug, language }
            });

            worker.on('message', (msg) => {
                if (msg.type === 'PARTIAL') {
                    client.emit('asr.partial', { text: msg.text });
                } else if (msg.type === 'FINAL') {
                    client.emit('asr.final', { text: msg.text, timestamp: new Date().toISOString() });
                } else if (msg.type === 'ERROR') {
                    console.error(`[Worker Error ${sessionId}]`, msg.error);
                    client.emit('session.ended', { reason: 'worker_error: ' + msg.error });
                } else if (msg.type === 'READY') {
                    console.log(`[ListeningGateway] Worker ready for session ${sessionId}`);
                }
            });

            worker.on('error', (err) => {
                console.error(`[Worker Error ${sessionId}]`, err);
                client.emit('session.ended', { reason: 'worker_error: ' + err.message });
            });

            worker.on('exit', (code) => {
                console.log(`[Worker Exit ${sessionId}] Code: ${code}`);
                if (code !== 0) {
                    client.emit('session.ended', { reason: 'worker_crashed' });
                }
            });

            this.workers.set(client.id, worker);
        } catch (e) {
            console.error('[ListeningGateway] Failed to start worker:', e);
            client.disconnect();
        }
    }

    private processAudioChunk(client: Socket, chunk: any) {
        const worker = this.workers.get(client.id);
        if (!worker) return;

        const payload = chunk?.payload ?? chunk;
        if (!payload) {
            console.warn(`[ListeningGateway] Missing audio payload for ${client.id}`);
            return;
        }

        worker.postMessage({ type: 'AUDIO', data: payload });
    }

    private stopWorker(clientId: string) {
        const worker = this.workers.get(clientId);
        if (worker) {
            worker.postMessage({ type: 'STOP' });
            // worker.terminate(); // Removed to allow graceful exit via process.exit(0) in worker
            this.workers.delete(clientId);
        }
    }
}
