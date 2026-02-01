export enum Language {
  ENGLISH_US = 'en-US',
  ENGLISH_UK = 'en-GB',
  SPANISH_ES = 'es-ES',
  SPANISH_MX = 'es-MX',
  FRENCH_FR = 'fr-FR',
  FRENCH_CA = 'fr-CA',
  GERMAN_DE = 'de-DE',
  ITALIAN_IT = 'it-IT',
  PORTUGUESE_BR = 'pt-BR',
  PORTUGUESE_PT = 'pt-PT',
  CHINESE_CN = 'zh-CN',
  CHINESE_TW = 'zh-TW',
  JAPANESE_JP = 'ja-JP',
  KOREAN_KR = 'ko-KR',
  RUSSIAN_RU = 'ru-RU',
  ARABIC_SA = 'ar-SA',
  HINDI_IN = 'hi-IN',
  DUTCH_NL = 'nl-NL',
  SWEDISH_SE = 'sv-SE',
  DANISH_DK = 'da-DK',
  NORWEGIAN_NO = 'no-NO',
  FINNISH_FI = 'fi-FI',
  POLISH_PL = 'pl-PL',
  TURKISH_TR = 'tr-TR'
}

export enum AudioQuality {
  FAST = 'fast',
  BALANCED = 'balanced',
  ACCURATE = 'accurate'
}

export enum AudioFormat {
  WAV = 'wav',
  MP3 = 'mp3',
  OGG = 'ogg',
  WEBM = 'webm',
  FLAC = 'flac',
  M4A = 'm4a'
}

export enum Emotion {
  HAPPY = 'happy',
  SAD = 'sad',
  ANGRY = 'angry',
  NEUTRAL = 'neutral',
  EXCITED = 'excited',
  CALM = 'calm',
  CONFIDENT = 'confident',
  GENTLE = 'gentle',
  ANXIOUS = 'anxious',
  TIRED = 'tired'
}

export interface EnhancedSTTOptions {
  audio: string | ArrayBuffer;
  language?: Language;
  accent?: string;
  quality?: AudioQuality;
  enableDiarization?: boolean;
  enableEmotion?: boolean;
  enableLanguageDetection?: boolean;
  noiseReduction?: boolean;
  speakerProfiles?: SpeakerProfile[];
  format?: AudioFormat;
  sampleRate?: number;
  channels?: number;
}

export interface STTResult {
  success: boolean;
  transcript: string;
  confidence: number;
  duration: number;
  language: Language;
  quality: AudioQuality;
  wordTimings?: WordTiming[];
  speakerSegments?: SpeakerSegment[];
  emotion?: EmotionData;
  audioQuality?: AudioQualityAssessment;
  metadata: {
    processingTime: number;
    characters: number;
    words: number;
    speakerCount?: number;
    detectedLanguage?: Language;
    noiseLevel?: number;
    volumeLevel?: number;
    provider: 'enhanced-local-stt';
  };
}

export interface WordTiming {
  word: string;
  startTime: number;        // milliseconds
  endTime: number;          // milliseconds
  confidence: number;       // 0 - 1
  speakerId?: string;
  emotion?: Emotion;
}

export interface SpeakerSegment {
  speakerId: string;
  speakerLabel: string;
  startTime: number;
  endTime: number;
  text: string;
  confidence: number;
  emotion?: Emotion;
  wordCount: number;
  duration: number;
}

export interface Speaker {
  id: string;
  label: string;
  confidence: number;
  duration: number;
  wordCount: number;
  characteristics?: VoiceCharacteristics;
  emotion?: Emotion;
  gender?: 'male' | 'female' | 'unknown';
  age?: 'child' | 'teen' | 'adult' | 'senior';
  accent?: string;
}

export interface SpeakerProfile {
  id: string;
  name: string;
  label?: string;
  audioSamples: AudioSample[];
  characteristics: VoiceCharacteristics;
  language: Language;
  accent?: string;
  emotion?: Emotion;
  isCustom: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface VoiceCharacteristics {
  pitch: number;           // -12 to +12 semitones
  speed: number;           // words per minute
    volume: number;          // 0 - 100
    warmth: number;          // 0 - 100
  clarity: number;         // 0 - 100
  breathiness: number;     // 0 - 100
  energy: number;          // 0 - 100
  monotonicity: number;    // 0 - 100 (0 = expressive, 100 = monotone)
}

export interface AudioSample {
  id: string;
  speakerId: string;
  text: string;
  audioData: string;
  duration: number;
  format: AudioFormat;
  sampleRate: number;
  recordedAt: Date;
}

export interface EmotionData {
  primary: Emotion;
  confidence: number;       // 0 - 1
  secondary?: Emotion;
  secondaryConfidence?: number;
  timeline?: EmotionSegment[];
  overall: {
    positive: number;       // 0 - 1
    negative: number;       // 0 - 1
    neutral: number;       // 0 - 1
    energetic: number;     // 0 - 1
    calm: number;          // 0 - 1
  };
}

export interface EmotionSegment {
  emotion: Emotion;
  startTime: number;
  endTime: number;
  confidence: number;
  text: string;
}

export interface LanguageDetection {
  detectedLanguage: Language;
  confidence: number;
  alternatives: LanguageAlternative[];
  accent?: string;
  dialect?: string;
  codeSwitching?: boolean;
  segments?: LanguageSegment[];
}

export interface LanguageAlternative {
  language: Language;
  confidence: number;
  accent?: string;
  dialect?: string;
}

export interface LanguageSegment {
  language: Language;
  startTime: number;
  endTime: number;
  confidence: number;
  text: string;
}

export interface AudioQualityAssessment {
  overallScore: number;       // 0 - 100
  clarity: number;            // 0 - 100
  noiseLevel: number;         // 0 - 100 (lower is better)
  volumeLevel: number;        // 0 - 100
  backgroundNoise: number;    // 0 - 100 (lower is better)
  speechToNoiseRatio: number; // in dB
  qualityIssues: QualityIssue[];
  recommendations: string[];
}

export interface QualityIssue {
  type: 'noise' | 'volume' | 'clipping' | 'silence' | 'distortion';
  severity: 'low' | 'medium' | 'high' | 'critical';
  startTime?: number;
  endTime?: number;
  description: string;
  recommendation: string;
}

export interface StreamingSTTOptions {
  sessionId: string;
  sampleRate: number;
  channels: number;
  format: AudioFormat;
  language?: Language;
  quality?: AudioQuality;
  chunkSize?: number;         // milliseconds
  enablePartialResults?: boolean;
  enableEmotion?: boolean;
  enableDiarization?: boolean;
  enableLanguageDetection?: boolean;
  speakerProfiles?: SpeakerProfile[];
  noiseReduction?: boolean;
}

export interface StreamingResult {
  sessionId: string;
  isFinal: boolean;
  transcript: string;
  confidence: number;
  partial?: boolean;
  speakerSegments?: SpeakerSegment[];
  emotion?: EmotionData;
  language?: Language;
  processingTime: number;
  audioDuration: number;
}

export interface BatchSTTRequest {
  items: EnhancedSTTOptions[];
  priority?: 'low' | 'normal' | 'high';
  callbackUrl?: string;
  enableParallel?: boolean;
}

export interface BatchSTTResult {
  requestId: string;
  status: 'processing' | 'completed' | 'failed';
  results: STTResult[];
  errors?: BatchError[];
  totalProcessingTime: number;
  parallelProcessing: boolean;
  itemCount: number;
  successCount: number;
  errorCount: number;
}

export interface BatchError {
  index: number;
  error: string;
  text?: string;
}

export interface SpeakerDiarizationOptions {
  audio: string | ArrayBuffer;
  maxSpeakers?: number;
  minSpeakerDuration?: number; // seconds
  enableEmotionDetection?: boolean;
  language?: Language;
  speakerProfiles?: SpeakerProfile[];
}

export interface SpeakerDiarizationResult {
  success: boolean;
  transcript: string;
  speakers: Speaker[];
  segments: SpeakerSegment[];
  confidence: number;
  speakerCount: number;
  emotion?: EmotionData;
  totalDuration: number;
  dominantLanguage?: Language;
  processingTime: number;
}