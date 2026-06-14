import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, Inject, OnModuleInit } from '@nestjs/common';
import { TTSService } from '../tts/tts.service';
import { LLMService } from '../llm/llm.service';
import { getApiVersion } from '../version';
import { ProviderConfigResolver } from './providers/provider-config.resolver';
import { VoiceProviderRegistry } from './providers/voice-provider.registry';
import { WebRtcService } from './webrtc/webrtc.service';

const voiceCorsOrigins =
  process.env.KELEDON_ALLOW_ALL_CORS === 'true'
    ? true
    : process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'];

export interface CallContext {
  companyName: string;
  brandName: string;
  teamName: string;
  companyId?: string;
  brandId?: string;
  teamId?: string;
  language?: string;
}

export interface VoiceSession {
  deviceId: string;
  sessionId: string;
  startedAt: Date;
  transcript: string[];
  context?: CallContext;
  /** Conversation history for brain context */
  history: { role: 'user' | 'assistant'; content: string }[];
  /** Whether the brain is currently speaking */
  isSpeaking: boolean;
  /** Abort controller for current TTS stream */
  abortTTS: () => void;
  /** Timestamps at each pipeline stage (ms since epoch) */
  latencyTimestamps?: {
    vadEnd?: number;
    sttFinal?: number;
    brainStart?: number;
    brainEnd?: number;
    ttsFirstChunk?: number;
    ttsComplete?: number;
    interrupt?: number;
  };
}

export interface VoiceCallEvents {
  'call:start': (session: VoiceSession) => void;
  'call:end': (session: VoiceSession, transcript: string[]) => void;
  transcript: (text: string, isFinal: boolean) => void;
}

@WebSocketGateway({
  cors: {
    origin: voiceCorsOrigins,
    credentials: true,
  },
  namespace: '/ws/voice',
  pingInterval: 10000,
  pingTimeout: 5000,
})
export class VoiceGateway
  implements OnGatewayConnection, OnGatewayDisconnect, OnModuleInit
{
  private readonly logger = new Logger(VoiceGateway.name);

  private activeSessions: Map<string, VoiceSession> = new Map();

  constructor(
    @Inject(TTSService)
    private ttsService?: TTSService,
    private llmService?: LLMService,
    private readonly configResolver?: ProviderConfigResolver,
    private readonly registry?: VoiceProviderRegistry,
    private readonly webrtcService?: WebRtcService,
  ) {}

  onModuleInit() {
    this.logger.log('VoiceGateway initialized (Brain-integrated)');
  }

  @WebSocketServer()
  server: Server;

  async handleConnection(client: Socket): Promise<void> {
    const token = client.handshake.auth?.token;
    const deviceId = client.handshake.auth?.device_id;
    const sessionId = client.handshake.auth?.session_id;

    if (!token || !deviceId) {
      this.logger.warn(`Voice connection rejected: missing token or device_id`);
      client.disconnect();
      return;
    }

    this.logger.log(
      `[v${getApiVersion()}] Voice connection: device=${deviceId}, session=${sessionId || 'none'}`,
    );

    const session: VoiceSession = {
      deviceId,
      sessionId: sessionId || `voice_${Date.now()}`,
      startedAt: new Date(),
      transcript: [],
      history: [],
      isSpeaking: false,
      abortTTS: () => {},
      latencyTimestamps: {},
    };

    this.activeSessions.set(client.id, session);
    client.data.session = session;

    // Resolve team provider config from auth context if available
    const ctx = client.handshake.auth?.context
      ? typeof client.handshake.auth.context === 'string'
        ? JSON.parse(client.handshake.auth.context)
        : client.handshake.auth.context
      : null;
    if (ctx?.teamId && this.configResolver && this.registry) {
      try {
        const config = await this.configResolver.resolveTeamConfig(ctx.teamId);
        session.context = ctx;
        await this.registry.getOrCreateProvider(session.sessionId, config);
        if (config.ttsProvider === 'speaches') {
          const warmupLang = (ctx.language || 'en').startsWith('es') ? 'es' : 'en';
          void this.ttsService
            ?.warmSpeachesForTeam(ctx.teamId, warmupLang)
            .catch((err) => {
              this.logger.warn(
                `Speaches warmup failed: ${err instanceof Error ? err.message : String(err)}`,
              );
            });
        }
        this.logger.log(
          `Provider configured for team ${ctx.teamId}: STT=${config.sttProvider} TTS=${config.ttsProvider}`,
        );
      } catch (err) {
        this.logger.warn(
          `Could not resolve provider config: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }

    this.server.emit('voice:connected', {
      device_id: deviceId,
      session_id: session.sessionId,
      api_version: getApiVersion(),
    });
  }

  async handleDisconnect(client: Socket): Promise<void> {
    const session = this.activeSessions.get(client.id);
    if (session) {
      this.logger.log(
        `[v${getApiVersion()}] Voice disconnected: ${session.deviceId}, transcript length: ${session.transcript.length}`,
      );

      this.server.emit('voice:disconnected', {
        device_id: session.deviceId,
        session_id: session.sessionId,
        transcript: session.transcript,
      });

      this.activeSessions.delete(client.id);

      // Clean up provider session
      if (this.registry) {
        this.registry.endSession(session.sessionId).catch(() => {});
      }
    }
  }

  /**
   * WebRTC Signaling: Handle incoming offer from browser
   * Creates a real peer connection via WebRtcService.
   */
  @SubscribeMessage('webrtc:offer')
  async handleWebRTCOffer(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: { sdp: RTCSessionDescriptionInit; session_id?: string },
  ) {
    const session = this.activeSessions.get(client.id);
    if (!session) return { error: 'No active session' };

    this.logger.log(
      `WebRTC offer from ${session.deviceId} (session=${session.sessionId})`,
    );

    if (!this.webrtcService) {
      return { error: 'WebRTC not available' };
    }

    try {
      const answer = await this.webrtcService.createPeer(
        session.sessionId,
        data.sdp.sdp,
        // On incoming audio track — pipe to STT pipeline
        (receiver, streams) => {
          this.logger.log(
            `[WebRTC/${session.sessionId}] mic audio track received`,
          );
          // Phase 2: pipe track audio to Speaches STT
        },
        // On data channel — handle control messages
        (dc) => {
          this.logger.log(
            `[WebRTC/${session.sessionId}] data channel: ${dc.label}`,
          );
          dc.onmessage = (ev) => {
            try {
              const msg = JSON.parse(ev.data);
              this.logger.debug(
                `[WebRTC/${session.sessionId}] DC msg: ${msg.type}`,
              );
              if (msg.type === 'transcript') {
                // Forward to brain processing
                client.emit('voice:brain:reply', msg);
              }
            } catch {
              /* ignore non-JSON messages */
            }
          };
        },
      );

      return { type: 'answer', sdp: { type: 'answer', sdp: answer.sdp } };
    } catch (err) {
      this.logger.error(`WebRTC offer error: ${err}`);
      return { error: 'Failed to create WebRTC peer' };
    }
  }

  /**
   * WebRTC Signaling: Handle ICE candidates from browser
   */
  @SubscribeMessage('webrtc:ice-candidate')
  async handleICECandidate(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { candidate: RTCIceCandidateInit },
  ) {
    const session = this.activeSessions.get(client.id);
    if (!session) return { received: true };
    if (this.webrtcService) {
      await this.webrtcService.addIceCandidate(
        session.sessionId,
        data.candidate,
      );
    }
    return { received: true };
  }

  /**
   * Audio stream from browser (when using non-WebRTC audio)
   */
  @SubscribeMessage('audio:stream')
  async handleAudioStream(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { audio: Buffer; format: string },
  ) {
    const session = this.activeSessions.get(client.id);
    if (!session) {
      return { error: 'No active voice session' };
    }

    // Phase 2: stream audio to Deepgram STT for real-time transcription
    this.logger.debug(
      `Audio stream from ${session.deviceId}: ${data.audio.length} bytes`,
    );

    return { received: true };
  }

  /**
   * Text transcript from browser's STT
   * When final: call Brain API, stream TTS audio back
   */
  @SubscribeMessage('voice:transcript')
  async handleTranscript(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: { text: string; is_final: boolean; confidence?: number },
  ) {
    const session = this.activeSessions.get(client.id);
    if (!session) {
      return { error: 'No active voice session' };
    }

    if (!data.is_final) {
      // Interim result — broadcast to dashboard if needed
      return { received: true };
    }

    // Final transcript
    session.transcript.push(data.text);
    session.history.push({ role: 'user', content: data.text });

    this.logger.log(
      `Transcript (final) from ${session.deviceId}: ${data.text.substring(0, 50)}...`,
    );

    // Broadcast transcript to the session room
    this.server.to(`voice:${session.sessionId}`).emit('transcript', {
      text: data.text,
      confidence: data.confidence,
      is_final: true,
      timestamp: new Date().toISOString(),
    });

    // Process through Brain LLM + TTS
    await this.processBrainReply(client, session, data.text);

    return { received: true };
  }

  private buildConversationalSpokenReply(replyText: string): string {
    const normalized = replyText
      .replace(/```[\s\S]*?```/g, ' ')
      .replace(/[#*_`>-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (!normalized) return '';

    const sentences = normalized.match(/[^.!?¿¡]+[.!?]+/g) || [normalized];
    const firstSentence = (sentences[0] || normalized).trim();
    const secondSentence = (sentences[1] || '').trim();
    const candidate =
      firstSentence.length < 90 && secondSentence
        ? `${firstSentence} ${secondSentence}`
        : firstSentence;

    if (candidate.length <= 220) return candidate;

    const cut = candidate.slice(0, 220);
    const lastSpace = cut.lastIndexOf(' ');
    return `${cut.slice(0, lastSpace > 120 ? lastSpace : 220).trim()}…`;
  }

  private buildCallGreeting(context?: CallContext): string {
    const rawName = context?.teamName || context?.brandName || 'KELEDON';
    const name = rawName.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
    const lang = (context?.language || 'en-US').toLowerCase();
    if (lang.startsWith('es')) {
      return `Hola, soy ${name}. ¿En qué puedo ayudarte?`;
    }
    return `Hello, I'm ${name}. How can I help you?`;
  }

  private async speakVoiceText(
    client: Socket,
    session: VoiceSession,
    replyText: string,
    source: 'brain' | 'greeting',
  ): Promise<void> {
    if (!this.ttsService) {
      client.emit('voice:error', { error: 'TTS service not available' });
      return;
    }

    const spokenReplyText = this.buildConversationalSpokenReply(replyText);
    client.emit('voice:brain:reply', {
      text: replyText,
      apiVersion: getApiVersion(),
      source,
    });

    this.logger.log(
      `[v${getApiVersion()}] Voice speech source=${source} text="${replyText.substring(0, 80)}..." spokenChars=${spokenReplyText.length}`,
    );

    session.isSpeaking = true;
    if (!session.latencyTimestamps) session.latencyTimestamps = {};
    const latencyTimestamps = session.latencyTimestamps;
    latencyTimestamps.brainEnd = Date.now();

    let aborted = false;
    session.abortTTS = () => {
      aborted = true;
      void this.ttsService?.stop();
    };

    let ttsFirstChunkLogged = false;
    const startedAt = Date.now();
    const streamResult = await this.ttsService.speakStreaming(
      spokenReplyText || replyText,
      (chunkBase64) => {
        if (aborted) return;
        if (!ttsFirstChunkLogged) {
          ttsFirstChunkLogged = true;
          latencyTimestamps.ttsFirstChunk = Date.now();
        }
        client.emit('voice:audio', {
          audio: chunkBase64,
          sequence: 'chunk',
          format: 'mp3',
        });
      },
      {
        interruptible: true,
        teamId: session.context?.teamId,
        forceLanguageVoice: true,
      },
    );

    session.isSpeaking = false;
    session.abortTTS = () => {};
    session.latencyTimestamps.ttsComplete = Date.now();

    client.emit('voice:audio', {
      sequence: 'end',
      format: 'mp3',
      duration: streamResult.duration,
      voice: streamResult.voice,
      language: streamResult.language,
      ttsElapsedMs: streamResult.elapsedMs,
      apiVersion: getApiVersion(),
    });

    const firstAudioMs = session.latencyTimestamps.ttsFirstChunk
      ? session.latencyTimestamps.ttsFirstChunk - startedAt
      : -1;
    this.logger.log(
      `[v${getApiVersion()}] Voice speech done source=${source} firstAudio=${firstAudioMs}ms total=${Date.now() - startedAt}ms voice=${streamResult.voice || '?'} lang=${streamResult.language || '?'} spokenChars=${spokenReplyText.length}`,
    );
  }

  /**
   * Process a user message through the Brain LLM and stream TTS audio back
   */
  private async processBrainReply(
    client: Socket,
    session: VoiceSession,
    userMessage: string,
  ): Promise<void> {
    if (!this.llmService || !this.ttsService) {
      client.emit('voice:error', { error: 'Brain services not available' });
      return;
    }

    try {
      // 1. Tell the client the brain is thinking
      client.emit('voice:brain:thinking', { text: userMessage });

      // 2. Call the Brain chat API (same endpoint the web chat uses)
      //    This uses the same LLM config as the BrainController — fallback, provider, etc.
      const apiPort = process.env.PORT || 3001;
      const brainApiUrl = `http://localhost:${apiPort}/api/brain/chat`;
      const context = session.context;
      const authToken = client.handshake.auth?.token;
      const voiceModeMessage = [
        'VOICE MODE INSTRUCTION: Answer like a live phone conversation. Keep it brief: one short sentence unless the user explicitly asks for detail. Do not explain your reasoning. User said:',
        userMessage,
      ].join('\n');
      const brainPayload = {
        message: voiceModeMessage,
        companyId: context?.companyId,
        companyName: context?.companyName || 'Unspecified Company',
        brandId: context?.brandId,
        brandName: context?.brandName || 'Unspecified Brand',
        teamId: context?.teamId,
        teamName: context?.teamName || 'Unspecified Team',
        history: session.history.slice(-10).map((h) => ({
          role: h.role,
          content: h.content,
        })),
      };

      // Track brain latency
      if (!session.latencyTimestamps) session.latencyTimestamps = {};
      session.latencyTimestamps.brainStart = Date.now();

      const brainResponse = await fetch(brainApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        body: JSON.stringify(brainPayload),
      });

      if (!brainResponse.ok) {
        throw new Error(`Brain API returned ${brainResponse.status}`);
      }

      session.latencyTimestamps.brainEnd = Date.now();

      const brainData: any = await brainResponse.json();
      const replyText = brainData.reply?.trim() || '';
      const spokenReplyText = this.buildConversationalSpokenReply(replyText);

      session.history.push({ role: 'assistant', content: replyText });

      // 4. Tell client the brain's reply text (so UI can show it)
      client.emit('voice:brain:reply', {
        text: replyText,
        usage: brainData.usage,
        apiVersion: getApiVersion(),
      });

      this.logger.log(
        `[v${getApiVersion()}] Brain reply: "${replyText.substring(0, 50)}..." spoken="${spokenReplyText.substring(0, 80)}..." fullChars=${replyText.length} spokenChars=${spokenReplyText.length}`,
      );

      // 5. Stream TTS audio back
      session.isSpeaking = true;

      // Set up abort handler
      let aborted = false;
      session.abortTTS = () => {
        aborted = true;
        void this.ttsService?.stop();
      };

      // Send audio chunks as they arrive
      let ttsFirstChunkLogged = false;
      const streamResult = await this.ttsService.speakStreaming(
        spokenReplyText || replyText,
        (chunkBase64) => {
          if (aborted) return;
          if (!ttsFirstChunkLogged) {
            ttsFirstChunkLogged = true;
            session.latencyTimestamps.ttsFirstChunk = Date.now();
          }
          client.emit('voice:audio', {
            audio: chunkBase64,
            sequence: 'chunk',
            format: 'mp3',
          });
        },
        {
          interruptible: true,
          teamId: session.context?.teamId,
          forceLanguageVoice: true,
        },
      );

      // 6. Signal end of audio stream
      session.isSpeaking = false;
      session.abortTTS = () => {};
      session.latencyTimestamps.ttsComplete = Date.now();

      client.emit('voice:audio', {
        sequence: 'end',
        format: 'mp3',
        duration: streamResult.duration,
        voice: streamResult.voice,
        language: streamResult.language,
        ttsElapsedMs: streamResult.elapsedMs,
        apiVersion: getApiVersion(),
      });

      // Log latency metrics for this turn
      const ts = session.latencyTimestamps;
      const brainMs =
        ts.brainEnd && ts.brainStart ? ts.brainEnd - ts.brainStart : -1;
      const ttsFirstMs =
        ts.ttsFirstChunk && ts.brainEnd ? ts.ttsFirstChunk - ts.brainEnd : -1;
      const totalMs =
        ts.ttsComplete && ts.brainStart ? ts.ttsComplete - ts.brainStart : -1;
      this.logger.log(
        `[v${getApiVersion()}] Latency — brain=${brainMs}ms ttsFirst=${ttsFirstMs}ms total=${totalMs}ms ttsElapsed=${streamResult.elapsedMs ?? -1}ms voice=${streamResult.voice || '?'} lang=${streamResult.language || '?'} fullChars=${replyText.length} spokenChars=${spokenReplyText.length} | "${(spokenReplyText || replyText).substring(0, 40)}..."`,
      );

      this.logger.log(
        `[v${getApiVersion()}] Brain reply streamed: ${replyText.substring(0, 50)}... (${streamResult.audioData?.length || 0} bytes)`,
      );
    } catch (error) {
      this.logger.error('Brain reply error:', error);
      session.isSpeaking = false;
      session.abortTTS = () => {};
      client.emit('voice:error', { error: 'Failed to generate brain reply' });
    }
  }

  /**
   * Request TTS from cloud
   */
  @SubscribeMessage('voice:speak')
  async handleSpeak(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { text: string; interruptible?: boolean },
  ) {
    const session = this.activeSessions.get(client.id);
    if (!session) {
      return { error: 'No active voice session' };
    }

    this.logger.log(
      `[v${getApiVersion()}] TTS request from ${session.deviceId}: ${data.text.substring(0, 50)}... team=${session.context?.teamId || 'none'}`,
    );

    if (this.ttsService) {
      try {
        const result = await this.ttsService.speak(data.text, {
          interruptible: data.interruptible ?? true,
          teamId: session.context?.teamId,
          forceLanguageVoice: true,
        });

        if (result.audioData) {
          client.emit('voice:audio', {
            audio: result.audioData.toString('base64'),
            duration: result.duration,
            format: 'mp3',
            sequence: 'single',
          });

          return { success: true, duration: result.duration };
        }

        return { error: result.error || 'TTS failed' };
      } catch (error) {
        this.logger.error('TTS error:', error);
        return { error: 'TTS error' };
      }
    }

    return { error: 'TTS service not available' };
  }

  /**
   * Interrupt current brain speech
   */
  @SubscribeMessage('voice:interrupt')
  async handleInterrupt(@ConnectedSocket() client: Socket) {
    const session = this.activeSessions.get(client.id);
    if (!session) {
      return { error: 'No active voice session' };
    }

    if (session.isSpeaking) {
      this.logger.log(`Interrupting TTS for ${session.deviceId}`);
      session.abortTTS();
      session.isSpeaking = false;
      client.emit('voice:interrupted', {});
    }

    return { success: true };
  }

  // ── RPA ────────────────────────────────────────────────────────────

  /**
   * Execute RPA steps in the browser.
   * Browser calls this when the Cloud Brain sends ui_steps.
   */
  @SubscribeMessage('voice:rpa:execute')
  async handleRpaExecute(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: {
      steps: Array<{
        action: string;
        selector?: string;
        value?: string;
        url?: string;
        attribute?: string;
        ms?: number;
      }>;
    },
  ) {
    const session = this.activeSessions.get(client.id);
    if (!session) {
      return { error: 'No active voice session' };
    }

    this.logger.log(
      `[v${getApiVersion()}] RPA execute: ${data.steps.length} steps for ${session.deviceId}`,
    );

    // Forward to the browser for execution
    client.emit('voice:rpa:steps', { steps: data.steps });

    return { success: true, steps_count: data.steps.length };
  }

  /**
   * Receive RPA execution result from the browser.
   */
  @SubscribeMessage('voice:rpa:result')
  async handleRpaResult(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: {
      success: boolean;
      results: Array<{
        step_index: number;
        action: string;
        success: boolean;
        data?: unknown;
        error?: string;
      }>;
    },
  ) {
    const session = this.activeSessions.get(client.id);
    if (!session) {
      return { error: 'No active voice session' };
    }

    const successCount = data.results.filter((r) => r.success).length;
    this.logger.log(
      `[v${getApiVersion()}] RPA result: ${successCount}/${data.results.length} steps OK for ${session.deviceId}`,
    );

    // Store in session for context
    if (!session.transcript) session.transcript = [];
    session.transcript.push(
      `[RPA] ${data.results.length} steps, ${successCount} succeeded`,
    );

    return { success: true };
  }

  /**
   * Start a voice call with brain context
   */
  @SubscribeMessage('call:start')
  async handleCallStart(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: {
      session_id?: string;
      call_type?: string;
      context?: CallContext;
    },
  ) {
    const session = this.activeSessions.get(client.id);
    if (!session) {
      return { error: 'No session' };
    }

    session.sessionId = data.session_id || session.sessionId;
    session.context = data.context || {
      companyName: 'Unspecified Company',
      brandName: 'Unspecified Brand',
      teamName: 'Unspecified Team',
    };
    session.history = []; // Reset history for new call

    this.logger.log(
      `Call started: ${session.deviceId}, session: ${session.sessionId}, context: ${session.context?.companyName}/${session.context?.brandName}`,
    );

    // Create provider for this session if not already created and config is available
    const ctx = session.context;
    if (ctx?.teamId && this.configResolver && this.registry) {
      try {
        const config = await this.configResolver.resolveTeamConfig(ctx.teamId);
        config.authToken =
          (client.handshake.auth?.token as string) || undefined;
        await this.registry.getOrCreateProvider(session.sessionId, config);
        if (config.ttsProvider === 'speaches') {
          const warmupLang = (ctx.language || 'en').startsWith('es') ? 'es' : 'en';
          void this.ttsService
            ?.warmSpeachesForTeam(ctx.teamId, warmupLang)
            .catch((err) => {
              this.logger.warn(
                `Speaches warmup failed: ${err instanceof Error ? err.message : String(err)}`,
              );
            });
        }
        this.logger.log(
          `Provider configured for team ${ctx.teamId}: STT=${config.sttProvider} TTS=${config.ttsProvider}`,
        );
      } catch (err) {
        this.logger.warn(
          `Could not resolve provider config: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }

    client.join(`voice:${session.sessionId}`);

    this.server.emit('voice:call_started', {
      device_id: session.deviceId,
      session_id: session.sessionId,
      call_type: data.call_type || 'voice',
      context: session.context,
      timestamp: new Date().toISOString(),
    });

    const greeting = this.buildCallGreeting(session.context);
    session.history.push({ role: 'assistant', content: greeting });
    this.logger.log(
      `[v${getApiVersion()}] Call greeting queued session=${session.sessionId} text="${greeting}"`,
    );
    void this.speakVoiceText(client, session, greeting, 'greeting').catch(
      (err) => {
        this.logger.warn(
          `Call greeting failed: ${err instanceof Error ? err.message : String(err)}`,
        );
      },
    );

    return {
      success: true,
      session_id: session.sessionId,
    };
  }

  /**
   * End a voice call
   */
  @SubscribeMessage('call:end')
  async handleCallEnd(@ConnectedSocket() client: Socket) {
    const session = this.activeSessions.get(client.id);
    if (!session) {
      return { error: 'No active session' };
    }

    this.logger.log(
      `Call ended: ${session.deviceId}, session: ${session.sessionId}`,
    );

    // Abort any ongoing TTS
    if (session.isSpeaking) {
      session.abortTTS();
      session.isSpeaking = false;
    }

    const transcript = [...session.transcript];

    client.leave(`voice:${session.sessionId}`);

    this.server.emit('voice:call_ended', {
      device_id: session.deviceId,
      session_id: session.sessionId,
      transcript_length: transcript.length,
      duration: Date.now() - session.startedAt.getTime(),
      timestamp: new Date().toISOString(),
    });

    // Reset session for next call
    session.transcript = [];
    session.history = [];
    session.startedAt = new Date();

    return { success: true };
  }

  /**
   * Get active voice sessions
   */
  @SubscribeMessage('voice:sessions')
  handleGetSessions() {
    const sessions = Array.from(this.activeSessions.values()).map((s) => ({
      device_id: s.deviceId,
      session_id: s.sessionId,
      started_at: s.startedAt.toISOString(),
      transcript_length: s.transcript.length,
    }));

    return { sessions };
  }
}

export default VoiceGateway;
