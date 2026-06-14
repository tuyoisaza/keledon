export const voiceCorsOrigins: true | string[] =
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
  };
}

export interface VoiceCallEvents {
  'call:start': (session: VoiceSession) => void;
  'call:end': (session: VoiceSession, transcript: string[]) => void;
  transcript: (text: string, isFinal: boolean) => void;
}
