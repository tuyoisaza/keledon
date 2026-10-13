import { Logger } from '@nestjs/common';
import { Socket } from 'socket.io';
import { TTSService } from '../tts/tts.service';
import { LLMService } from '../llm/llm.service';
import { getApiVersion } from '../version';
import { VoiceSession } from './voice.types';
import { buildConversationalSpokenReply } from './voice-helpers';

export class VoiceBrainProcessor {
  constructor(
    private readonly ttsService: TTSService | undefined,
    private readonly llmService: LLMService | undefined,
    private readonly logger: Logger,
    private readonly getSession: (client: Socket) => Promise<VoiceSession | undefined>,
  ) {}

  async speakVoiceText(
    client: Socket,
    session: VoiceSession,
    replyText: string,
    source: 'brain' | 'greeting',
  ): Promise<void> {
    if (!this.ttsService) {
      client.emit('voice:error', { error: 'TTS service not available' });
      return;
    }

    const spokenReplyText = buildConversationalSpokenReply(replyText);
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
    if (streamResult.error) { client.emit('voice:error', { error: 'Configured TTS provider failed' }); return; }
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
  async processBrainReply(
    client: Socket,
    session: VoiceSession,
    userMessage: string,
  ): Promise<void> {
    if (!this.llmService || !this.ttsService) {
      client.emit('voice:error', { error: 'Brain services not available' });
      return;
    }

    const generation = session.callGeneration;
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
        voiceMode: true,
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
        signal: AbortSignal.timeout(20000),
      });

      if (!brainResponse.ok) {
        throw new Error(`Brain API returned ${brainResponse.status}`);
      }

      session.latencyTimestamps.brainEnd = Date.now();

      const brainData: any = await brainResponse.json();
      const replyText = brainData.reply?.trim() || '';
      const spokenReplyText = buildConversationalSpokenReply(replyText);

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

      if (!await this.getSession(client) || session.callGeneration !== generation) return;
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

      if (streamResult.error) throw new Error('Configured TTS provider failed');
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
}
