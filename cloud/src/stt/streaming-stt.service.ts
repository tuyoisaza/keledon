import { Injectable } from '@nestjs/common';
import { ConfigService } from '../config/config.service';
import {
  StreamingSTTOptions,
  StreamingResult,
  Language,
  AudioQuality,
  AudioFormat,
  SpeakerSegment,
  EmotionData,
  Emotion
} from './types/stt-types.interface';

interface StreamingSession {
  id: string;
  options: StreamingSTTOptions;
  startTime: number;
  lastActivity: number;
  totalAudioLength: number;
  accumulatedTranscript: string;
  lastPartialResult: string;
  confidence: number;
  isFinal: boolean;
  speakerSegments: SpeakerSegment[];
  emotion?: EmotionData;
  language?: Language;
}

@Injectable()
export class StreamingSTTService {
  constructor(private readonly configService: ConfigService) {
    this.activeSessions = new Map();
  }

  private activeSessions: Map<string, StreamingSession> = new Map();

  async createStreamingSession(options: StreamingSTTOptions): Promise<{ sessionId: string }> {
    const sessionId = this.generateSessionId();
    
    const session: StreamingSession = {
      id: sessionId,
      options,
      startTime: Date.now(),
      lastActivity: Date.now(),
      totalAudioLength: 0,
      accumulatedTranscript: '',
      lastPartialResult: '',
      confidence: 0,
      isFinal: false,
      speakerSegments: [],
      emotion: undefined,
      language: options.language
    };

    this.activeSessions.set(sessionId, session);
    
    console.log('[Streaming STT] Created session:', sessionId, {
      sampleRate: options.sampleRate,
      format: options.format,
      language: options.language
    });

    return { sessionId };
  }

  async processAudioChunk(sessionId: string, audioChunk: string | ArrayBuffer): Promise<StreamingResult> {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    const startTime = Date.now();
    
    try {
      // Update session activity
      session.lastActivity = Date.now();
      
      // Calculate chunk size
      const chunkSize = typeof audioChunk === 'string' ? 
        audioChunk.length : audioChunk.byteLength;
      session.totalAudioLength += chunkSize;

      // Process the audio chunk
      const chunkResult = await this.processChunk(audioChunk, session);
      
      // Update session state
      if (chunkResult.transcript) {
        if (session.options.enablePartialResults && chunkResult.partial) {
          session.lastPartialResult = chunkResult.transcript;
        } else {
          // Add to accumulated transcript if this is a final result
          if (session.accumulatedTranscript && !chunkResult.partial) {
            session.accumulatedTranscript += ' ' + chunkResult.transcript;
          } else {
            session.accumulatedTranscript = chunkResult.transcript;
          }
          
          session.lastPartialResult = '';
        }
      }

      // Update confidence (rolling average)
      session.confidence = (session.confidence * 0.8 + chunkResult.confidence * 0.2);

      // Update speaker segments if available
      if (chunkResult.speakerSegments) {
        session.speakerSegments.push(...chunkResult.speakerSegments);
      }

      // Update emotion if available
      if (chunkResult.emotion) {
        session.emotion = chunkResult.emotion;
      }

      // Update language if detected
      if (chunkResult.language) {
        session.language = chunkResult.language;
      }

      const result: StreamingResult = {
        sessionId,
        isFinal: chunkResult.isFinal,
        transcript: chunkResult.isFinal ? session.accumulatedTranscript : chunkResult.transcript,
        confidence: session.confidence,
        partial: chunkResult.partial,
        speakerSegments: chunkResult.speakerSegments,
        emotion: chunkResult.emotion,
        language: chunkResult.language,
        processingTime: Date.now() - startTime,
        audioDuration: session.totalAudioLength / (session.options.sampleRate * 2) // Rough estimate
      };

      console.log('[Streaming STT] Processed chunk:', {
        sessionId,
        isFinal: result.isFinal,
        partial: result.partial,
        transcriptLength: result.transcript.length,
        confidence: result.confidence,
        processingTime: result.processingTime
      });

      return result;
    } catch (error) {
      console.error('[Streaming STT] Error processing chunk:', error);
      throw error;
    }
  }

  async endSession(sessionId: string): Promise<StreamingResult> {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    console.log('[Streaming STT] Ending session:', sessionId);

    // Generate final result
    const finalResult: StreamingResult = {
      sessionId,
      isFinal: true,
      transcript: session.accumulatedTranscript || session.lastPartialResult,
      confidence: session.confidence,
      partial: false,
      speakerSegments: session.speakerSegments.length > 0 ? session.speakerSegments : undefined,
      emotion: session.emotion,
      language: session.language,
      processingTime: Date.now() - session.startTime,
      audioDuration: session.totalAudioLength / (session.options.sampleRate * 2)
    };

    // Clean up session
    this.activeSessions.delete(sessionId);

    console.log('[Streaming STT] Session ended:', {
      sessionId,
      totalDuration: finalResult.audioDuration,
      totalProcessingTime: finalResult.processingTime,
      finalTranscriptLength: finalResult.transcript.length
    });

    return finalResult;
  }

  getSessionStatus(sessionId: string): { active: boolean; info?: any } {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      return { active: false };
    }

    return {
      active: true,
      info: {
        sessionId,
        startTime: session.startTime,
        duration: Date.now() - session.startTime,
        totalAudioLength: session.totalAudioLength,
        currentTranscript: session.accumulatedTranscript || session.lastPartialResult,
        confidence: session.confidence,
        speakerSegments: session.speakerSegments.length,
        language: session.language,
        emotion: session.emotion
      }
    };
  }

  getActiveSessionCount(): number {
    return this.activeSessions.size;
  }

  async cleanupInactiveSessions(maxInactiveTime: number = 30 * 60 * 1000): Promise<void> {
    const now = Date.now();
    const inactiveSessions: string[] = [];

    for (const [sessionId, session] of this.activeSessions) {
      if (now - session.lastActivity > maxInactiveTime) {
        inactiveSessions.push(sessionId);
      }
    }

    for (const sessionId of inactiveSessions) {
      await this.endSession(sessionId);
    }

    if (inactiveSessions.length > 0) {
      console.log('[Streaming STT] Cleaned up inactive sessions:', inactiveSessions.length);
    }
  }

  private async processChunk(
    audioChunk: string | ArrayBuffer, 
    session: StreamingSession
  ): Promise<Partial<StreamingResult>> {
    // Mock chunk processing for Phase 4
    const chunkDuration = this.estimateChunkDuration(audioChunk, session.options);
    const shouldProduceResult = Math.random() > 0.7; // 30% chance to produce result
    const isPartial = session.options.enablePartialResults && Math.random() > 0.5;

    if (!shouldProduceResult) {
      return {
        isFinal: false,
        transcript: '',
        confidence: 0,
        partial: false
      };
    }

    // Generate mock transcript
    const mockWords = this.generateMockWords(session.language);
    const transcript = isPartial ? 
      mockWords.slice(0, Math.ceil(Math.random() * 3)).join(' ') + '...' :
      mockWords.join(' ');

    // Generate speaker segments if diarization is enabled
    let speakerSegments: SpeakerSegment[] = [];
    if (session.options.enableDiarization) {
      speakerSegments = this.generateMockSpeakerSegments(transcript, chunkDuration);
    }

    // Generate emotion if enabled
    let emotion: EmotionData | undefined;
    if (session.options.enableEmotion) {
      emotion = this.generateMockEmotion();
    }

    return {
      isFinal: !isPartial,
      transcript,
      confidence: 0.75 + Math.random() * 0.2, // 75-95% confidence
      partial: isPartial,
      speakerSegments: speakerSegments.length > 0 ? speakerSegments : undefined,
      emotion,
      language: session.language
    };
  }

  private estimateChunkDuration(audioChunk: string | ArrayBuffer, options: StreamingSTTOptions): number {
    const chunkSize = typeof audioChunk === 'string' ? 
      audioChunk.length : audioChunk.byteLength;
    
    // Rough duration estimate based on chunk size and sample rate
    const bytesPerSecond = options.sampleRate * 2; // 16-bit audio
    return chunkSize / bytesPerSecond * 1000; // Convert to milliseconds
  }

  private generateMockWords(language?: Language): string[] {
    const mockWordsByLanguage: Record<Language, string[]> = {
      [Language.ENGLISH_US]: [
        'hello', 'this', 'is', 'a', 'test', 'streaming', 'speech', 'recognition',
        'the', 'weather', 'is', 'beautiful', 'today', 'perfect', 'for', 'activities',
        'can', 'you', 'help', 'me', 'with', 'automated', 'workflow', 'processes'
      ],
      [Language.SPANISH_ES]: [
        'hola', 'esto', 'es', 'una', 'prueba', 'reconocimiento', 'voz',
        'el', 'clima', 'está', 'hermoso', 'hoy', 'perfecto', 'actividades'
      ],
      [Language.FRENCH_FR]: [
        'bonjour', 'ceci', 'est', 'un', 'test', 'reconnaissance', 'vocale',
        'le', 'temps', 'est', 'magnifique', 'aujourd\'hui', 'parfait', 'activités'
      ],
      [Language.GERMAN_DE]: [
        'hallo', 'dies', 'ist', 'ein', 'test', 'spracherkennung',
        'das', 'wetter', 'ist', 'wunderschön', 'heute', 'perfekt', 'aktivitäten'
      ],
      [Language.CHINESE_CN]: [
        '你好', '这是', '一个', '测试', '语音', '识别', '系统',
        '今天', '天气', '很', '美', '非常', '适合', '活动'
      ],
      [Language.JAPANESE_JP]: [
        'こんにちは', 'これは', '強化', '音声', '認識', 'システム',
        '今日', '天気', '美しい', '完璧', '活動'
      ]
    };

    const words = mockWordsByLanguage[language || Language.ENGLISH_US] || 
                 mockWordsByLanguage[Language.ENGLISH_US];

    // Return 3-7 random words
    const wordCount = Math.floor(Math.random() * 5) + 3;
    const selectedWords: string[] = [];
    
    for (let i = 0; i < wordCount; i++) {
      selectedWords.push(words[Math.floor(Math.random() * words.length)]);
    }

    return selectedWords;
  }

  private generateMockSpeakerSegments(transcript: string, duration: number): SpeakerSegment[] {
    if (duration < 500) return []; // Don't create segments for very short chunks

    const segmentCount = Math.floor(Math.random() * 2) + 1; // 1-2 segments
    const words = transcript.split(' ');
    const segments: SpeakerSegment[] = [];

    for (let i = 0; i < segmentCount; i++) {
      const wordCount = Math.ceil(words.length / segmentCount);
      const startIdx = i * wordCount;
      const endIdx = Math.min(startIdx + wordCount, words.length);
      
      if (startIdx < words.length) {
        const segmentWords = words.slice(startIdx, endIdx);
        const segmentText = segmentWords.join(' ');
        const startTime = (duration / segmentCount) * i;
        const endTime = Math.min(startTime + duration / segmentCount, duration);

        segments.push({
          speakerId: `speaker_${i % 2 + 1}`, // Alternate between speaker_1 and speaker_2
          speakerLabel: `Speaker ${String.fromCharCode(65 + (i % 2))}`,
          startTime,
          endTime,
          text: segmentText,
          confidence: 0.70 + Math.random() * 0.25,
          emotion: this.getRandomEmotion(),
          wordCount: segmentWords.length,
          duration: endTime - startTime
        });
      }
    }

    return segments;
  }

  private generateMockEmotion(): EmotionData {
    const emotions = Object.values(Emotion);
    const primary = emotions[Math.floor(Math.random() * emotions.length)];
    const secondary = emotions[Math.floor(Math.random() * emotions.length)];

    return {
      primary,
      confidence: 0.6 + Math.random() * 0.3,
      secondary,
      secondaryConfidence: 0.3 + Math.random() * 0.2,
      overall: {
        positive: Math.random() * 0.8,
        negative: Math.random() * 0.3,
        neutral: 0.3 + Math.random() * 0.4,
        energetic: Math.random() * 0.7,
        calm: Math.random() * 0.6
      }
    };
  }

  private getRandomEmotion(): Emotion {
    const emotions = Object.values(Emotion);
    return emotions[Math.floor(Math.random() * emotions.length)];
  }

  private generateSessionId(): string {
    return `stream_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Periodic cleanup of inactive sessions
  startCleanupTimer(intervalMs: number = 5 * 60 * 1000): void {
    setInterval(() => {
      this.cleanupInactiveSessions();
    }, intervalMs);
    
    console.log('[Streaming STT] Cleanup timer started - checking every', intervalMs / 1000 / 60, 'minutes');
  }
}