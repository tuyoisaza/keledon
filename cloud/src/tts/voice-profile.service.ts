import { Injectable } from '@nestjs/common';
import { 
  VoiceProfile, 
  VoiceGender, 
  Emotion, 
  VoiceCharacteristics, 
  AudioSample,
  AudioFormat 
} from './types/tts-types.interface';

@Injectable()
export class VoiceProfileService {
  private voiceProfiles: Map<string, VoiceProfile> = new Map();
  private audioSamples: Map<string, AudioSample[]> = new Map();

  constructor() {
    this.initializeDefaultProfiles();
  }

  async createVoiceProfile(
    name: string,
    gender: VoiceGender,
    characteristics: Partial<VoiceCharacteristics>,
    options?: {
      accent?: string;
      age?: number;
      description?: string;
      language?: string;
    }
  ): Promise<VoiceProfile> {
    const voiceProfile: VoiceProfile = {
      id: this.generateVoiceId(),
      name,
      gender,
      age: options?.age || this.getDefaultAge(gender),
      accent: options?.accent || 'Neutral',
      characteristics: {
        pitch: characteristics.pitch || 0,
        speed: characteristics.speed || 1.0,
        volume: characteristics.volume || 80,
        warmth: characteristics.warmth || 70,
        clarity: characteristics.clarity || 80,
        breathiness: characteristics.breathiness || 20,
        ...characteristics
      },
      emotion: Emotion.NEUTRAL,
      language: options?.language || 'en-US',
      description: options?.description || `Custom ${gender} voice: ${name}`,
      isCustom: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.voiceProfiles.set(voiceProfile.id, voiceProfile);
    console.log('[Voice Profile] Created new voice profile:', voiceProfile.name);
    
    return voiceProfile;
  }

  async cloneVoiceFromSamples(
    name: string,
    samples: AudioSample[],
    baseVoiceId?: string
  ): Promise<VoiceProfile> {
    // Analyze samples to extract voice characteristics
    const analyzedCharacteristics = await this.analyzeVoiceSamples(samples);
    
    // Get base voice profile if specified
    let baseProfile: VoiceProfile | undefined;
    if (baseVoiceId) {
      baseProfile = this.voiceProfiles.get(baseVoiceId);
    }

    // Create cloned voice profile
    const clonedProfile: VoiceProfile = {
      id: this.generateVoiceId(),
      name: `${name} (Cloned)`,
      gender: analyzedCharacteristics.gender || baseProfile?.gender || VoiceGender.FEMALE,
      age: analyzedCharacteristics.age || baseProfile?.age || 30,
      accent: analyzedCharacteristics.accent || baseProfile?.accent || 'Neutral',
      characteristics: {
        pitch: analyzedCharacteristics.pitch || baseProfile?.characteristics.pitch || 0,
        speed: analyzedCharacteristics.speed || baseProfile?.characteristics.speed || 1.0,
        volume: analyzedCharacteristics.volume || baseProfile?.characteristics.volume || 80,
        warmth: analyzedCharacteristics.warmth || baseProfile?.characteristics.warmth || 70,
        clarity: analyzedCharacteristics.clarity || baseProfile?.characteristics.clarity || 80,
        breathiness: analyzedCharacteristics.breathiness || baseProfile?.characteristics.breathiness || 20
      },
      emotion: Emotion.NEUTRAL,
      language: baseProfile?.language || 'en-US',
      description: `Cloned voice from ${samples.length} audio samples`,
      samples: samples,
      isCustom: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.voiceProfiles.set(clonedProfile.id, clonedProfile);
    this.audioSamples.set(clonedProfile.id, samples);

    console.log('[Voice Profile] Created cloned voice profile:', clonedProfile.name);
    
    return clonedProfile;
  }

  async analyzeVoiceSamples(samples: AudioSample[]): Promise<Partial<VoiceCharacteristics> & {
    gender?: VoiceGender;
    age?: number;
    accent?: string;
  }> {
    if (samples.length === 0) {
      throw new Error('No audio samples provided for analysis');
    }

    console.log('[Voice Profile] Analyzing', samples.length, 'audio samples');

    // Mock analysis for Phase 3
    const totalDuration = samples.reduce((sum, sample) => sum + sample.duration, 0);
    const avgTextLength = samples.reduce((sum, sample) => sum + sample.text.length, 0) / samples.length;
    
    // Simulate voice characteristic extraction
    const characteristics = {
      pitch: Math.round((Math.random() - 0.5) * 12), // -6 to +6 semitones
      speed: Math.max(0.5, Math.min(2.0, 1000 / avgTextLength + (Math.random() - 0.5) * 0.5)),
      volume: Math.round(60 + Math.random() * 30), // 60-90
      warmth: Math.round(50 + Math.random() * 40), // 50-90
      clarity: Math.round(60 + Math.random() * 30), // 60-90
      breathiness: Math.round(10 + Math.random() * 40), // 10-50
      
      // Additional analysis results
      gender: Math.random() > 0.5 ? VoiceGender.FEMALE : VoiceGender.MALE,
      age: Math.round(20 + Math.random() * 40), // 20-60 years
      accent: ['American', 'British', 'Australian', 'Neutral'][Math.floor(Math.random() * 4)]
    };

    console.log('[Voice Profile] Analysis complete:', characteristics);
    
    return characteristics;
  }

  async mixVoices(
    voiceId1: string,
    voiceId2: string,
    mixRatio: number = 0.5,
    name: string
  ): Promise<VoiceProfile> {
    const profile1 = this.voiceProfiles.get(voiceId1);
    const profile2 = this.voiceProfiles.get(voiceId2);

    if (!profile1 || !profile2) {
      throw new Error('One or both voice profiles not found');
    }

    if (mixRatio < 0 || mixRatio > 1) {
      throw new Error('Mix ratio must be between 0 and 1');
    }

    // Mix characteristics
    const mixedCharacteristics: VoiceCharacteristics = {
      pitch: Math.round(profile1.characteristics.pitch * mixRatio + profile2.characteristics.pitch * (1 - mixRatio)),
      speed: profile1.characteristics.speed * mixRatio + profile2.characteristics.speed * (1 - mixRatio),
      volume: Math.round(profile1.characteristics.volume * mixRatio + profile2.characteristics.volume * (1 - mixRatio)),
      warmth: Math.round(profile1.characteristics.warmth * mixRatio + profile2.characteristics.warmth * (1 - mixRatio)),
      clarity: Math.round(profile1.characteristics.clarity * mixRatio + profile2.characteristics.clarity * (1 - mixRatio)),
      breathiness: Math.round(profile1.characteristics.breathiness * mixRatio + profile2.characteristics.breathiness * (1 - mixRatio))
    };

    const mixedProfile: VoiceProfile = {
      id: this.generateVoiceId(),
      name: `${name} (${Math.round(mixRatio * 100)}% ${profile1.name} + ${Math.round((1 - mixRatio) * 100)}% ${profile2.name})`,
      gender: mixRatio > 0.5 ? profile1.gender : profile2.gender,
      age: Math.round(profile1.age! * mixRatio + profile2.age! * (1 - mixRatio)),
      accent: mixRatio > 0.5 ? profile1.accent : profile2.accent,
      characteristics: mixedCharacteristics,
      emotion: Emotion.NEUTRAL,
      language: profile1.language,
      description: `Mixed voice: ${profile1.name} + ${profile2.name}`,
      isCustom: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.voiceProfiles.set(mixedProfile.id, mixedProfile);

    console.log('[Voice Profile] Created mixed voice profile:', mixedProfile.name);
    
    return mixedProfile;
  }

  async updateVoiceProfile(
    voiceId: string,
    updates: Partial<VoiceProfile>
  ): Promise<VoiceProfile> {
    const existingProfile = this.voiceProfiles.get(voiceId);
    
    if (!existingProfile) {
      throw new Error(`Voice profile not found: ${voiceId}`);
    }

    const updatedProfile: VoiceProfile = {
      ...existingProfile,
      ...updates,
      characteristics: {
        ...existingProfile.characteristics,
        ...(updates.characteristics || {})
      },
      updatedAt: new Date()
    };

    this.voiceProfiles.set(voiceId, updatedProfile);
    
    console.log('[Voice Profile] Updated voice profile:', updatedProfile.name);
    
    return updatedProfile;
  }

  async deleteVoiceProfile(voiceId: string): Promise<boolean> {
    const profile = this.voiceProfiles.get(voiceId);
    
    if (!profile) {
      return false;
    }

    // Don't allow deletion of built-in profiles
    if (!profile.isCustom) {
      throw new Error('Cannot delete built-in voice profiles');
    }

    const deleted = this.voiceProfiles.delete(voiceId);
    this.audioSamples.delete(voiceId);
    
    if (deleted) {
      console.log('[Voice Profile] Deleted voice profile:', profile.name);
    }
    
    return deleted;
  }

  getVoiceProfile(voiceId: string): VoiceProfile | undefined {
    return this.voiceProfiles.get(voiceId);
  }

  getAllVoiceProfiles(): VoiceProfile[] {
    return Array.from(this.voiceProfiles.values());
  }

  getCustomVoiceProfiles(): VoiceProfile[] {
    return Array.from(this.voiceProfiles.values()).filter(profile => profile.isCustom);
  }

  getBuiltInVoiceProfiles(): VoiceProfile[] {
    return Array.from(this.voiceProfiles.values()).filter(profile => !profile.isCustom);
  }

  async addAudioSample(voiceId: string, text: string, audioData: string, format: AudioFormat = AudioFormat.MP3): Promise<AudioSample> {
    const sample: AudioSample = {
      id: this.generateSampleId(),
      voiceId,
      text,
      audioData,
      duration: this.estimateAudioDuration(text),
      format,
      recordedAt: new Date()
    };

    if (!this.audioSamples.has(voiceId)) {
      this.audioSamples.set(voiceId, []);
    }

    this.audioSamples.get(voiceId)!.push(sample);
    
    console.log('[Voice Profile] Added audio sample for voice:', voiceId);
    
    return sample;
  }

  getAudioSamples(voiceId: string): AudioSample[] {
    return this.audioSamples.get(voiceId) || [];
  }

  private initializeDefaultProfiles(): void {
    // Default profiles are already handled in EnhancedLocalTTSService
    console.log('[Voice Profile] Service initialized');
  }

  private generateVoiceId(): string {
    return `voice_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateSampleId(): string {
    return `sample_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getDefaultAge(gender: VoiceGender): number {
    switch (gender) {
      case VoiceGender.CHILD:
        return 8;
      case VoiceGender.MALE:
        return 35;
      case VoiceGender.FEMALE:
        return 28;
      default:
        return 30;
    }
  }

  private estimateAudioDuration(text: string): number {
    // Estimate audio duration based on text length
    const words = text.split(' ').length;
    return Math.max(1000, words * 150); // Minimum 1 second
  }

  // Voice similarity analysis
  async calculateVoiceSimilarity(voiceId1: string, voiceId2: string): Promise<number> {
    const profile1 = this.voiceProfiles.get(voiceId1);
    const profile2 = this.voiceProfiles.get(voiceId2);

    if (!profile1 || !profile2) {
      throw new Error('One or both voice profiles not found');
    }

    // Calculate similarity based on characteristics (0-1 scale)
    const pitchSimilarity = 1 - Math.abs(profile1.characteristics.pitch - profile2.characteristics.pitch) / 24;
    const speedSimilarity = 1 - Math.abs(profile1.characteristics.speed - profile2.characteristics.speed) / 1.5;
    const volumeSimilarity = 1 - Math.abs(profile1.characteristics.volume - profile2.characteristics.volume) / 100;
    const warmthSimilarity = 1 - Math.abs(profile1.characteristics.warmth - profile2.characteristics.warmth) / 100;
    const claritySimilarity = 1 - Math.abs(profile1.characteristics.clarity - profile2.characteristics.clarity) / 100;

    const overallSimilarity = (
      pitchSimilarity * 0.25 +
      speedSimilarity * 0.20 +
      volumeSimilarity * 0.15 +
      warmthSimilarity * 0.20 +
      claritySimilarity * 0.20
    );

    console.log('[Voice Profile] Similarity calculated:', {
      voice1: profile1.name,
      voice2: profile2.name,
      similarity: Math.round(overallSimilarity * 100) + '%'
    });

    return overallSimilarity;
  }
}