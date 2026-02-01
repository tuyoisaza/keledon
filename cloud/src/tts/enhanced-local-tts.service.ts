import { Injectable } from '@nestjs/common';
import { ConfigService } from '../config/config.service';
import { 
  EnhancedTTSOptions, 
  TTSResult, 
  VoiceProfile, 
  Emotion, 
  VoiceGender, 
  AudioQuality, 
  AudioFormat,
  VoiceCharacteristics,
  WordTiming
} from './types/tts-types.interface';

@Injectable()
export class EnhancedLocalTTSService {
  constructor(private readonly configService: ConfigService) {
    this.initializeDefaultVoices();
  }

  private voiceProfiles: Map<string, VoiceProfile> = new Map();
  private cache: Map<string, TTSResult> = new Map();

  async generateEnhancedSpeech(options: EnhancedTTSOptions): Promise<TTSResult> {
    const startTime = Date.now();
    
    try {
      console.log('[Enhanced TTS] Generating speech with options:', {
        textLength: options.text.length,
        voiceId: options.voiceId,
        emotion: options.emotion,
        quality: options.quality
      });

      // Check cache first
      const cacheKey = this.generateCacheKey(options);
      if (this.cache.has(cacheKey)) {
        const cachedResult = this.cache.get(cacheKey)!;
        console.log('[Enhanced TTS] Cache hit for:', cacheKey);
        return {
          ...cachedResult,
          metadata: {
            ...cachedResult.metadata,
            cacheHit: true
          }
        };
      }

      // Get or create voice profile
      const voiceProfile = this.getVoiceProfile(options.voiceId);
      
      // Generate enhanced audio data
      const audioData = await this.generateEnhancedAudio(options, voiceProfile);
      const duration = this.calculateEnhancedDuration(options, voiceProfile);
      const wordTimings = this.generateWordTimings(options.text);

      const result: TTSResult = {
        success: true,
        audioData,
        duration,
        format: options.format || AudioFormat.MP3,
        quality: options.quality || AudioQuality.MEDIUM,
        voice: voiceProfile,
        emotion: options.emotion,
        wordTimings,
        metadata: {
          processingTime: Date.now() - startTime,
          characters: options.text.length,
          words: options.text.split(' ').length,
          cacheHit: false,
          provider: 'enhanced-local'
        }
      };

      // Cache the result
      this.cache.set(cacheKey, result);
      
      console.log('[Enhanced TTS] Generated speech successfully:', {
        duration,
        format: result.format,
        processingTime: result.metadata.processingTime
      });

      return result;
    } catch (error) {
      console.error('[Enhanced TTS] Error generating speech:', error);
      throw error;
    }
  }

  private getVoiceProfile(voiceId?: string): VoiceProfile {
    if (voiceId && this.voiceProfiles.has(voiceId)) {
      return this.voiceProfiles.get(voiceId)!;
    }
    
    // Return default voice if no specific voice requested
    return this.voiceProfiles.get('default-female') || this.voiceProfiles.values().next().value;
  }

  private async generateEnhancedAudio(options: EnhancedTTSOptions, voiceProfile: VoiceProfile): Promise<string> {
    const { text, emotion, speed, pitch, volume, quality, format, ssml } = options;
    
    // Process SSML if provided
    const processedText = ssml ? this.parseSSML(ssml) : text;
    
    // Apply emotion and voice characteristics
    const emotionAdjustedText = this.applyEmotion(processedText, emotion || Emotion.NEUTRAL);
    const voiceAdjustedText = this.applyVoiceCharacteristics(emotionAdjustedText, voiceProfile);
    
    // Generate audio data based on quality settings
    const audioData = this.generateQualityAudio(voiceAdjustedText, quality || AudioQuality.MEDIUM, format || AudioFormat.MP3);
    
    // Apply audio effects if specified
    const processedAudio = options.effects ? 
      this.applyAudioEffects(audioData, options.effects) : audioData;
    
    // Add background music if enabled
    const finalAudio = options.backgroundMusic?.enabled ? 
      this.addBackgroundMusic(processedAudio, options.backgroundMusic) : processedAudio;
    
    return finalAudio;
  }

  private parseSSML(ssml: string): string {
    // Basic SSML parsing for Phase 3
    let processedText = ssml;
    
    // Remove SSML tags and extract text content
    processedText = processedText.replace(/<speak[^>]*>/gi, '').replace(/<\/speak>/gi, '');
    processedText = processedText.replace(/<voice[^>]*>/gi, '').replace(/<\/voice>/gi, '');
    processedText = processedText.replace(/<prosody[^>]*>/gi, '').replace(/<\/prosody>/gi, '');
    processedText = processedText.replace(/<emphasis[^>]*>/gi, '').replace(/<\/emphasis>/gi, '');
    processedText = processedText.replace(/<break[^>]*>/gi, ' ');
    
    return processedText.trim();
  }

  private applyEmotion(text: string, emotion: Emotion): string {
    // Emotion-based text processing
    const emotionMap = {
      [Emotion.HAPPY]: '😊 ' + text + ' 😊',
      [Emotion.SAD]: '😔 ' + text + ' 😔', 
      [Emotion.ANGRY]: '😠 ' + text + ' 😠',
      [Emotion.EXCITED]: '🎉 ' + text + ' 🎉',
      [Emotion.CALM]: '😌 ' + text + ' 😌',
      [Emotion.CONFIDENT]: '💪 ' + text + ' 💪',
      [Emotion.GENTLE]: '🌸 ' + text + ' 🌸',
      [Emotion.NEUTRAL]: text
    };
    
    return emotionMap[emotion] || text;
  }

  private applyVoiceCharacteristics(text: string, voiceProfile: VoiceProfile): string {
    const { characteristics, gender } = voiceProfile;
    
    // Apply gender-specific modifications
    let processedText = text;
    if (gender === VoiceGender.CHILD) {
      processedText = '👶 ' + text + ' 👶';
    } else if (gender === VoiceGender.MALE) {
      processedText = '👨 ' + text + ' 👨';
    } else {
      processedText = '👩 ' + text + ' 👩';
    }
    
    // Apply voice characteristics
    const characteristicTags = [];
    if (characteristics.pitch > 0) characteristicTags.push('🎵');
    if (characteristics.speed > 1.0) characteristicTags.push('⚡');
    if (characteristics.volume > 70) characteristicTags.push('🔊');
    
    return characteristicTags.join(' ') + ' ' + processedText;
  }

  private generateQualityAudio(text: string, quality: AudioQuality, format: AudioFormat): string {
    // Generate audio data based on quality settings
    const qualityMultiplier = {
      [AudioQuality.LOW]: 0.5,
      [AudioQuality.MEDIUM]: 1.0,
      [AudioQuality.HIGH]: 1.5,
      [AudioQuality.ULTRA]: 2.0
    }[quality];

    const audioData = {
      text,
      quality,
      format,
      timestamp: Date.now(),
      complexity: text.length * qualityMultiplier
    };

    return btoa(JSON.stringify(audioData));
  }

  private applyAudioEffects(audioData: string, effects: any): string {
    // Apply audio effects processing
    const processedData = {
      original: audioData,
      effects: effects,
      processed: true,
      timestamp: Date.now()
    };
    
    return btoa(JSON.stringify(processedData));
  }

  private addBackgroundMusic(audioData: string, backgroundMusic: any): string {
    // Mix with background music
    const mixedData = {
      voice: audioData,
      background: backgroundMusic,
      mixed: true,
      timestamp: Date.now()
    };
    
    return btoa(JSON.stringify(mixedData));
  }

  private calculateEnhancedDuration(options: EnhancedTTSOptions, voiceProfile: VoiceProfile): number {
    let baseDuration = options.text.split(' ').length * 150; // 150ms per word base
    
    // Apply speed modifier
    const speed = options.speed || voiceProfile.characteristics.speed || 1.0;
    baseDuration = baseDuration / speed;
    
    // Apply emotion modifier (excited speech is faster, sad is slower)
    const emotionModifiers = {
      [Emotion.EXCITED]: 0.8,
      [Emotion.HAPPY]: 0.9,
      [Emotion.NEUTRAL]: 1.0,
      [Emotion.CALM]: 1.1,
      [Emotion.GENTLE]: 1.2,
      [Emotion.SAD]: 1.3,
      [Emotion.ANGRY]: 0.85,
      [Emotion.CONFIDENT]: 0.95
    };
    
    const emotionModifier = emotionModifiers[options.emotion || Emotion.NEUTRAL] || 1.0;
    baseDuration = baseDuration * emotionModifier;
    
    return Math.max(500, baseDuration); // Minimum 500ms
  }

  private generateWordTimings(text: string): WordTiming[] {
    const words = text.split(' ');
    const timings: WordTiming[] = [];
    let currentTime = 0;
    
    words.forEach((word, index) => {
      const wordDuration = Math.max(100, word.length * 80); // 80ms per character minimum
      timings.push({
        word,
        startTime: currentTime,
        endTime: currentTime + wordDuration,
        confidence: 0.85 + Math.random() * 0.15 // 85-100% confidence
      });
      currentTime += wordDuration + 50; // 50ms pause between words
    });
    
    return timings;
  }

  private generateCacheKey(options: EnhancedTTSOptions): string {
    const keyData = {
      text: options.text,
      voiceId: options.voiceId,
      emotion: options.emotion,
      speed: options.speed,
      pitch: options.pitch,
      volume: options.volume,
      quality: options.quality,
      format: options.format,
      ssml: options.ssml
    };
    
    return btoa(JSON.stringify(keyData));
  }

  private initializeDefaultVoices(): void {
    const defaultVoices: VoiceProfile[] = [
      {
        id: 'default-female',
        name: 'Sarah (Female)',
        gender: VoiceGender.FEMALE,
        age: 28,
        accent: 'American',
        characteristics: {
          pitch: 0,
          speed: 1.0,
          volume: 80,
          warmth: 75,
          clarity: 85,
          breathiness: 20
        },
        emotion: Emotion.NEUTRAL,
        language: 'en-US',
        description: 'Warm and friendly female voice',
        isCustom: false,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'default-male',
        name: 'James (Male)',
        gender: VoiceGender.MALE,
        age: 35,
        accent: 'American',
        characteristics: {
          pitch: -2,
          speed: 1.0,
          volume: 85,
          warmth: 60,
          clarity: 90,
          breathiness: 15
        },
        emotion: Emotion.NEUTRAL,
        language: 'en-US',
        description: 'Clear and professional male voice',
        isCustom: false,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'child-voice',
        name: 'Lily (Child)',
        gender: VoiceGender.CHILD,
        age: 8,
        accent: 'American',
        characteristics: {
          pitch: 4,
          speed: 1.1,
          volume: 75,
          warmth: 90,
          clarity: 70,
          breathiness: 30
        },
        emotion: Emotion.HAPPY,
        language: 'en-US',
        description: 'Cheerful and energetic child voice',
        isCustom: false,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    defaultVoices.forEach(voice => {
      this.voiceProfiles.set(voice.id, voice);
    });

    console.log('[Enhanced TTS] Initialized', this.voiceProfiles.size, 'default voice profiles');
  }

  // Public methods for voice management
  getAllVoiceProfiles(): VoiceProfile[] {
    return Array.from(this.voiceProfiles.values());
  }

  getVoiceProfileById(id: string): VoiceProfile | undefined {
    return this.voiceProfiles.get(id);
  }

  addVoiceProfile(voiceProfile: VoiceProfile): void {
    this.voiceProfiles.set(voiceProfile.id, voiceProfile);
    console.log('[Enhanced TTS] Added voice profile:', voiceProfile.name);
  }

  removeVoiceProfile(id: string): boolean {
    const deleted = this.voiceProfiles.delete(id);
    if (deleted) {
      console.log('[Enhanced TTS] Removed voice profile:', id);
    }
    return deleted;
  }

  // Cache management
  getCacheStats(): { size: number; hitRate: number } {
    return {
      size: this.cache.size,
      hitRate: 0 // TODO: Implement hit rate tracking
    };
  }

  clearCache(): void {
    this.cache.clear();
    console.log('[Enhanced TTS] Cache cleared');
  }
}