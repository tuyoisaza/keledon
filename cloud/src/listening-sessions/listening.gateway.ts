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
import { resolveCorsOrigins } from '../config/runtime-tier';

// Note: Namespace '/listen' might need client adjustment if using the same port.
// For simplicity with existing setup, we'll try to use a namespace.
const listeningCorsOrigin = resolveCorsOrigins();

const MAX_AUDIO_CHUNK_BYTES = 1024 * 1024;

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function toAudioPayload(value: unknown): Buffer | null {
  if (typeof value === 'string') {
    if (
      value.length > MAX_AUDIO_CHUNK_BYTES * 2 ||
      !/^(?:[A-Za-z0-9+/]*={0,2})$/.test(value)
    )
      return null;
    const decoded = Buffer.from(value, 'base64');
    return decoded.length > 0 && decoded.length <= MAX_AUDIO_CHUNK_BYTES
      ? decoded
      : null;
  }
  if (Buffer.isBuffer(value)) {
    return value.length > 0 && value.length <= MAX_AUDIO_CHUNK_BYTES
      ? value
      : null;
  }
  if (ArrayBuffer.isView(value) && value.byteLength <= MAX_AUDIO_CHUNK_BYTES) {
    const decoded = Buffer.from(
      value.buffer,
      value.byteOffset,
      value.byteLength,
    );
    return decoded.length > 0 ? decoded : null;
  }
  return null;
}

@WebSocketGateway({
  namespace: 'listen',
  cors: {
    origin: listeningCorsOrigin,
    credentials: true,
  },
  path: '/listen/ws', // Exact path requested
  transports: ['websocket', 'polling'], // Support both for Cloud Run compatibility
})
export class ListeningSessionGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  // Track workers per socket
  private workers = new Map<string, Worker>();

  constructor(private readonly sessionService: ListeningSessionService) {}

  handleConnection(client: Socket) {
    const sessionValue: unknown = client.handshake.query.session;
    const sessionId = typeof sessionValue === 'string' ? sessionValue : '';
    console.log(`[ListeningGateway] Incoming connection: ${client.id}`);

    if (!sessionId || !this.sessionService.validateSession(sessionId)) {
      console.log(
        '[ListeningGateway] Invalid or expired session, disconnecting.',
      );
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
  handleLegacyAudioChunk(client: Socket, chunk: unknown) {
    this.processAudioChunk(client, chunk);
  }

  @SubscribeMessage('AUDIO_CHUNK')
  handleAudioChunk(client: Socket, chunk: unknown) {
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
      const workerPath = path.join(
        process.cwd(),
        'dist/listening-sessions/vosk.worker.js',
      );

      const debug = client.handshake.query.debug === 'true';
      const languageValue: unknown = client.handshake.query.language;
      const language =
        typeof languageValue === 'string' &&
        ['en', 'es'].includes(languageValue)
          ? languageValue
          : 'en';

      console.log(`[ListeningGateway] Spawning worker from ${workerPath}`);

      const worker = new Worker(workerPath, {
        workerData: { sessionId, debug, language },
      });

      worker.on('message', (rawMessage: unknown) => {
        const msg = asRecord(rawMessage);
        if (msg.type === 'PARTIAL' && typeof msg.text === 'string') {
          client.emit('asr.partial', { text: msg.text.slice(0, 10000) });
        } else if (msg.type === 'FINAL' && typeof msg.text === 'string') {
          client.emit('asr.final', {
            text: msg.text.slice(0, 10000),
            timestamp: new Date().toISOString(),
          });
        } else if (msg.type === 'ERROR') {
          const error =
            typeof msg.error === 'string'
              ? msg.error.slice(0, 300)
              : 'Worker error';
          console.error('[ListeningGateway] Worker error:', error);
          client.emit('session.ended', {
            reason: 'worker_error: ' + error,
          });
        } else if (msg.type === 'READY') {
          console.log('[ListeningGateway] Worker ready');
        }
      });

      worker.on('error', (err) => {
        console.error('[ListeningGateway] Worker error:', err.message);
        client.emit('session.ended', {
          reason: 'worker_error: ' + err.message,
        });
      });

      worker.on('exit', (code) => {
        console.log(`[ListeningGateway] Worker exit code: ${code}`);
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

  private processAudioChunk(client: Socket, chunk: unknown) {
    const worker = this.workers.get(client.id);
    if (!worker) return;

    const record = asRecord(chunk);
    const payload = toAudioPayload(
      Object.hasOwn(record, 'payload') ? record.payload : chunk,
    );
    if (!payload) {
      console.warn(
        `[ListeningGateway] Ignoring invalid audio chunk for ${client.id}`,
      );
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
