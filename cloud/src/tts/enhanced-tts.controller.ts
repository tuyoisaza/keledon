import { Controller, Post, Body, Get, Param, Put, Delete, Query } from '@nestjs/common';
import { EnhancedLocalTTSService } from './enhanced-local-tts.service';
import { VoiceProfileService } from './voice-profile.service';
import { 
  EnhancedTTSOptions, 
  BatchTTSRequest,
  VoiceProfile,
  VoiceGender,
  Emotion,
  AudioFormat,
  AudioQuality
} from './types/tts-types.interface';

@Controller('api/tts')
export class EnhancedTTSController {
  constructor(
    private readonly enhancedTTSService: EnhancedLocalTTSService,
    private readonly voiceProfileService: VoiceProfileService
  ) {}

  @Post('enhanced-generate')
  async generateEnhancedSpeech(@Body() options: EnhancedTTSOptions) {
    try {
      console.log('[Enhanced TTS Controller] Generate speech request:', {
        textLength: options.text?.length || 0,
        voiceId: options.voiceId,
        emotion: options.emotion,
        quality: options.quality
      });

      if (!options.text || options.text.trim().length === 0) {
        throw new Error('Text is required for speech generation');
      }

      const result = await this.enhancedTTSService.generateEnhancedSpeech(options);
      
      return {
        success: true,
        message: 'Enhanced TTS generated successfully',
        data: result
      };
    } catch (error) {
      console.error('[Enhanced TTS Controller] Error generating speech:', error);
      return {
        success: false,
        error: error.message,
        message: `Enhanced TTS generation failed: ${error.message}`
      };
    }
  }

  @Post('ssml')
  async generateSSMLSpeech(@Body() body: { 
    ssml: string; 
    voiceId?: string;
    quality?: AudioQuality;
    format?: AudioFormat;
  }) {
    try {
      console.log('[Enhanced TTS Controller] SSML request:', {
        ssmlLength: body.ssml?.length || 0,
        voiceId: body.voiceId,
        quality: body.quality
      });

      if (!body.ssml || body.ssml.trim().length === 0) {
        throw new Error('SSML content is required');
      }

      const options: EnhancedTTSOptions = {
        text: '', // Will be extracted from SSML
        ssml: body.ssml,
        voiceId: body.voiceId,
        quality: body.quality || AudioQuality.MEDIUM,
        format: body.format || AudioFormat.MP3
      };

      const result = await this.enhancedTTSService.generateEnhancedSpeech(options);
      
      return {
        success: true,
        message: 'SSML TTS generated successfully',
        data: result
      };
    } catch (error) {
      console.error('[Enhanced TTS Controller] SSML error:', error);
      return {
        success: false,
        error: error.message,
        message: `SSML TTS generation failed: ${error.message}`
      };
    }
  }

  @Post('batch')
  async generateBatchSpeech(@Body() request: BatchTTSRequest) {
    try {
      console.log('[Enhanced TTS Controller] Batch request:', {
        itemCount: request.items?.length || 0,
        priority: request.priority
      });

      if (!request.items || request.items.length === 0) {
        throw new Error('At least one item is required for batch processing');
      }

      if (request.items.length > 10) {
        throw new Error('Maximum 10 items allowed per batch request');
      }

      const results = [];
      const errors = [];
      
      for (let i = 0; i < request.items.length; i++) {
        try {
          const result = await this.enhancedTTSService.generateEnhancedSpeech(request.items[i]);
          results.push(result);
        } catch (error) {
          errors.push({
            index: i,
            error: error.message,
            text: request.items[i].text?.substring(0, 50) + '...'
          });
        }
      }

      return {
        success: true,
        message: `Batch processing completed: ${results.length} successful, ${errors.length} failed`,
        data: {
          requestId: `batch_${Date.now()}`,
          status: 'completed',
          results,
          errors,
          totalProcessingTime: results.reduce((sum, result) => sum + result.metadata.processingTime, 0)
        }
      };
    } catch (error) {
      console.error('[Enhanced TTS Controller] Batch error:', error);
      return {
        success: false,
        error: error.message,
        message: `Batch TTS generation failed: ${error.message}`
      };
    }
  }

  @Get('voices')
  async getAllVoices(@Query('type') type?: 'all' | 'custom' | 'builtin') {
    try {
      let voices: VoiceProfile[];
      
      switch (type) {
        case 'custom':
          voices = this.voiceProfileService.getCustomVoiceProfiles();
          break;
        case 'builtin':
          voices = this.voiceProfileService.getBuiltInVoiceProfiles();
          break;
        default:
          voices = this.voiceProfileService.getAllVoiceProfiles();
      }

      return {
        success: true,
        message: `Retrieved ${voices.length} voice profiles`,
        data: {
          voices,
          total: voices.length,
          custom: voices.filter(v => v.isCustom).length,
          builtin: voices.filter(v => !v.isCustom).length
        }
      };
    } catch (error) {
      console.error('[Enhanced TTS Controller] Error getting voices:', error);
      return {
        success: false,
        error: error.message,
        message: `Failed to retrieve voice profiles: ${error.message}`
      };
    }
  }

  @Get('voices/:id')
  async getVoiceById(@Param('id') id: string) {
    try {
      const voice = this.voiceProfileService.getVoiceProfile(id);
      
      if (!voice) {
        throw new Error(`Voice profile not found: ${id}`);
      }

      const samples = this.voiceProfileService.getAudioSamples(id);

      return {
        success: true,
        message: 'Voice profile retrieved successfully',
        data: {
          voice,
          samples: samples.length,
          hasSamples: samples.length > 0
        }
      };
    } catch (error) {
      console.error('[Enhanced TTS Controller] Error getting voice:', error);
      return {
        success: false,
        error: error.message,
        message: `Failed to retrieve voice profile: ${error.message}`
      };
    }
  }

  @Post('voices')
  async createVoice(@Body() body: {
    name: string;
    gender: VoiceGender;
    characteristics?: any;
    accent?: string;
    age?: number;
    description?: string;
    language?: string;
  }) {
    try {
      console.log('[Enhanced TTS Controller] Create voice request:', {
        name: body.name,
        gender: body.gender
      });

      if (!body.name || !body.gender) {
        throw new Error('Name and gender are required');
      }

      const voiceProfile = await this.voiceProfileService.createVoiceProfile(
        body.name,
        body.gender,
        body.characteristics || {},
        {
          accent: body.accent,
          age: body.age,
          description: body.description,
          language: body.language
        }
      );

      return {
        success: true,
        message: 'Voice profile created successfully',
        data: voiceProfile
      };
    } catch (error) {
      console.error('[Enhanced TTS Controller] Error creating voice:', error);
      return {
        success: false,
        error: error.message,
        message: `Failed to create voice profile: ${error.message}`
      };
    }
  }

  @Put('voices/:id')
  async updateVoice(
    @Param('id') id: string,
    @Body() updates: Partial<VoiceProfile>
  ) {
    try {
      console.log('[Enhanced TTS Controller] Update voice request:', {
        id,
        updates: Object.keys(updates)
      });

      const updatedProfile = await this.voiceProfileService.updateVoiceProfile(id, updates);

      return {
        success: true,
        message: 'Voice profile updated successfully',
        data: updatedProfile
      };
    } catch (error) {
      console.error('[Enhanced TTS Controller] Error updating voice:', error);
      return {
        success: false,
        error: error.message,
        message: `Failed to update voice profile: ${error.message}`
      };
    }
  }

  @Delete('voices/:id')
  async deleteVoice(@Param('id') id: string) {
    try {
      console.log('[Enhanced TTS Controller] Delete voice request:', { id });

      const deleted = await this.voiceProfileService.deleteVoiceProfile(id);
      
      if (!deleted) {
        throw new Error(`Voice profile not found or cannot be deleted: ${id}`);
      }

      return {
        success: true,
        message: 'Voice profile deleted successfully'
      };
    } catch (error) {
      console.error('[Enhanced TTS Controller] Error deleting voice:', error);
      return {
        success: false,
        error: error.message,
        message: `Failed to delete voice profile: ${error.message}`
      };
    }
  }

  @Post('voices/clone')
  async cloneVoice(@Body() body: {
    name: string;
    samples: Array<{
      text: string;
      audioData: string;
      format?: AudioFormat;
    }>;
    baseVoiceId?: string;
  }) {
    try {
      console.log('[Enhanced TTS Controller] Clone voice request:', {
        name: body.name,
        sampleCount: body.samples?.length || 0,
        baseVoiceId: body.baseVoiceId
      });

      if (!body.name || !body.samples || body.samples.length === 0) {
        throw new Error('Name and at least one audio sample are required');
      }

      // Convert to AudioSample format
      const audioSamples = body.samples.map((sample, index) => ({
        id: `temp_${index}`,
        voiceId: '',
        text: sample.text,
        audioData: sample.audioData,
        duration: this.estimateDuration(sample.text),
        format: sample.format || AudioFormat.MP3,
        recordedAt: new Date()
      }));

      const clonedProfile = await this.voiceProfileService.cloneVoiceFromSamples(
        body.name,
        audioSamples,
        body.baseVoiceId
      );

      return {
        success: true,
        message: 'Voice cloned successfully',
        data: clonedProfile
      };
    } catch (error) {
      console.error('[Enhanced TTS Controller] Error cloning voice:', error);
      return {
        success: false,
        error: error.message,
        message: `Failed to clone voice: ${error.message}`
      };
    }
  }

  @Post('voices/mix')
  async mixVoices(@Body() body: {
    voiceId1: string;
    voiceId2: string;
    mixRatio?: number;
    name: string;
  }) {
    try {
      console.log('[Enhanced TTS Controller] Mix voices request:', {
        voiceId1: body.voiceId1,
        voiceId2: body.voiceId2,
        mixRatio: body.mixRatio,
        name: body.name
      });

      if (!body.voiceId1 || !body.voiceId2 || !body.name) {
        throw new Error('Both voice IDs and name are required');
      }

      const mixedProfile = await this.voiceProfileService.mixVoices(
        body.voiceId1,
        body.voiceId2,
        body.mixRatio || 0.5,
        body.name
      );

      return {
        success: true,
        message: 'Voices mixed successfully',
        data: mixedProfile
      };
    } catch (error) {
      console.error('[Enhanced TTS Controller] Error mixing voices:', error);
      return {
        success: false,
        error: error.message,
        message: `Failed to mix voices: ${error.message}`
      };
    }
  }

  @Get('voices/:id/samples')
  async getVoiceSamples(@Param('id') id: string) {
    try {
      const samples = this.voiceProfileService.getAudioSamples(id);
      
      return {
        success: true,
        message: `Retrieved ${samples.length} audio samples`,
        data: {
          samples,
          total: samples.length
        }
      };
    } catch (error) {
      console.error('[Enhanced TTS Controller] Error getting samples:', error);
      return {
        success: false,
        error: error.message,
        message: `Failed to retrieve audio samples: ${error.message}`
      };
    }
  }

  @Post('voices/:id/samples')
  async addVoiceSample(
    @Param('id') id: string,
    @Body() body: {
      text: string;
      audioData: string;
      format?: AudioFormat;
    }
  ) {
    try {
      console.log('[Enhanced TTS Controller] Add sample request:', {
        id,
        textLength: body.text?.length || 0
      });

      if (!body.text || !body.audioData) {
        throw new Error('Text and audio data are required');
      }

      const sample = await this.voiceProfileService.addAudioSample(
        id,
        body.text,
        body.audioData,
        body.format || AudioFormat.MP3
      );

      return {
        success: true,
        message: 'Audio sample added successfully',
        data: sample
      };
    } catch (error) {
      console.error('[Enhanced TTS Controller] Error adding sample:', error);
      return {
        success: false,
        error: error.message,
        message: `Failed to add audio sample: ${error.message}`
      };
    }
  }

  @Get('cache/stats')
  async getCacheStats() {
    try {
      const stats = this.enhancedTTSService.getCacheStats();
      
      return {
        success: true,
        message: 'Cache statistics retrieved',
        data: stats
      };
    } catch (error) {
      console.error('[Enhanced TTS Controller] Error getting cache stats:', error);
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
      this.enhancedTTSService.clearCache();
      
      return {
        success: true,
        message: 'Cache cleared successfully'
      };
    } catch (error) {
      console.error('[Enhanced TTS Controller] Error clearing cache:', error);
      return {
        success: false,
        error: error.message,
        message: `Failed to clear cache: ${error.message}`
      };
    }
  }

  private estimateDuration(text: string): number {
    const words = text.split(' ').length;
    return Math.max(1000, words * 150);
  }
}