export enum Emotion {
  HAPPY = 'happy',
  SAD = 'sad',
  ANGRY = 'angry',
  NEUTRAL = 'neutral',
  EXCITED = 'excited',
  CALM = 'calm',
  CONFIDENT = 'confident',
  GENTLE = 'gentle'
}

export enum VoiceGender {
  MALE = 'male',
  FEMALE = 'female',
  CHILD = 'child'
}

export enum AudioQuality {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  ULTRA = 'ultra'
}

export enum AudioFormat {
  MP3 = 'mp3',
  WAV = 'wav',
  OGG = 'ogg',
  WEBM = 'webm',
  FLAC = 'flac'
}

export interface VoiceCharacteristics {
  pitch: number;           // -12 to +12 semitones
  speed: number;           // 0.5 to 2.0
  volume: number;          // 0 to 100
  warmth: number;          // 0 to 100
  clarity: number;         // 0 to 100
  breathiness: number;     // 0 to 100
}

export interface VoiceProfile {
  id: string;
  name: string;
  gender: VoiceGender;
  age?: number;
  accent?: string;
  characteristics: VoiceCharacteristics;
  emotion?: Emotion;
  language?: string;
  description?: string;
  samples?: AudioSample[];
  isCustom: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface AudioSample {
  id: string;
  voiceId: string;
  text: string;
  audioData: string;
  duration: number;
  format: AudioFormat;
  recordedAt: Date;
}

export interface EnhancedTTSOptions {
  text: string;
  voiceId?: string;
  emotion?: Emotion;
  speed?: number;           // 0.5 - 2.0
  pitch?: number;           // -12 to +12 semitones
  volume?: number;          // 0 - 100
  quality?: AudioQuality;
  format?: AudioFormat;
  ssml?: string;
  backgroundMusic?: {
    enabled: boolean;
    volume: number;         // 0 - 100
    type: 'ambient' | 'upbeat' | 'calm' | 'dramatic';
  };
  effects?: AudioEffects;
}

export interface AudioEffects {
  reverb?: {
    enabled: boolean;
    roomSize: number;       // 0 - 100
    damping: number;        // 0 - 100
  };
  echo?: {
    enabled: boolean;
    delay: number;          // 0 - 1000ms
    feedback: number;       // 0 - 90
  };
  chorus?: {
    enabled: boolean;
    rate: number;           // 0.1 - 5.0 Hz
    depth: number;          // 0 - 100
  };
}

export interface TTSResult {
  success: boolean;
  audioData: string;
  duration: number;
  format: AudioFormat;
  quality: AudioQuality;
  voice: VoiceProfile;
  emotion?: Emotion;
  wordTimings?: WordTiming[];
  metadata: {
    processingTime: number;
    characters: number;
    words: number;
    cacheHit: boolean;
    provider: 'enhanced-local';
  };
}

export interface WordTiming {
  word: string;
  startTime: number;        // milliseconds
  endTime: number;          // milliseconds
  confidence: number;       // 0 - 1
}

export interface BatchTTSRequest {
  items: EnhancedTTSOptions[];
  priority?: 'low' | 'normal' | 'high';
  callbackUrl?: string;
}

export interface BatchTTSResult {
  requestId: string;
  status: 'processing' | 'completed' | 'failed';
  results: TTSResult[];
  errors?: string[];
  totalProcessingTime: number;
}