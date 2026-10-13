import { Logger } from '@nestjs/common';
import type { Socket } from 'socket.io';
import type { PrismaService } from '../prisma/prisma.service';
import { transcribeConfiguredAudio } from './providers/configured-stt';
import type { ProviderConfigResolver } from './providers/provider-config.resolver';
import type { WebRtcService } from './webrtc/webrtc.service';
import type { VoiceSession } from './voice.types';
import { getAuthorizedVoiceSession } from './voice-session-access';

interface TranscriptInput {
  text: string;
  is_final: boolean;
  confidence?: number;
}

export class VoiceWebRtcHandlers {
  constructor(
    private readonly prisma: PrismaService | undefined,
    private readonly sessions: Map<string, VoiceSession>,
    private readonly logger: Logger,
    private readonly configResolver: ProviderConfigResolver | undefined,
    private readonly webrtcService: WebRtcService | undefined,
    private readonly handleTranscript: (
      client: Socket,
      data: TranscriptInput,
    ) => Promise<unknown>,
  ) {}

  async handleOffer(
    client: Socket,
    data: { sdp: RTCSessionDescriptionInit; session_id?: string },
  ) {
    const session = await getAuthorizedVoiceSession(
      this.prisma,
      this.sessions,
      client,
    );
    if (!session) return { error: 'No active session' };
    this.logger.log(
      `WebRTC offer from ${session.deviceId} (session=${session.sessionId})`,
    );
    if (!this.webrtcService) return { error: 'WebRTC not available' };

    try {
      const answer = await this.webrtcService.createPeer(
        session.sessionId,
        data.sdp.sdp,
        (receiver, _streams) => {
          this.logger.log(
            `[WebRTC/${session.sessionId}] mic audio track received`,
          );
          this.webrtcService.attachAudioReceiver(
            session.sessionId,
            receiver,
            async (wav) => {
              const callGeneration = session.callGeneration;
              if (
                !(await getAuthorizedVoiceSession(
                  this.prisma,
                  this.sessions,
                  client,
                ))
              )
                throw new Error('Device authorization revoked');
              if (process.env.KELEDON_VOICE_DISABLED === 'true')
                throw new Error('Voice disabled');
              const config = await this.configResolver.resolveTeamConfig(
                session.context.teamId,
              );
              const result = await transcribeConfiguredAudio(
                config,
                wav,
                session.context.language,
              );
              if (
                this.sessions.get(client.id) !== session ||
                session.callGeneration !== callGeneration
              )
                return;
              if (result.text && result.isFinal) {
                await this.handleTranscript(client, {
                  text: result.text,
                  is_final: true,
                  confidence: result.confidence,
                });
              }
            },
            (error) => client.emit('voice:error', { error }),
          );
        },
        (dataChannel) => {
          this.logger.log(
            `[WebRTC/${session.sessionId}] data channel: ${dataChannel.label}`,
          );
          dataChannel.onmessage = (event) => {
            try {
              const message = JSON.parse(event.data);
              this.logger.debug(
                `[WebRTC/${session.sessionId}] DC msg: ${message.type}`,
              );
              if (message.type === 'transcript') {
                void this.handleTranscript(client, {
                  text: message.text,
                  is_final: message.is_final === true,
                  confidence: message.confidence,
                });
              }
            } catch {
              /* ignore non-JSON messages */
            }
          };
        },
      );
      return { type: 'answer', sdp: { type: 'answer', sdp: answer.sdp } };
    } catch (error) {
      this.logger.error(`WebRTC offer error: ${error}`);
      return { error: 'Failed to create WebRTC peer' };
    }
  }

  async handleIceCandidate(
    client: Socket,
    data: { candidate: RTCIceCandidateInit },
  ) {
    const session = await getAuthorizedVoiceSession(
      this.prisma,
      this.sessions,
      client,
    );
    if (session)
      await this.webrtcService?.addIceCandidate(
        session.sessionId,
        data.candidate,
      );
    return { received: true };
  }

  async handleAudioStream(
    client: Socket,
    data: { audio: Buffer; format: string },
  ) {
    const session = await getAuthorizedVoiceSession(
      this.prisma,
      this.sessions,
      client,
    );
    if (!session) return { error: 'No active voice session' };
    this.logger.debug(
      `Audio stream from ${session.deviceId}: ${data.audio.length} bytes`,
    );
    return { received: true };
  }

  async interrupt(client: Socket) {
    const session = await getAuthorizedVoiceSession(
      this.prisma,
      this.sessions,
      client,
    );
    if (!session) return { error: 'No active session' };
    if (session.isSpeaking) {
      this.logger.log(`Interrupting TTS for ${session.deviceId}`);
      session.abortTTS();
      session.isSpeaking = false;
      client.emit('voice:interrupted', {});
    }
    return { success: true };
  }
}
