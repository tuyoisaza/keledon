export interface TTSResult {
  audioData?: Buffer;
  duration?: number;
  error?: string;
  voice?: string;
  language?: 'es' | 'en' | 'other';
  elapsedMs?: number;
}
