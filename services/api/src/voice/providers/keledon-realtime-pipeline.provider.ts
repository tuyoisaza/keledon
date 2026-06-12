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
  history: { role: 'user' | 'assistant'; content: string; timestamp?: string }[];
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
    if (config.sttProvider === 'speaches' || !config.sttProvider) {
      const adapter = new SpeachesSttAdapter();
      await adapter.initialize({
        baseUrl: (config as any).speachesApiUrl || process.env.SPEACHES_API_URL || 'https://speaches-production-c63f.up.railway.app',
        apiKey: (config as any).sttApiKey || process.env.SPEACHES_API_KEY || '',
        model: (config as any).sttModel || 'whisper-1',
      });
      this.sttAdapter = adapter;
    }

    // Initialize TTS adapter based on config
    if (config.ttsProvider === 'speaches' || config.ttsProvider === 'kokoro' || !config.ttsProvider) {
      const adapter = new SpeachesTtsAdapter(this.ttsService);
      await adapter.initialize({
        voice: config.voiceId,
        language: (config as any).language,
        teamId: (config as any).teamId,
      });
      this.ttsAdapter = adapter;
    }

    this.logger.log(`KeledonRealtimePipeline initialized: STT=${this.sttAdapter?.id || 'none'} TTS=${this.ttsAdapter?.id || 'none'}`);
  }

  async startSession(sessionId: string): Promise<void> {
    const session: SessionState = {
      sessionId,
      startedAt: new Date(),
      history: [],
      isSpeaking: false,
      lastActivity: new Date(),
    };
    this.sessions.set(sessionId, session);
    this.logger.log(`Session started: ${sessionId}`);
  }

  async stopSession(sessionId: string): Promise<void> {
    // Stop any active TTS
    if (this.ttsAdapter) {
      this.ttsAdapter.stop();
    }
    this.bargeIn.reset();
    this.sessions.delete(sessionId);
    this.logger.log(`Session stopped: ${sessionId}`);
  }

  /**
   * Receive audio input from the browser mic.
   * Sends to STT adapter, then to Brain, then streams TTS back.
   */
  async onAudioInput(audio: Buffer): Promise<void> {
    if (!this.sttAdapter) {
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
      const result = await this.sttAdapter.transcribe(audio, {
        language: (this.config as any).language || undefined,
      });
      session.sttLatencyMs = Date.now() - sttStart;

      if (!result.text || !result.isFinal) return;

      // Log the transcript
      this.logger.log(`[${sessionId}] STT: "${result.text.slice(0, 80)}" (conf=${result.confidence}, ${session.sttLatencyMs}ms)`);

      // Add to history
      session.history.push({ role: 'user', content: result.text, timestamp: new Date().toISOString() });

      // Process through Brain
      await this.processBrainReply(session, result.text);
    } catch (error) {
      this.lastError = `STT error: ${error instanceof Error ? error.message : String(error)}`;
      this.lastErrorAt = new Date().toISOString();
      this.logger.error(`[${sessionId}] STT error: ${this.lastError}`);
    }
  }

  /**
   * Speak a given text (from Cloud command 'say').
   */
  async speak(command: { text: string; interruptible?: boolean }): Promise<void> {
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
            const session = sessionId ? this.sessions.get(sessionId) : undefined;
            if (session) {
              session.ttsLatencyMs = Date.now() - ttsStart;
              session.history.push({ role: 'assistant', content: command.text, timestamp: new Date().toISOString() });
            }
          }
        },
      });
    } catch (error) {
      this.lastError = `TTS error: ${error instanceof Error ? error.message : String(error)}`;
      this.lastErrorAt = new Date().toISOString();
      this.logger.error(`TTS error: ${this.lastError}`);
    } finally {
      this.bargeIn.offInterrupt(interruptHandler);
      this.bargeIn.endSpeaking(sessionId || 'unknown');
    }
  }

  /**
   * Interrupt current operation (barge-in or system interrupt).
   */
  async interrupt(reason: string): Promise<void> {
    const sessionId = this.getCurrentSessionId();
    this.bargeIn.triggerInterrupt(reason, sessionId || undefined);
    if (this.ttsAdapter) this.ttsAdapter.stop();
    this.logger.log(`Interrupted: ${reason}`);
  }

  async destroy(): Promise<void> {
    this.destroyed = true;
    this.bargeIn.reset();
    this.sessions.clear();
    this.logger.log('Provider destroyed');
  }

  /**
   * Get current pipeline status for the Side Panel.
   */
  getStatus(): VoicePipelineStatus {
    const sttHealth: ProviderHealth = this.sttAdapter ? 'ready' : 'degraded';
    const ttsHealth: ProviderHealth = this.ttsAdapter ? 'ready' : 'degraded';
    const llmHealth: ProviderHealth = this.llmService ? 'ready' : 'initializing';

    const sessionId = this.getCurrentSessionId();
    const session = sessionId ? this.sessions.get(sessionId) : undefined;

    return {
      provider: this.id,
      initialized: this.initialized,
      stt: {
        id: this.sttAdapter?.id || 'none',
        health: sttHealth,
        name: this.sttAdapter?.id || 'not configured',
        detail: session?.sttLatencyMs ? `last: ${session.sttLatencyMs}ms` : undefined,
      },
      tts: {
        id: this.ttsAdapter?.id || 'none',
        health: ttsHealth,
        name: this.ttsAdapter?.id || 'not configured',
        detail: this.bargeIn.isSpeaking ? 'speaking' : session?.ttsLatencyMs ? `last: ${session.ttsLatencyMs}ms` : undefined,
      },
      llm: {
        id: 'brain',
        health: llmHealth,
        name: this.llmService ? 'Cloud Brain' : 'waiting',
        detail: session?.cloudLatencyMs ? `last: ${session.cloudLatencyMs}ms` : undefined,
      },
      vadEnabled: this.config.vadEnabled ?? true,
      bargeInEnabled: this.config.bargeInEnabled ?? true,
      activeSessionId: sessionId || undefined,
      timestamp: new Date().toISOString(),
      error: this.lastError ? { message: this.lastError, at: this.lastErrorAt! } : undefined,
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
      this.logger.warn('No LLM service — using fallback echo reply');
      await this.speak({ text: `I heard: ${userMessage}`, interruptible: true });
      return;
    }

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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(brainPayload),
      });

      session.cloudLatencyMs = Date.now() - cloudStart;

      if (!brainResponse.ok) {
        throw new Error(`Brain API returned ${brainResponse.status}`);
      }

      const brainData: any = await brainResponse.json();
      const replyText = brainData.reply?.trim() || '';

      if (!replyText) {
        this.logger.warn('Empty Brain reply');
        return;
      }

      this.logger.log(`[${session.sessionId}] Cloud → "${replyText.slice(0, 80)}" (${session.cloudLatencyMs}ms)`);

      // Speak the reply
      await this.speak({ text: replyText, interruptible: true });
    } catch (error) {
      this.logger.error(`Brain error: ${error instanceof Error ? error.message : String(error)}`);
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
