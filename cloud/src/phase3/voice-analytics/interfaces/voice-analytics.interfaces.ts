export interface AudioBuffer {
  data: Float32Array;
  sampleRate: number;
  channels: number;
  duration: number;
}

export interface VoiceSegment {
  id: string;
  startTime: number;
  endTime: number;
  confidence: number;
  text?: string;
  speaker?: string;
  emotion?: EmotionAnalysis;
  language?: string;
}

export interface EmotionAnalysis {
  primary: 'neutral' | 'happy' | 'sad' | 'angry' | 'fear' | 'surprise' | 'disgust';
  confidence: number;
  arousal: number;
  valence: number;
  secondary?: string;
}

export interface SpeechRecognitionResult {
  transcript: string;
  confidence: number;
  alternatives: Array<{
    transcript: string;
    confidence: number;
  }>;
  words?: Array<{
    word: string;
    start: number;
    end: number;
    confidence: number;
  }>;
}

export interface VoiceAnalyticsConfig {
  sampleRate: number;
  chunkSize: number;
  overlapRatio: number;
  silenceThreshold: number;
  minSegmentDuration: number;
  maxSegmentDuration: number;
  language: string;
  enableEmotionDetection: boolean;
  enableSpeakerDiarization: boolean;
}

export interface VoiceCommand {
  intent: string;
  entities: Record<string, any>;
  confidence: number;
  originalText: string;
  timestamp: Date;
}

export interface AudioProcessingContext {
  sessionId: string;
  userId?: string;
  audioId: string;
  config: VoiceAnalyticsConfig;
  metadata: Record<string, any>;
}