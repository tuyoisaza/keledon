import {
    OnGatewayConnection,
    OnGatewayDisconnect,
    SubscribeMessage,
    WebSocketGateway,
    WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { SttFactory } from './stt.factory';
import { TtsFactory } from './tts.factory';
import { LlmFactory } from './llm.factory';
import { ConversationOrchestrator } from './conversation.orchestrator';
import { WorkflowStorage } from './workflow.storage';
import {
    EVENT_AUDIO_CHUNK,
    EVENT_FLOW_RESULT,
    EVENT_PAGE_SNAPSHOT,
    EVENT_EXECUTE_FLOW,
    EVENT_PLAY_AUDIO,
    EVENT_STOP_EXECUTION
} from './interfaces/contracts.interface';
import type {
    AudioChunkPayload,
    FlowResultPayload,
    PageSnapshotPayload
} from './interfaces/contracts.interface';

@WebSocketGateway({
    cors: { 
        origin: process.env.NODE_ENV === 'production' 
            ? process.env.CORS_ORIGINS?.split(',') || ['chrome-extension://*']
            : '*', // Allow all origins in development
        credentials: true 
    },
    transports: ['websocket', 'polling'], // Support both for Cloud Run compatibility
    path: '/', // Default path for Socket.io
})
export class AppGateway implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server: Server;

    // Track connections by type
    private adminClients = new Map<string, Socket>();
    private extensionClients = new Map<string, Socket>();
    private recordingSessions = new Map<string, { adminId: string; extensionId: string }>();

    constructor(
        private readonly sttFactory: SttFactory,
        private readonly ttsFactory: TtsFactory,
        private readonly llmFactory: LlmFactory,
        private readonly orchestrator: ConversationOrchestrator,
        private readonly workflowStorage: WorkflowStorage,
    ) { }

    handleConnection(client: Socket) {
        console.log(`[GW] Client connected: ${client.id}`);
        const defaultSttProvider = process.env.DEFAULT_STT_PROVIDER || 'mock';
        const defaultTtsProvider = process.env.DEFAULT_TTS_PROVIDER || 'mock';

        this.sttFactory.configure(client, { sttProvider: defaultSttProvider });
        this.ttsFactory.configure(client, { ttsProvider: defaultTtsProvider });
        this.llmFactory.configure(client, {});
        this.orchestrator.startConversation(client);
    }

    handleDisconnect(client: Socket) {
        console.log(`[GW] Client disconnected: ${client.id}`);
        this.orchestrator.stopConversation(client);
        this.sttFactory.cleanup(client.id);
        this.ttsFactory.cleanup(client.id);
        this.llmFactory.cleanup(client.id);

        // Cleanup client tracking
        this.adminClients.delete(client.id);
        this.extensionClients.delete(client.id);
    }

    @SubscribeMessage('ping')
    handlePing(): string {
        return 'pong';
    }

    // ========== CLIENT REGISTRATION ==========

    @SubscribeMessage('register-admin')
    handleRegisterAdmin(client: Socket): void {
        console.log(`[GW] Admin UI registered: ${client.id}`);
        this.adminClients.set(client.id, client);
        client.emit('registered', { type: 'admin' });

        // Immediately tell admin about any connected extensions
        if (this.extensionClients.size > 0) {
            const extensionId = this.extensionClients.keys().next().value;
            client.emit('extension-connected', { extensionId });
        }
    }

    @SubscribeMessage('register-extension')
    handleRegisterExtension(client: Socket): void {
        console.log(`[GW] Chrome Extension registered: ${client.id}`);
        this.extensionClients.set(client.id, client);
        client.emit('registered', { type: 'extension' });

        // Notify admins that extension is available
        this.adminClients.forEach(admin => {
            admin.emit('extension-connected', { extensionId: client.id });
        });
    }

    @SubscribeMessage('check-extensions')
    handleCheckExtensions(client: Socket): void {
        console.log(`[GW] Extension check requested by ${client.id}`);
        if (this.extensionClients.size > 0) {
            const extensionId = this.extensionClients.keys().next().value;
            client.emit('extension-connected', { extensionId });
        } else {
            client.emit('extension-disconnected', {});
        }
    }

    // ========== V1 CONTRACT HANDLERS ==========

    @SubscribeMessage(EVENT_AUDIO_CHUNK)
    async handleAudioChunk(client: Socket, payload: AudioChunkPayload): Promise<void> {
        // Enforce contract: payload must have type, payload, source, timestamp
        if (!payload.payload || !payload.type) {
            console.warn(`[GW] Invalid AUDIO_CHUNK from ${client.id}`);
            return;
        }

        const provider = this.sttFactory.getProvider(client.id);
        if (provider) {
            // Provider expects raw bytes or base64. 
            // If payload.payload is base64, ensure provider handles it.
            const result = await provider.processAudio(payload.payload);
            if (result) client.emit('transcript-part', result);
        }
    }

    @SubscribeMessage(EVENT_FLOW_RESULT)
    handleFlowResult(client: Socket, payload: FlowResultPayload): void {
        console.log(`[GW] FLOW_RESULT from ${client.id}: Status=${payload.status}, CorrID=${payload.correlation_id}`);

        if (payload.flow_run_id) {
            this.workflowStorage.updateFlowRun(payload.flow_run_id, {
                status: payload.status === 'SUCCESS' ? 'completed' : 'failed',
                completedAt: new Date().toISOString()
            }).catch(err => console.error('Failed to update flow run:', err));
        }

        // TODO: Forward to Orchestrator to decide next move
        // this.orchestrator.handleFlowResult(client.id, payload);

        // Relay to Admin for visibility
        this.adminClients.forEach(admin => {
            admin.emit('flow-log', {
                agentId: client.id,
                ...payload
            });
        });
    }

    @SubscribeMessage(EVENT_PAGE_SNAPSHOT)
    handlePageSnapshot(client: Socket, payload: PageSnapshotPayload): void {
        console.log(`[GW] PAGE_SNAPSHOT from ${client.id}: ${payload.title}`);
        // Store or Log
    }

    // ========== LEGACY / ADMIN COMMANDS (Bridge to V1) ==========

    @SubscribeMessage('start-recording')
    handleStartRecording(client: Socket, data: { targetUrl?: string }): void {
        console.log(`[GW] Recording requested by ${client.id}`);

        const extension = this.extensionClients.values().next().value;
        if (!extension) {
            client.emit('recording-error', { error: 'No Chrome Extension connected.' });
            return;
        }

        const sessionId = `rec-${Date.now()}`;
        this.recordingSessions.set(sessionId, {
            adminId: client.id,
            extensionId: extension.id,
        });

        // Use V1 command structure eventually, but for now stick to simple emit
        // or upgrade this to EXECUTE_FLOW if recording is a "flow"
        extension.emit('start-recording', {
            sessionId,
            targetUrl: data.targetUrl,
        });

        client.emit('recording-started', { sessionId, extensionId: extension.id });
    }

    @SubscribeMessage('stop-recording')
    handleStopRecording(client: Socket, data: { sessionId?: string }): void {
        // ... (Legacy logic for compatibility during migration)
        // ideally this becomes STOP_EXECUTION

        let session = null;
        let sessionId = null;
        for (const [id, s] of this.recordingSessions.entries()) {
            if (s.adminId === client.id) {
                session = s;
                sessionId = id;
                break;
            }
        }

        if (session) {
            const extension = this.extensionClients.get(session.extensionId);
            if (extension) {
                // V1 Upgrade: emit STOP_EXECUTION?
                // For now keep legacy to not break recorder immediately
                extension.emit('stop-recording', { sessionId });
            }
            this.recordingSessions.delete(sessionId!);
        }
        client.emit('recording-stopped', { sessionId });
    }

    @SubscribeMessage('client-config')
    async handleConfig(client: Socket, config: any): Promise<void> {
        const voiceProfile = config?.voiceProfile || {};
        const mergedConfig = {
            ...config,
            voice: voiceProfile.voice_id || config.voice,
            language: voiceProfile.language || config.language,
            speed: voiceProfile.speed || config.speed,
            voice_description: voiceProfile.voice_description || config.voice_description,
        };

        this.sttFactory.configure(client, mergedConfig);
        this.ttsFactory.configure(client, mergedConfig);
        this.llmFactory.configure(client, config);
    }

    @SubscribeMessage('speak-request')
    async handleSpeakRequest(client: Socket, text: string): Promise<void> {
        const provider = this.ttsFactory.getProvider(client.id);
        if (!provider) return;
        try {
            const stream = await provider.generateAudio(text);
            // V1 Upgrade: wrap in PLAY_AUDIO contract
            stream.on('data', (chunk: Buffer) => {
                client.emit(EVENT_PLAY_AUDIO, {
                    format: 'mp3', // assuming provider default
                    payload: chunk.toString('base64'),
                    interruptible: true
                });
            });
            stream.on('end', () => client.emit('audio-playback-end')); // Maybe deprecated?
        } catch (error) {
            console.error('TTS Error:', error);
        }
    }

    @SubscribeMessage('trigger-intent')
    async handleTriggerIntent(
        client: Socket,
        data: { intent: string; variables?: Record<string, string> }
    ): Promise<void> {
        console.log(`[GW] Trigger Intent: ${data.intent}`);
        // Inject intent directly into "Brain" as if checking user input
        // Note: processTurn is technically private but we'll reflect/update it
        // or just cast/use it if we update the file.
        // Let's ensure orchestrator has a public method for this.
        await this.orchestrator.processTurn(client, data.intent);
    }
}

