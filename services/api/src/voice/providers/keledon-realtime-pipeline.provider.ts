import { transcribeConfiguredAudio } from './configured-stt';
import { Injectable, Logger } from '@nestjs/common';
import { TTSService } from '../../tts/tts.service';
import { LLMService } from '../../llm/llm.service';
import {
  VoiceProvider,
  VoiceProviderConfig,
  VoicePipelineStatus,
  ProviderHealth,
} from './voice-provider.interface';
import { SttAdapter } from './stt/stt-adapter.interface';
import { SpeachesSttAdapter } from './stt/speaches-stt.adapter';
import { TtsAdapter } from './tts/tts-adapter.interface';
import { SpeachesTtsAdapter } from './tts/speaches-tts.adapter';
import { BargeInController } from './barge-in/barge-in.controller';

export interface SessionState {
  sessionId: string;
  startedAt: Date;
  history: {
    role: 'user' | 'assistant';
    content: string;
    timestamp?: string;
  }[];
  isSpeaking: boolean;
  lastActivity: Date;
  sttLatencyMs?: number;
  ttsLatencyMs?: number;
  cloudLatencyMs?: number;
}

/**
 * KeledonRealtimePipelineProvider
 *
 * The conversational voice provider that implements the full pipeline:
 *   Mic → VAD → STT → text_input → Cloud Brain → say → TTS → playback
 *
 * Implements VoiceProvider interface and is selectable per team via config.
 * Supports barge-in, latency tracking, and real-time status reporting.
 */
@Injectable()
export class KeledonRealtimePipelineProvider implements VoiceProvider {
  readonly id = 'keledon-realtime-pipeline';
  private readonly logger = new Logger(KeledonRealtimePipelineProvider.name);

  private initialized = false;
  private config!: VoiceProviderConfig;
  private sessions = new Map<string, SessionState>();
  private sttAdapter: SttAdapter | null = null;
  private ttsAdapter: TtsAdapter | null = null;
  private readonly bargeIn = new BargeInController();
  private destroyed = false;
  private lastError: string | null = null;
  private lastErrorAt: string | null = null;

  constructor(
    private readonly ttsService: TTSService,
    private readonly llmService?: LLMService,
  ) {}

  async initialize(config: VoiceProviderConfig): Promise<void> {
    this.config = config;
    this.initialized = true;

    // Initialize STT adapter based on config
    if (config.sttProvider === 'speaches') {
      if (!config.speachesApiUrl)
        throw new Error('Configured Speaches endpoint required');
      const adapter = new SpeachesSttAdapter();
      await adapter.initialize({
        baseUrl: config.speachesApiUrl,
        apiKey: config.sttApiKey || '',
        model: (config as any).sttModel || 'whisper-1',
      });
      this.sttAdapter = adapter;
    }

    // Initialize TTS adapter based on config
    if (
      ['speaches', 'kokoro', 'elevenlabs', 'openai'].includes(
        config.ttsProvider,
      )
    ) {
      const adapter = new SpeachesTtsAdapter(this.ttsService);
      await adapter.initialize({
        voice: config.voiceId,
        providerId: config.ttsProvider,
        language: (config as any).language,
        teamId: (config as any).teamId,
      });
      this.ttsAdapter = adapter;
    }

    this.logger.log(
      `KeledonRealtimePipeline initialized: STT=${this.sttAdapter?.id || 'none'} TTS=${this.ttsAdapter?.id || 'none'}`,
    );
  }

  startSession(sessionId: string): Promise<void> {
    const session: SessionState = {
      sessionId,
      startedAt: new Date(),
      history: [],
      isSpeaking: false,
      lastActivity: new Date(),
    };
    this.sessions.set(sessionId, session);
    this.logger.log(`Session started: ${sessionId}`);
    return Promise.resolve();
  }

  stopSession(sessionId: string): Promise<void> {
    // Stop any active TTS
    if (this.ttsAdapter) this.ttsAdapter.stop();
    this.bargeIn.reset();
    this.sessions.delete(sessionId);
    this.logger.log(`Session stopped: ${sessionId}`);
    return Promise.resolve();
  }

  /**
   * Receive audio input from the browser mic.
   * Sends to STT adapter, then to Brain, then streams TTS back.
   */
  async onAudioInput(audio: Buffer): Promise<void> {
    if (!['speaches', 'deepgram'].includes(this.config.sttProvider)) {
      this.logger.warn('No STT adapter available');
      return;
    }

    const sessionId = this.getCurrentSessionId();
    const session = sessionId ? this.sessions.get(sessionId) : undefined;
    if (!session) return;

    // If currently speaking, trigger barge-in
    if (this.bargeIn.isSpeaking) {
      this.bargeIn.triggerInterrupt('user_speech', sessionId);
      if (this.ttsAdapter) this.ttsAdapter.stop();
    }

    const sttStart = Date.now();

    try {
      const result = await transcribeConfiguredAudio(
        this.config,
        audio,
        this.config.language,
      );
      session.sttLatencyMs = Date.now() - sttStart;

      if (!result.text || !result.isFinal) return;

      this.logger.log(
        `[${sessionId}] STT transcript received (${result.text.length} characters, conf=${result.confidence}, ${session.sttLatencyMs}ms)`,
      );

      // Add to history
      session.history.push({
        role: 'user',
        content: result.text,
        timestamp: new Date().toISOString(),
      });

      // Process through Brain
      await this.processBrainReply(session, result.text);
    } catch {
      this.lastError = 'STT provider request failed';
      this.lastErrorAt = new Date().toISOString();
      this.logger.error(`[${sessionId}] STT provider request failed`);
    }
  }

  /**
   * Speak a given text (from Cloud command 'say').
   */
  async speak(command: {
    text: string;
    interruptible?: boolean;
  }): Promise<void> {
    if (!this.ttsAdapter) {
      this.logger.warn('No TTS adapter available');
      return;
    }

    const sessionId = this.getCurrentSessionId();

    this.bargeIn.startSpeaking(sessionId || 'unknown');

    // Listen for interrupts during playback
    const interruptHandler = () => {
      this.ttsAdapter?.stop();
    };
    this.bargeIn.onInterrupt(interruptHandler);

    const ttsStart = Date.now();

    try {
      await this.ttsAdapter.speak(command.text, {
        interruptible: command.interruptible ?? true,
        onChunk: (chunk) => {
          if (chunk.sequence === 'end') {
            const session = sessionId
              ? this.sessions.get(sessionId)
              : undefined;
            if (session) {
              session.ttsLatencyMs = Date.now() - ttsStart;
              session.history.push({
                role: 'assistant',
                content: command.text,
                timestamp: new Date().toISOString(),
              });
            }
          }
        },
      });
    } catch {
      this.lastError = 'TTS provider request failed';
      this.lastErrorAt = new Date().toISOString();
      this.logger.error('TTS provider request failed');
    } finally {
      this.bargeIn.offInterrupt(interruptHandler);
      this.bargeIn.endSpeaking(sessionId || 'unknown');
    }
  }

  /**
   * Interrupt current operation (barge-in or system interrupt).
   */
  interrupt(reason: string): Promise<void> {
    const sessionId = this.getCurrentSessionId();
    this.bargeIn.triggerInterrupt(reason, sessionId || undefined);
    if (this.ttsAdapter) this.ttsAdapter.stop();
    this.logger.log(`Interrupted: ${reason}`);
    return Promise.resolve();
  }

  destroy(): Promise<void> {
    this.destroyed = true;
    this.bargeIn.reset();
    this.sessions.clear();
    this.logger.log('Provider destroyed');
    return Promise.resolve();
  }

  /**
   * Get current pipeline status for the Side Panel.
   */
  getStatus(): VoicePipelineStatus {
    const sessionId = this.getCurrentSessionId();
    const session = sessionId ? this.sessions.get(sessionId) : undefined;
    const serverStt = ['speaches', 'deepgram'].includes(
      this.config.sttProvider,
    );
    const sttHealth: ProviderHealth = !serverStt
      ? 'degraded'
      : this.lastError?.startsWith('STT')
        ? 'error'
        : session?.sttLatencyMs
          ? 'ready'
          : 'unknown';
    const ttsHealth: ProviderHealth = !this.ttsAdapter
      ? 'degraded'
      : this.lastError?.startsWith('TTS')
        ? 'error'
        : session?.ttsLatencyMs
          ? 'ready'
          : 'unknown';
    const llmHealth: ProviderHealth = this.lastError?.startsWith('Brain')
      ? 'error'
      : !this.llmService
        ? 'degraded'
        : session?.cloudLatencyMs
          ? 'ready'
          : 'unknown';

    return {
      provider: this.id,
      initialized: this.initialized,
      stt: {
        id: serverStt ? this.config.sttProvider : 'none',
        health: sttHealth,
        name: serverStt ? this.config.sttProvider : 'not configured',
        detail: session?.sttLatencyMs
          ? `last: ${session.sttLatencyMs}ms`
          : undefined,
      },
      tts: {
        id: this.ttsAdapter?.id || 'none',
        health: ttsHealth,
        name: this.ttsAdapter?.id || 'not configured',
        detail: this.bargeIn.isSpeaking
          ? 'speaking'
          : session?.ttsLatencyMs
            ? `last: ${session.ttsLatencyMs}ms`
            : undefined,
      },
      llm: {
        id: 'brain',
        health: llmHealth,
        name: this.llmService ? 'Cloud Brain' : 'waiting',
        detail: session?.cloudLatencyMs
          ? `last: ${session.cloudLatencyMs}ms`
          : undefined,
      },
      vadEnabled: this.config.vadEnabled ?? true,
      bargeInEnabled: this.config.bargeInEnabled ?? true,
      activeSessionId: sessionId || undefined,
      timestamp: new Date().toISOString(),
      error: this.lastError
        ? { message: this.lastError, at: this.lastErrorAt }
        : undefined,
    };
  }

  /**
   * Process a user message through the Cloud Brain and stream TTS response.
   */
  private async processBrainReply(
    session: SessionState,
    userMessage: string,
  ): Promise<void> {
    if (!this.llmService) {
      this.lastError = 'Brain unavailable: LLM service is not configured';
      this.lastErrorAt = new Date().toISOString();
      this.logger.error(this.lastError);
      await this.speak({
        text: 'The AI service is temporarily unavailable. Please try again later.',
        interruptible: true,
      });
      return;
    }

    this.lastError = null;
    this.lastErrorAt = null;

    const cloudStart = Date.now();

    try {
      // Call the Brain via the same endpoint as the web chat
      const apiPort = process.env.PORT || 3001;
      const brainApiUrl = `http://localhost:${apiPort}/api/brain/chat`;
      const voiceModeMessage = [
        'VOICE MODE INSTRUCTION: Answer like a live phone conversation. Keep it brief: one short sentence unless the user explicitly asks for detail. Do not explain your reasoning. User said:',
        userMessage,
      ].join('\n');
      const brainPayload = {
        message: voiceModeMessage,
        voiceMode: true,
        companyId: (this.config as any).companyId,
        companyName: (this.config as any).companyName || 'Unspecified Company',
        brandId: (this.config as any).brandId,
        brandName: (this.config as any).brandName || 'Unspecified Brand',
        teamId: (this.config as any).teamId,
        teamName: (this.config as any).teamName || 'Unspecified Team',
        history: session.history.slice(-10).map((h) => ({
          role: h.role,
          content: h.content,
        })),
      };

      const brainResponse = await fetch(brainApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.config.authToken
            ? { Authorization: `Bearer ${this.config.authToken}` }
            : {}),
        },
        body: JSON.stringify(brainPayload),
        signal: AbortSignal.timeout(20000),
      });

      session.cloudLatencyMs = Date.now() - cloudStart;

      if (!brainResponse.ok) {
        throw new Error(`Brain API returned ${brainResponse.status}`);
      }

      const brainData: any = await brainResponse.json();
      const replyText = brainData.reply?.trim() || '';

      if (!replyText) {
        this.lastError = 'Brain returned an empty response';
        this.lastErrorAt = new Date().toISOString();
        this.logger.error(this.lastError);
        return;
      }

      this.logger.log(
        `[${session.sessionId}] Cloud reply received (${replyText.length} characters, ${session.cloudLatencyMs}ms)`,
      );

      // Speak the reply
      await this.speak({ text: replyText, interruptible: true });
    } catch {
      // Provider errors may embed URLs or credentials; status and diagnostics
      // expose only a bounded, non-sensitive message.
      this.lastError = 'Brain error: request failed';
      this.lastErrorAt = new Date().toISOString();
      this.logger.error(this.lastError);
      await this.speak({
        text: 'The AI service could not process that request. Please try again later.',
        interruptible: true,
      });
    }
  }

  private getCurrentSessionId(): string | null {
    // Return the most recently started session
    const sessions = Array.from(this.sessions.values());
    if (sessions.length === 0) return null;
    sessions.sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime());
    return sessions[0].sessionId;
  }
}
