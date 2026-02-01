import { Injectable } from '@nestjs/common';
import { ConfigService } from '../config/config.service';
import {
  EnhancedSTTOptions,
  STTResult,
  Language,
  AudioQuality,
  AudioFormat,
  WordTiming,
  SpeakerSegment,
  Speaker,
  EmotionData,
  Emotion,
  AudioQualityAssessment,
  QualityIssue,
  LanguageDetection,
  VoiceCharacteristics,
  SpeakerProfile
} from './types/stt-types.interface';

@Injectable()
export class EnhancedLocalSTTService {
  constructor(private readonly configService: ConfigService) {
    this.initializeSpeakerProfiles();
  }

  private speakerProfiles: Map<string, SpeakerProfile> = new Map();
  private cache: Map<string, STTResult> = new Map();
  private supportedLanguages = [
    Language.ENGLISH_US, Language.ENGLISH_UK, Language.SPANISH_ES, Language.SPANISH_MX,
    Language.FRENCH_FR, Language.FRENCH_CA, Language.GERMAN_DE, Language.ITALIAN_IT,
    Language.PORTUGUESE_BR, Language.PORTUGUESE_PT, Language.CHINESE_CN, Language.CHINESE_TW,
    Language.JAPANESE_JP, Language.KOREAN_KR, Language.RUSSIAN_RU, Language.ARABIC_SA,
    Language.HINDI_IN, Language.DUTCH_NL, Language.SWEDISH_SE, Language.DANISH_DK
  ];

  async enhancedTranscribe(options: EnhancedSTTOptions): Promise<STTResult> {
    const startTime = Date.now();
    
    try {
      console.log('[Enhanced STT] Starting enhanced transcription:', {
        audioSize: typeof options.audio === 'string' ? options.audio.length : 'binary',
        language: options.language,
        quality: options.quality,
        enableDiarization: options.enableDiarization,
        enableEmotion: options.enableEmotion
      });

      // Check cache first
      const cacheKey = this.generateCacheKey(options);
      if (this.cache.has(cacheKey)) {
        const cachedResult = this.cache.get(cacheKey)!;
        console.log('[Enhanced STT] Cache hit for:', cacheKey);
        return {
          ...cachedResult,
          metadata: {
            ...cachedResult.metadata,
            processingTime: Date.now() - startTime
          }
        };
      }

      // Preprocess audio
      const preprocessedAudio = await this.preprocessAudio(options);
      
      // Detect language if not specified
      const detectedLanguage = options.language || await this.detectLanguage(preprocessedAudio);
      
      // Generate enhanced transcription
      const transcript = await this.generateEnhancedTranscription(preprocessedAudio, detectedLanguage, options);
      
      // Generate word timings
      const wordTimings = this.generateWordTimings(transcript);
      
      // Perform speaker diarization if enabled
      let speakerSegments: SpeakerSegment[] = [];
      let speakers: Speaker[] = [];
      if (options.enableDiarization) {
        const diarizationResult = await this.performSpeakerDiarization(transcript, wordTimings, options);
        speakerSegments = diarizationResult.segments;
        speakers = diarizationResult.speakers;
      }
      
      // Detect emotion if enabled
      let emotion: EmotionData | undefined;
      if (options.enableEmotion) {
        emotion = await this.detectEmotion(transcript, wordTimings);
      }
      
      // Assess audio quality
      const audioQuality = await this.assessAudioQuality(preprocessedAudio);
      
      // Calculate duration
      const duration = this.calculateAudioDuration(preprocessedAudio);
      
      const result: STTResult = {
        success: true,
        transcript,
        confidence: this.calculateConfidence(transcript, audioQuality, detectedLanguage),
        duration,
        language: detectedLanguage,
        quality: options.quality || AudioQuality.BALANCED,
        wordTimings,
        speakerSegments: speakerSegments.length > 0 ? speakerSegments : undefined,
        emotion,
        audioQuality,
        metadata: {
          processingTime: Date.now() - startTime,
          characters: transcript.length,
          words: transcript.split(' ').length,
          speakerCount: speakers.length > 0 ? speakers.length : undefined,
          detectedLanguage: options.language ? undefined : detectedLanguage,
          noiseLevel: audioQuality.noiseLevel,
          volumeLevel: audioQuality.volumeLevel,
          provider: 'enhanced-local-stt'
        }
      };

      // Cache the result
      this.cache.set(cacheKey, result);
      
      console.log('[Enhanced STT] Transcription completed:', {
        duration,
        confidence: result.confidence,
        speakerCount: speakers.length,
        processingTime: result.metadata.processingTime
      });

      return result;
    } catch (error) {
      console.error('[Enhanced STT] Error during transcription:', error);
      throw error;
    }
  }

  private async preprocessAudio(options: EnhancedSTTOptions): Promise<ArrayBuffer> {
    console.log('[Enhanced STT] Preprocessing audio...');
    
    // Convert to ArrayBuffer if needed
    let audioBuffer: ArrayBuffer;
    if (typeof options.audio === 'string') {
      audioBuffer = this.base64ToArrayBuffer(options.audio);
    } else {
      audioBuffer = options.audio;
    }

    // Apply noise reduction if enabled
    if (options.noiseReduction) {
      audioBuffer = await this.applyNoiseReduction(audioBuffer);
    }

    // Normalize volume
    audioBuffer = await this.normalizeVolume(audioBuffer);

    // Apply quality-specific processing
    switch (options.quality || AudioQuality.BALANCED) {
      case AudioQuality.FAST:
        audioBuffer = await this.applyFastProcessing(audioBuffer);
        break;
      case AudioQuality.ACCURATE:
        audioBuffer = await this.applyAccurateProcessing(audioBuffer);
        break;
      default:
        audioBuffer = await this.applyBalancedProcessing(audioBuffer);
    }

    console.log('[Enhanced STT] Audio preprocessing completed');
    return audioBuffer;
  }

  private async detectLanguage(audioBuffer: ArrayBuffer): Promise<Language> {
    // Mock language detection for Phase 4
    const languageScores = this.supportedLanguages.map(lang => ({
      language: lang,
      confidence: 0.5 + Math.random() * 0.5 // Mock confidence scores
    }));

    const detected = languageScores.reduce((best, current) => 
      current.confidence > best.confidence ? current : best
    );

    console.log('[Enhanced STT] Language detected:', detected.language, detected.confidence);
    return detected.language;
  }

  private async generateEnhancedTranscription(
    audioBuffer: ArrayBuffer, 
    language: Language, 
    options: EnhancedSTTOptions
  ): Promise<string> {
    console.log('[Enhanced STT] Generating enhanced transcription for language:', language);
    
    // Calculate audio duration for mock generation
    const duration = this.calculateAudioDuration(audioBuffer);
    
    // Generate mock transcript based on language and duration
    const transcript = this.generateMockTranscript(language, duration, options);
    
    return transcript;
  }

  private generateMockTranscript(
    language: Language, 
    duration: number, 
    options: EnhancedSTTOptions
  ): string {
    const transcriptsByLanguage: Record<Language, string[]> = {
      [Language.ENGLISH_US]: [
        'Hello, this is a test of the enhanced speech recognition system.',
        'The weather is beautiful today, perfect for outdoor activities.',
        'Can you help me with my automated workflow and processes?',
        'I need to schedule a meeting for tomorrow at three o\'clock.',
        'The artificial intelligence system is working very well today.',
        'Thank you for your assistance with this complex task.',
        'Please activate the voice commands and natural language processing.',
        'The conference call has been rescheduled to next week.',
        'I would like to order a pizza with extra cheese and pepperoni.',
        'The project deadline is approaching faster than expected.'
      ],
      [Language.SPANISH_ES]: [
        'Hola, esto es una prueba del sistema de reconocimiento de voz.',
        'El clima está hermoso hoy, perfecto para actividades al aire libre.',
        '¿Puedes ayudarme con mi flujo de trabajo automatizado?',
        'Necesito programar una reunión para mañana a las tres.',
        'El sistema de inteligencia artificial funciona muy bien hoy.',
        'Gracias por tu ayuda con esta tarea compleja.',
        'Por favor activa los comandos de voz y procesamiento del lenguaje.',
        'La videoconferencia ha sido reprogramada para la próxima semana.',
        'Quisiera pedir una pizza con queso extra y pepperoni.',
        'La fecha límite del proyecto se acerca más rápido de lo esperado.'
      ],
      [Language.FRENCH_FR]: [
        'Bonjour, ceci est un test du système de reconnaissance vocale.',
        'Le temps est magnifique aujourd\'hui, parfait pour les activités en plein air.',
        'Pouvez-vous m\'aider avec mon flux de travail automatisé?',
        'Je dois programmer une réunion pour demain à trois heures.',
        'Le système d\'intelligence artificielle fonctionne très bien aujourd\'hui.',
        'Merci pour votre aide avec cette tâche complexe.',
        'Veuillez activer les commandes vocales et le traitement du langage.',
        'La conférence téléphonique a été reprogrammée pour la semaine prochaine.',
        'Je voudrais commander une pizza avec du fromage supplémentaire et du pepperoni.',
        'La date limite du projet approche plus vite que prévu.'
      ],
      [Language.GERMAN_DE]: [
        'Hallo, dies ist ein Test des Spracherkennungssystems.',
        'Das Wetter ist heute wunderschön, perfekt für Aktivitäten im Freien.',
        'Können Sie mir bei meinem automatisierten Arbeitsablauf helfen?',
        'Ich muss ein Meeting für morgen um drei Uhr ansetzen.',
        'Das KI-System funktioniert heute sehr gut.',
        'Vielen Dank für Ihre Hilfe bei dieser komplexen Aufgabe.',
        'Bitte aktivieren Sie Sprachbefehle und Sprachverarbeitung.',
        'Die Telefonkonferenz wurde auf nächste Woche verschoben.',
        'Ich möchte eine Pizza mit zusätzlichem Käse und Pepperoni bestellen.',
        'Die Projektfrist rückt schneller näher als erwartet.'
      ],
      [Language.CHINESE_CN]: [
        '你好，这是增强语音识别系统的测试。',
        '今天天气很美，非常适合户外活动。',
        '你能帮我处理我的自动化工作流程吗？',
        '我需要安排明天三点的会议。',
        '人工智能系统今天工作得很好。',
        '感谢你在这个复杂任务上的帮助。',
        '请激活语音命令和自然语言处理。',
        '电话会议已重新安排到下周。',
        '我想订购一个带额外芝士和意大利辣香肠的披萨。',
        '项目截止日期比预期的要快。'
      ],
      [Language.JAPANESE_JP]: [
        'こんにちは、これは強化音声認識システムのテストです。',
        '今日は天気が美しく、アウトドア活動に最適です。',
        '自動化されたワークフローで私を助けてくれますか？',
        '明日の3時に会議をスケジュールする必要があります。',
        'AIシステムは今日とても良く機能しています。',
        'この複雑なタスクでの助けに感謝します。',
        '音声コマンドと自然言語処理を有効にしてください。',
        '電話会議は来週に再スケジュールされました。',
        '追加のチーズとペパロニ付きのピザを注文したいです。',
        'プロジェクトの締め切りが予想より早く来ています。'
      ]
    };

    // Default to English for languages not in the map
    const languageTranscripts = transcriptsByLanguage[language] || transcriptsByLanguage[Language.ENGLISH_US];
    
    // Select transcript based on duration
    const index = Math.min(Math.floor(duration / 15), languageTranscripts.length - 1);
    return languageTranscripts[index] || languageTranscripts[0];
  }

  private generateWordTimings(transcript: string): WordTiming[] {
    const words = transcript.split(' ');
    const timings: WordTiming[] = [];
    let currentTime = 0;
    
    words.forEach((word, index) => {
      const wordDuration = Math.max(100, word.length * 50 + Math.random() * 100); // 50ms per char + random
      timings.push({
        word,
        startTime: currentTime,
        endTime: currentTime + wordDuration,
        confidence: 0.85 + Math.random() * 0.15, // 85-100% confidence
        emotion: this.detectWordEmotion(word)
      });
      currentTime += wordDuration + 100; // 100ms pause between words
    });
    
    return timings;
  }

  private detectWordEmotion(word: string): Emotion | undefined {
    const emotionWords = {
      [Emotion.HAPPY]: ['happy', 'excited', 'wonderful', 'great', 'beautiful', 'perfect', 'thank', 'thanks'],
      [Emotion.SAD]: ['sad', 'sorry', 'disappointed', 'frustrated', 'difficult', 'problem'],
      [Emotion.ANGRY]: ['angry', 'frustrated', 'annoying', 'terrible', 'hate', 'urgent'],
      [Emotion.EXCITED]: ['excited', 'awesome', 'amazing', 'fantastic', 'great', 'wonderful'],
      [Emotion.CALM]: ['calm', 'peaceful', 'relaxed', 'comfortable', 'gentle', 'quiet']
    };

    for (const [emotion, words] of Object.entries(emotionWords)) {
      if (words.some(w => word.toLowerCase().includes(w))) {
        return emotion as Emotion;
      }
    }
    
    return Emotion.NEUTRAL;
  }

  private async performSpeakerDiarization(
    transcript: string, 
    wordTimings: WordTiming[], 
    options: EnhancedSTTOptions
  ): Promise<{ segments: SpeakerSegment[]; speakers: Speaker[] }> {
    console.log('[Enhanced STT] Performing speaker diarization...');
    
    // Mock speaker diarization for Phase 4
    const speakerCount = Math.floor(Math.random() * 3) + 1; // 1-3 speakers
    const wordsPerSpeaker = Math.ceil(wordTimings.length / speakerCount);
    
    const segments: SpeakerSegment[] = [];
    const speakers: Speaker[] = [];
    
    for (let i = 0; i < speakerCount; i++) {
      const speakerId = `speaker_${i + 1}`;
      const speakerLabel = `Speaker ${String.fromCharCode(65 + i)}`; // Speaker A, B, C
      
      speakers.push({
        id: speakerId,
        label: speakerLabel,
        confidence: 0.85 + Math.random() * 0.15,
        duration: 0,
        wordCount: 0,
        emotion: this.getRandomEmotion(),
        gender: ['male', 'female', 'unknown'][Math.floor(Math.random() * 3)] as any,
        age: ['adult', 'teen', 'senior'][Math.floor(Math.random() * 3)] as any
      });
      
      // Create segment for this speaker
      const startIndex = i * wordsPerSpeaker;
      const endIndex = Math.min(startIndex + wordsPerSpeaker, wordTimings.length);
      
      if (startIndex < wordTimings.length) {
        const segmentWords = wordTimings.slice(startIndex, endIndex);
        const segmentText = segmentWords.map(w => w.word).join(' ');
        const startTime = segmentWords[0].startTime;
        const endTime = segmentWords[segmentWords.length - 1].endTime;
        
        segments.push({
          speakerId,
          speakerLabel,
          startTime,
          endTime,
          text: segmentText,
          confidence: 0.80 + Math.random() * 0.20,
          emotion: this.getRandomEmotion(),
          wordCount: segmentWords.length,
          duration: endTime - startTime
        });
      }
    }
    
    // Update speaker statistics
    segments.forEach(segment => {
      const speaker = speakers.find(s => s.id === segment.speakerId);
      if (speaker) {
        speaker.duration += segment.duration;
        speaker.wordCount += segment.wordCount;
      }
    });
    
    console.log('[Enhanced STT] Speaker diarization completed:', {
      speakerCount,
      segmentCount: segments.length
    });
    
    return { segments, speakers };
  }

  private async detectEmotion(transcript: string, wordTimings: WordTiming[]): Promise<EmotionData> {
    console.log('[Enhanced STT] Detecting emotion...');
    
    // Mock emotion detection
    const emotionScores = {
      [Emotion.HAPPY]: 0,
      [Emotion.SAD]: 0,
      [Emotion.ANGRY]: 0,
      [Emotion.NEUTRAL]: 0,
      [Emotion.EXCITED]: 0,
      [Emotion.CALM]: 0,
      [Emotion.CONFIDENT]: 0,
      [Emotion.GENTLE]: 0
    };

    // Analyze words for emotional content
    wordTimings.forEach(timing => {
      if (timing.emotion) {
        emotionScores[timing.emotion]++;
      }
    });

    // Find dominant emotion
    let maxScore = 0;
    let primaryEmotion = Emotion.NEUTRAL;
    let secondaryEmotion: Emotion | undefined;
    let maxSecondaryScore = 0;

    for (const [emotion, score] of Object.entries(emotionScores)) {
      if (score > maxScore) {
        maxSecondaryScore = maxScore;
        secondaryEmotion = primaryEmotion;
        maxScore = score;
        primaryEmotion = emotion as Emotion;
      } else if (score > maxSecondaryScore) {
        maxSecondaryScore = score;
        secondaryEmotion = emotion as Emotion;
      }
    }

    const totalWords = wordTimings.length;
    const primaryConfidence = maxScore / totalWords;
    const secondaryConfidence = secondaryEmotion ? maxSecondaryScore / totalWords : 0;

    return {
      primary: primaryEmotion,
      confidence: primaryConfidence,
      secondary: secondaryEmotion,
      secondaryConfidence,
      overall: {
        positive: (emotionScores[Emotion.HAPPY] + emotionScores[Emotion.EXCITED]) / totalWords,
        negative: (emotionScores[Emotion.SAD] + emotionScores[Emotion.ANGRY]) / totalWords,
        neutral: emotionScores[Emotion.NEUTRAL] / totalWords,
        energetic: (emotionScores[Emotion.EXCITED] + emotionScores[Emotion.CONFIDENT]) / totalWords,
        calm: (emotionScores[Emotion.CALM] + emotionScores[Emotion.GENTLE]) / totalWords
      }
    };
  }

  private async assessAudioQuality(audioBuffer: ArrayBuffer): Promise<AudioQualityAssessment> {
    console.log('[Enhanced STT] Assessing audio quality...');
    
    // Mock audio quality assessment
    const noiseLevel = Math.random() * 30; // 0-30 (lower is better)
    const volumeLevel = 60 + Math.random() * 20; // 60-80 (good range)
    const clarity = 70 + Math.random() * 25; // 70-95
    const backgroundNoise = Math.random() * 25; // 0-25 (lower is better)
    const speechToNoiseRatio = 15 + Math.random() * 10; // 15-25 dB
    
    const overallScore = Math.round(
      (clarity * 0.4 + (100 - noiseLevel) * 0.3 + volumeLevel * 0.2 + speechToNoiseRatio * 4 * 0.1)
    );

    const issues: QualityIssue[] = [];
    
    if (noiseLevel > 20) {
      issues.push({
        type: 'noise',
        severity: noiseLevel > 25 ? 'high' : 'medium',
        description: 'Significant background noise detected',
        recommendation: 'Use noise reduction or record in quieter environment'
      });
    }
    
    if (volumeLevel < 50) {
      issues.push({
        type: 'volume',
        severity: 'medium',
        description: 'Audio volume is too low',
        recommendation: 'Increase recording volume or move closer to microphone'
      });
    } else if (volumeLevel > 85) {
      issues.push({
        type: 'clipping',
        severity: 'high',
        description: 'Audio volume may cause clipping',
        recommendation: 'Decrease recording volume'
      });
    }
    
    if (clarity < 75) {
      issues.push({
        type: 'distortion',
        severity: 'medium',
        description: 'Audio clarity is reduced',
        recommendation: 'Check microphone quality and positioning'
      });
    }

    const recommendations = issues.length > 0 ? 
      issues.map(issue => issue.recommendation) : 
      ['Audio quality is acceptable'];

    return {
      overallScore,
      clarity,
      noiseLevel,
      volumeLevel,
      backgroundNoise,
      speechToNoiseRatio,
      qualityIssues: issues,
      recommendations
    };
  }

  private calculateAudioDuration(audioBuffer: ArrayBuffer): number {
    // Estimate duration based on audio size and format
    const sizeKB = audioBuffer.byteLength / 1024;
    return Math.max(1, sizeKB / 32); // Approximate duration in seconds
  }

  private calculateConfidence(
    transcript: string, 
    audioQuality: AudioQualityAssessment, 
    language: Language
  ): number {
    let baseConfidence = 0.85; // Base confidence
    
    // Adjust based on audio quality
    baseConfidence += (audioQuality.overallScore - 75) / 100; // Quality adjustment
    
    // Adjust based on transcript length
    if (transcript.split(' ').length < 3) {
      baseConfidence -= 0.1; // Penalty for very short transcripts
    }
    
    // Adjust based on language support
    const isPrimaryLanguage = [
      Language.ENGLISH_US, Language.SPANISH_ES, Language.FRENCH_FR, 
      Language.GERMAN_DE, Language.CHINESE_CN
    ].includes(language);
    
    if (!isPrimaryLanguage) {
      baseConfidence -= 0.05; // Small penalty for less common languages
    }
    
    return Math.max(0.1, Math.min(0.99, baseConfidence));
  }

  private generateCacheKey(options: EnhancedSTTOptions): string {
    const keyData = {
      audioSize: typeof options.audio === 'string' ? options.audio.length : 'binary',
      language: options.language,
      quality: options.quality,
      enableDiarization: options.enableDiarization,
      enableEmotion: options.enableEmotion,
      noiseReduction: options.noiseReduction
    };
    
    return Buffer.from(JSON.stringify(keyData)).toString('base64');
  }

  // Audio processing methods
  private async applyNoiseReduction(audioBuffer: ArrayBuffer): Promise<ArrayBuffer> {
    console.log('[Enhanced STT] Applying noise reduction...');
    // Mock noise reduction - in reality would apply spectral subtraction
    return audioBuffer;
  }

  private async normalizeVolume(audioBuffer: ArrayBuffer): Promise<ArrayBuffer> {
    console.log('[Enhanced STT] Normalizing volume...');
    // Mock volume normalization
    return audioBuffer;
  }

  private async applyFastProcessing(audioBuffer: ArrayBuffer): Promise<ArrayBuffer> {
    console.log('[Enhanced STT] Applying fast processing...');
    return audioBuffer;
  }

  private async applyBalancedProcessing(audioBuffer: ArrayBuffer): Promise<ArrayBuffer> {
    console.log('[Enhanced STT] Applying balanced processing...');
    return audioBuffer;
  }

  private async applyAccurateProcessing(audioBuffer: ArrayBuffer): Promise<ArrayBuffer> {
    console.log('[Enhanced STT] Applying accurate processing...');
    return audioBuffer;
  }

  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  }

  private getRandomEmotion(): Emotion {
    const emotions = Object.values(Emotion);
    return emotions[Math.floor(Math.random() * emotions.length)];
  }

  private initializeSpeakerProfiles(): void {
    console.log('[Enhanced STT] Initializing speaker profiles...');
    // Initialize with default speaker profiles
  }

  // Public methods for speaker profile management
  async addSpeakerProfile(profile: SpeakerProfile): Promise<void> {
    this.speakerProfiles.set(profile.id, profile);
    console.log('[Enhanced STT] Added speaker profile:', profile.name);
  }

  getSpeakerProfile(id: string): SpeakerProfile | undefined {
    return this.speakerProfiles.get(id);
  }

  getAllSpeakerProfiles(): SpeakerProfile[] {
    return Array.from(this.speakerProfiles.values());
  }

  getSupportedLanguages(): Language[] {
    return this.supportedLanguages;
  }

  // Cache management
  getCacheStats(): { size: number; hitRate: number } {
    return {
      size: this.cache.size,
      hitRate: 0.65 // Mock 65% hit rate
    };
  }

  clearCache(): void {
    this.cache.clear();
    console.log('[Enhanced STT] Cache cleared');
  }
}