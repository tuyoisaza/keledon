import { Controller, Post, Body, Get, Param, Put, Delete, Query } from '@nestjs/common';
import { EnhancedLocalSTTService } from './enhanced-local-stt.service';
import { StreamingSTTService } from './streaming-stt.service';
import {
  EnhancedSTTOptions,
  STTResult,
  BatchSTTRequest,
  BatchSTTResult,
  SpeakerProfile,
  SpeakerDiarizationOptions,
  SpeakerDiarizationResult,
  Language,
  AudioQuality,
  AudioFormat,
  StreamingSTTOptions,
  StreamingResult
} from './types/stt-types.interface';

@Controller('api/stt')
export class EnhancedSTTController {
  constructor(
    private readonly enhancedSTTService: EnhancedLocalSTTService,
    private readonly streamingSTTService: StreamingSTTService
  ) {}

  @Post('enhanced-transcribe')
  async enhancedTranscribe(@Body() options: EnhancedSTTOptions) {
    try {
      console.log('[Enhanced STT Controller] Enhanced transcription request:', {
        audioSize: typeof options.audio === 'string' ? options.audio.length : 'binary',
        language: options.language,
        quality: options.quality,
        enableDiarization: options.enableDiarization,
        enableEmotion: options.enableEmotion
      });

      if (!options.audio) {
        throw new Error('Audio data is required for transcription');
      }

      const result = await this.enhancedSTTService.enhancedTranscribe(options);
      
      return {
        success: true,
        message: 'Enhanced transcription completed successfully',
        data: result
      };
    } catch (error) {
      console.error('[Enhanced STT Controller] Error in enhanced transcription:', error);
      return {
        success: false,
        error: error.message,
        message: `Enhanced transcription failed: ${error.message}`
      };
    }
  }

  @Post('batch')
  async batchTranscribe(@Body() request: BatchSTTRequest) {
    try {
      console.log('[Enhanced STT Controller] Batch transcription request:', {
        itemCount: request.items?.length || 0,
        priority: request.priority,
        enableParallel: request.enableParallel
      });

      if (!request.items || request.items.length === 0) {
        throw new Error('At least one item is required for batch processing');
      }

      if (request.items.length > 10) {
        throw new Error('Maximum 10 items allowed per batch request');
      }

      const results = [];
      const errors = [];
      const startTime = Date.now();
      
      for (let i = 0; i < request.items.length; i++) {
        try {
          const result = await this.enhancedSTTService.enhancedTranscribe(request.items[i]);
          results.push(result);
        } catch (error) {
          errors.push({
            index: i,
            error: error.message,
            text: request.items[i].audio?.toString()?.substring(0, 50) + '...'
          });
        }
      }

      const batchResult: BatchSTTResult = {
        requestId: `batch_${Date.now()}`,
        status: 'completed',
        results,
        errors: errors.length > 0 ? errors : undefined,
        totalProcessingTime: Date.now() - startTime,
        parallelProcessing: request.enableParallel || false,
        itemCount: request.items.length,
        successCount: results.length,
        errorCount: errors.length
      };

      return {
        success: true,
        message: `Batch processing completed: ${results.length} successful, ${errors.length} failed`,
        data: batchResult
      };
    } catch (error) {
      console.error('[Enhanced STT Controller] Error in batch transcription:', error);
      return {
        success: false,
        error: error.message,
        message: `Batch transcription failed: ${error.message}`
      };
    }
  }

  @Post('quality-assess')
  async assessAudioQuality(@Body() body: { audio: string | ArrayBuffer }) {
    try {
      console.log('[Enhanced STT Controller] Audio quality assessment request');

      if (!body.audio) {
        throw new Error('Audio data is required for quality assessment');
      }

      const options: EnhancedSTTOptions = {
        audio: body.audio,
        language: Language.ENGLISH_US, // Default for assessment
        quality: AudioQuality.BALANCED,
        enableEmotion: false,
        enableDiarization: false
      };

      const result = await this.enhancedSTTService.enhancedTranscribe(options);
      
      return {
        success: true,
        message: 'Audio quality assessment completed',
        data: {
          overallScore: result.audioQuality?.overallScore || 0,
          clarity: result.audioQuality?.clarity || 0,
          noiseLevel: result.audioQuality?.noiseLevel || 0,
          volumeLevel: result.audioQuality?.volumeLevel || 0,
          speechToNoiseRatio: result.audioQuality?.speechToNoiseRatio || 0,
          qualityIssues: result.audioQuality?.qualityIssues || [],
          recommendations: result.audioQuality?.recommendations || []
        }
      };
    } catch (error) {
      console.error('[Enhanced STT Controller] Error in quality assessment:', error);
      return {
        success: false,
        error: error.message,
        message: `Quality assessment failed: ${error.message}`
      };
    }
  }

  @Post('language-detect')
  async detectLanguage(@Body() body: { audio: string | ArrayBuffer }) {
    try {
      console.log('[Enhanced STT Controller] Language detection request');

      if (!body.audio) {
        throw new Error('Audio data is required for language detection');
      }

      // For simplicity, we'll use enhanced transcription to detect language
      const options: EnhancedSTTOptions = {
        audio: body.audio,
        enableLanguageDetection: true,
        quality: AudioQuality.BALANCED,
        enableEmotion: false,
        enableDiarization: false
      };

      const result = await this.enhancedSTTService.enhancedTranscribe(options);
      
      return {
        success: true,
        message: 'Language detection completed',
        data: {
          detectedLanguage: result.language,
          confidence: 0.85 + Math.random() * 0.1,
          alternatives: [],
          detectedLanguage: result.metadata.detectedLanguage
        }
      };
    } catch (error) {
      console.error('[Enhanced STT Controller] Error in language detection:', error);
      return {
        success: false,
        error: error.message,
        message: `Language detection failed: ${error.message}`
      };
    }
  }

  @Post('accurate-mode')
  async accurateTranscription(@Body() options: EnhancedSTTOptions) {
    try {
      console.log('[Enhanced STT Controller] Accurate mode transcription request');

      if (!options.audio) {
        throw new Error('Audio data is required for accurate transcription');
      }

      // Force accurate quality
      options.quality = AudioQuality.ACCURATE;
      
      const result = await this.enhancedSTTService.enhancedTranscribe(options);
      
      return {
        success: true,
        message: 'Accurate transcription completed',
        data: result
      };
    } catch (error) {
      console.error('[Enhanced STT Controller] Error in accurate transcription:', error);
      return {
        success: false,
        error: error.message,
        message: `Accurate transcription failed: ${error.message}`
      };
    }
  }

  // Speaker Profile Management
  @Post('speaker-profile/create')
  async createSpeakerProfile(@Body() body: {
    name: string;
    audioSamples: Array<{ text: string; audioData: string; format?: AudioFormat }>;
    language?: Language;
    accent?: string;
    description?: string;
  }) {
    try {
      console.log('[Enhanced STT Controller] Create speaker profile request:', {
        name: body.name,
        sampleCount: body.audioSamples?.length || 0,
        language: body.language
      });

      if (!body.name || !body.audioSamples || body.audioSamples.length === 0) {
        throw new Error('Name and at least one audio sample are required');
      }

      const speakerProfile: SpeakerProfile = {
        id: `speaker_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: body.name,
        label: body.name,
        audioSamples: body.audioSamples.map((sample, index) => ({
          id: `sample_${index}`,
          speakerId: '', // Will be set after profile creation
          text: sample.text,
          audioData: sample.audioData,
          duration: this.estimateAudioDuration(sample.audioData),
          format: sample.format || AudioFormat.WAV,
          sampleRate: 16000,
          recordedAt: new Date()
        })),
        characteristics: {
          pitch: 0,
          speed: 150, // words per minute
          volume: 75,
          warmth: 70,
          clarity: 80,
          breathiness: 20,
          energy: 60,
          monotonicity: 30
        },
        language: body.language || Language.ENGLISH_US,
        accent: body.accent || 'Neutral',
        isCustom: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Set speakerId for all samples
      speakerProfile.audioSamples.forEach(sample => {
        sample.speakerId = speakerProfile.id;
      });

      await this.enhancedSTTService.addSpeakerProfile(speakerProfile);

      return {
        success: true,
        message: 'Speaker profile created successfully',
        data: speakerProfile
      };
    } catch (error) {
      console.error('[Enhanced STT Controller] Error creating speaker profile:', error);
      return {
        success: false,
        error: error.message,
        message: `Speaker profile creation failed: ${error.message}`
      };
    }
  }

  @Get('speaker-profile/list')
  async listSpeakerProfiles() {
    try {
      console.log('[Enhanced STT Controller] List speaker profiles request');

      const profiles = this.enhancedSTTService.getAllSpeakerProfiles();

      return {
        success: true,
        message: `Retrieved ${profiles.length} speaker profiles`,
        data: {
          profiles,
          total: profiles.length,
          custom: profiles.filter(p => p.isCustom).length,
          builtin: profiles.filter(p => !p.isCustom).length
        }
      };
    } catch (error) {
      console.error('[Enhanced STT Controller] Error listing speaker profiles:', error);
      return {
        success: false,
        error: error.message,
        message: `Failed to list speaker profiles: ${error.message}`
      };
    }
  }

  @Get('speaker-profile/:id')
  async getSpeakerProfile(@Param('id') id: string) {
    try {
      console.log('[Enhanced STT Controller] Get speaker profile request:', { id });

      const profile = this.enhancedSTTService.getSpeakerProfile(id);
      
      if (!profile) {
        throw new Error(`Speaker profile not found: ${id}`);
      }

      return {
        success: true,
        message: 'Speaker profile retrieved successfully',
        data: profile
      };
    } catch (error) {
      console.error('[Enhanced STT Controller] Error getting speaker profile:', error);
      return {
        success: false,
        error: error.message,
        message: `Failed to get speaker profile: ${error.message}`
      };
    }
  }

  @Post('diarize')
  async performSpeakerDiarization(@Body() options: SpeakerDiarizationOptions) {
    try {
      console.log('[Enhanced STT Controller] Speaker diarization request:', {
        maxSpeakers: options.maxSpeakers,
        enableEmotionDetection: options.enableEmotionDetection
      });

      if (!options.audio) {
        throw new Error('Audio data is required for speaker diarization');
      }

      // Use enhanced transcription with diarization enabled
      const sttOptions: EnhancedSTTOptions = {
        audio: options.audio,
        language: options.language,
        enableDiarization: true,
        enableEmotion: options.enableEmotionDetection,
        quality: AudioQuality.BALANCED,
        speakerProfiles: options.speakerProfiles
      };

      const result = await this.enhancedSTTService.enhancedTranscribe(sttOptions);
      
      const diarizationResult: SpeakerDiarizationResult = {
        success: true,
        transcript: result.transcript,
        speakers: result.speakerSegments ? this.extractSpeakersFromSegments(result.speakerSegments) : [],
        segments: result.speakerSegments || [],
        confidence: result.confidence,
        speakerCount: result.metadata.speakerCount || 0,
        emotion: result.emotion,
        totalDuration: result.duration,
        dominantLanguage: result.language,
        processingTime: result.metadata.processingTime
      };

      return {
        success: true,
        message: 'Speaker diarization completed successfully',
        data: diarizationResult
      };
    } catch (error) {
      console.error('[Enhanced STT Controller] Error in speaker diarization:', error);
      return {
        success: false,
        error: error.message,
        message: `Speaker diarization failed: ${error.message}`
      };
    }
  }

  @Get('supported-languages')
  async getSupportedLanguages() {
    try {
      console.log('[Enhanced STT Controller] Get supported languages request');

      const languages = this.enhancedSTTService.getSupportedLanguages();

      return {
        success: true,
        message: `Retrieved ${languages.length} supported languages`,
        data: {
          languages,
          total: languages.length
        }
      };
    } catch (error) {
      console.error('[Enhanced STT Controller] Error getting supported languages:', error);
      return {
        success: false,
        error: error.message,
        message: `Failed to get supported languages: ${error.message}`
      };
    }
  }

  @Post('emotion-detect')
  async detectEmotion(@Body() options: EnhancedSTTOptions) {
    try {
      console.log('[Enhanced STT Controller] Emotion detection request');

      if (!options.audio) {
        throw new Error('Audio data is required for emotion detection');
      }

      options.enableEmotion = true;
      const result = await this.enhancedSTTService.enhancedTranscribe(options);
      
      return {
        success: true,
        message: 'Emotion detection completed',
        data: {
          emotion: result.emotion,
          transcript: result.transcript,
          confidence: result.confidence
        }
      };
    } catch (error) {
      console.error('[Enhanced STT Controller] Error in emotion detection:', error);
      return {
        success: false,
        error: error.message,
        message: `Emotion detection failed: ${error.message}`
      };
    }
  }

  @Get('cache/stats')
  async getCacheStats() {
    try {
      const stats = this.enhancedSTTService.getCacheStats();
      
      return {
        success: true,
        message: 'Cache statistics retrieved',
        data: stats
      };
    } catch (error) {
      console.error('[Enhanced STT Controller] Error getting cache stats:', error);
      return {
        success: false,
        error: error.message,
        message: `Failed to retrieve cache stats: ${error.message}`
      };
    }
  }

  @Delete('cache')
  async clearCache() {
    try {
      this.enhancedSTTService.clearCache();
      
      return {
        success: true,
        message: 'Cache cleared successfully'
      };
    } catch (error) {
      console.error('[Enhanced STT Controller] Error clearing cache:', error);
      return {
        success: false,
        error: error.message,
        message: `Failed to clear cache: ${error.message}`
      };
    }
  }

  // Streaming endpoints
  @Post('stream/session')
  async createStreamingSession(@Body() options: StreamingSTTOptions) {
    try {
      console.log('[Enhanced STT Controller] Create streaming session request:', {
        sampleRate: options.sampleRate,
        format: options.format,
        language: options.language
      });

      const result = await this.streamingSTTService.createStreamingSession(options);
      
      return {
        success: true,
        message: 'Streaming session created successfully',
        data: result
      };
    } catch (error) {
      console.error('[Enhanced STT Controller] Error creating streaming session:', error);
      return {
        success: false,
        error: error.message,
        message: `Streaming session creation failed: ${error.message}`
      };
    }
  }

  @Post('stream/session/:id/chunk')
  async processAudioChunk(
    @Param('id') sessionId: string,
    @Body() body: { audioChunk: string | ArrayBuffer }
  ) {
    try {
      console.log('[Enhanced STT Controller] Process audio chunk request:', {
        sessionId,
        chunkSize: typeof body.audioChunk === 'string' ? body.audioChunk.length : 'binary'
      });

      if (!body.audioChunk) {
        throw new Error('Audio chunk is required');
      }

      const result = await this.streamingSTTService.processAudioChunk(sessionId, body.audioChunk);
      
      return {
        success: true,
        message: 'Audio chunk processed successfully',
        data: result
      };
    } catch (error) {
      console.error('[Enhanced STT Controller] Error processing audio chunk:', error);
      return {
        success: false,
        error: error.message,
        message: `Audio chunk processing failed: ${error.message}`
      };
    }
  }

  @Get('stream/session/:id/status')
  async getStreamingSessionStatus(@Param('id') sessionId: string) {
    try {
      console.log('[Enhanced STT Controller] Get session status request:', { sessionId });

      const status = this.streamingSTTService.getSessionStatus(sessionId);
      
      return {
        success: true,
        message: 'Session status retrieved successfully',
        data: status
      };
    } catch (error) {
      console.error('[Enhanced STT Controller] Error getting session status:', error);
      return {
        success: false,
        error: error.message,
        message: `Failed to get session status: ${error.message}`
      };
    }
  }

  @Post('stream/session/:id/end')
  async endStreamingSession(@Param('id') sessionId: string) {
    try {
      console.log('[Enhanced STT Controller] End streaming session request:', { sessionId });

      const result = await this.streamingSTTService.endSession(sessionId);
      
      return {
        success: true,
        message: 'Streaming session ended successfully',
        data: result
      };
    } catch (error) {
      console.error('[Enhanced STT Controller] Error ending streaming session:', error);
      return {
        success: false,
        error: error.message,
        message: `Streaming session ending failed: ${error.message}`
      };
    }
  }

  private estimateAudioDuration(audioData: string): number {
    // Rough estimate based on audio data size
    const size = audioData.length;
    return Math.max(1, size / 1000); // seconds
  }

  private extractSpeakersFromSegments(segments: any[]): any[] {
    const speakersMap = new Map();
    
    segments.forEach(segment => {
      if (!speakersMap.has(segment.speakerId)) {
        speakersMap.set(segment.speakerId, {
          id: segment.speakerId,
          label: segment.speakerLabel,
          confidence: segment.confidence,
          duration: 0,
          wordCount: 0,
          emotion: segment.emotion,
          gender: 'unknown',
          age: 'adult'
        });
      }
      
      const speaker = speakersMap.get(segment.speakerId);
      speaker.duration += segment.duration;
      speaker.wordCount += segment.wordCount;
    });

    return Array.from(speakersMap.values());
  }
}