const express = require('express');
const cors = require('cors');

// Mock implementation of enhanced STT system
class EnhancedSTTService {
  constructor() {
    this.cache = new Map();
    this.supportedLanguages = [
      'en-US', 'en-GB', 'es-ES', 'es-MX', 'fr-FR', 'fr-CA', 
      'de-DE', 'it-IT', 'pt-BR', 'pt-PT', 'zh-CN', 'zh-TW',
      'ja-JP', 'ko-KR', 'ru-RU', 'ar-SA', 'hi-IN', 'nl-NL',
      'sv-SE', 'da-DK', 'no-NO', 'fi-FI', 'pl-PL', 'tr-TR'
    ];
    this.speakerProfiles = new Map();
    this.streamingSessions = new Map();
  }

  async enhancedTranscribe(options) {
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
        const cachedResult = this.cache.get(cacheKey);
        console.log('[Enhanced STT] Cache hit for:', cacheKey);
        return {
          ...cachedResult,
          metadata: {
            ...cachedResult.metadata,
            processingTime: Date.now() - startTime
          }
        };
      }

      // Detect language if not specified
      const detectedLanguage = options.language || this.detectLanguage(options.audio);
      
      // Generate enhanced transcription
      const transcript = this.generateMockTranscript(detectedLanguage, options);
      
      // Generate word timings
      const wordTimings = this.generateWordTimings(transcript);
      
      // Perform speaker diarization if enabled
      let speakerSegments = [];
      let speakers = [];
      if (options.enableDiarization) {
        const diarizationResult = this.performSpeakerDiarization(transcript, wordTimings);
        speakerSegments = diarizationResult.segments;
        speakers = diarizationResult.speakers;
      }
      
      // Detect emotion if enabled
      let emotion;
      if (options.enableEmotion) {
        emotion = this.detectEmotion(transcript, wordTimings);
      }
      
      // Assess audio quality
      const audioQuality = this.assessAudioQuality(options.audio);
      
      // Calculate duration
      const duration = this.calculateAudioDuration(options.audio);
      
      const result = {
        success: true,
        transcript,
        confidence: this.calculateConfidence(transcript, audioQuality, detectedLanguage),
        duration,
        language: detectedLanguage,
        quality: options.quality || 'balanced',
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

  detectLanguage(audio) {
    // Mock language detection
    const languages = ['en-US', 'es-ES', 'fr-FR', 'de-DE', 'zh-CN', 'ja-JP'];
    const detected = languages[Math.floor(Math.random() * languages.length)];
    console.log('[Enhanced STT] Language detected:', detected);
    return detected;
  }

  generateMockTranscript(language, options) {
    const transcriptsByLanguage = {
      'en-US': [
        'Hello, this is a test of the enhanced speech recognition system.',
        'The weather is beautiful today, perfect for outdoor activities.',
        'Can you help me with my automated workflow and processes?',
        'I need to schedule a meeting for tomorrow at three o\'clock.',
        'The artificial intelligence system is working very well today.',
        'Thank you for your assistance with this complex task.'
      ],
      'es-ES': [
        'Hola, esto es una prueba del sistema de reconocimiento de voz.',
        'El clima está hermoso hoy, perfecto para actividades al aire libre.',
        '¿Puedes ayudarme con mi flujo de trabajo automatizado?',
        'Necesito programar una reunión para mañana a las tres.'
      ],
      'fr-FR': [
        'Bonjour, ceci est un test du système de reconnaissance vocale.',
        'Le temps est magnifique aujourd\'hui, parfait pour les activités en plein air.',
        'Pouvez-vous m\'aider avec mon flux de travail automatisé?',
        'Je dois programmer une réunion pour demain à trois heures.'
      ],
      'de-DE': [
        'Hallo, dies ist ein Test des Spracherkennungssystems.',
        'Das Wetter ist heute wunderschön, perfekt für Aktivitäten im Freien.',
        'Können Sie mir bei meinem automatisierten Arbeitsablauf helfen?',
        'Ich muss ein Meeting für morgen um drei Uhr ansetzen.'
      ],
      'zh-CN': [
        '你好，这是增强语音识别系统的测试。',
        '今天天气很美，非常适合户外活动。',
        '你能帮我处理我的自动化工作流程吗？',
        '我需要安排明天三点的会议。'
      ],
      'ja-JP': [
        'こんにちは、これは強化音声認識システムのテストです。',
        '今日は天気が美しく、アウトドア活動に最適です。',
        '自動化されたワークフローで私を助けてくれますか？',
        '明日の3時に会議をスケジュールする必要があります。'
      ]
    };

    const languageTranscripts = transcriptsByLanguage[language] || transcriptsByLanguage['en-US'];
    return languageTranscripts[Math.floor(Math.random() * languageTranscripts.length)];
  }

  generateWordTimings(transcript) {
    const words = transcript.split(' ');
    const timings = [];
    let currentTime = 0;
    
    words.forEach((word, index) => {
      const wordDuration = Math.max(100, word.length * 50 + Math.random() * 100);
      timings.push({
        word,
        startTime: currentTime,
        endTime: currentTime + wordDuration,
        confidence: 0.85 + Math.random() * 0.15,
        emotion: this.detectWordEmotion(word)
      });
      currentTime += wordDuration + 100;
    });
    
    return timings;
  }

  detectWordEmotion(word) {
    const emotionWords = {
      'happy': ['happy', 'excited', 'wonderful', 'great', 'beautiful', 'perfect', 'thank'],
      'sad': ['sad', 'sorry', 'disappointed', 'frustrated', 'difficult'],
      'angry': ['angry', 'frustrated', 'annoying', 'terrible', 'hate', 'urgent'],
      'excited': ['excited', 'awesome', 'amazing', 'fantastic', 'great', 'wonderful'],
      'calm': ['calm', 'peaceful', 'relaxed', 'comfortable', 'gentle', 'quiet']
    };

    for (const [emotion, words] of Object.entries(emotionWords)) {
      if (words.some(w => word.toLowerCase().includes(w))) {
        return emotion;
      }
    }
    
    return 'neutral';
  }

  performSpeakerDiarization(transcript, wordTimings) {
    console.log('[Enhanced STT] Performing speaker diarization...');
    
    const speakerCount = Math.floor(Math.random() * 3) + 1;
    const wordsPerSpeaker = Math.ceil(wordTimings.length / speakerCount);
    
    const segments = [];
    const speakers = [];
    
    for (let i = 0; i < speakerCount; i++) {
      const speakerId = `speaker_${i + 1}`;
      const speakerLabel = `Speaker ${String.fromCharCode(65 + i)}`;
      
      speakers.push({
        id: speakerId,
        label: speakerLabel,
        confidence: 0.85 + Math.random() * 0.15,
        duration: 0,
        wordCount: 0,
        emotion: this.getRandomEmotion(),
        gender: ['male', 'female', 'unknown'][Math.floor(Math.random() * 3)],
        age: ['adult', 'teen', 'senior'][Math.floor(Math.random() * 3)]
      });
      
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

    segments.forEach(segment => {
      const speaker = speakers.find(s => s.id === segment.speakerId);
      if (speaker) {
        speaker.duration += segment.duration;
        speaker.wordCount += segment.wordCount;
      }
    });

    return { segments, speakers };
  }

  detectEmotion(transcript, wordTimings) {
    const emotions = ['happy', 'sad', 'angry', 'neutral', 'excited', 'calm', 'confident', 'gentle'];
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

  assessAudioQuality(audio) {
    const noiseLevel = Math.random() * 30;
    const volumeLevel = 60 + Math.random() * 20;
    const clarity = 70 + Math.random() * 25;
    const backgroundNoise = Math.random() * 25;
    const speechToNoiseRatio = 15 + Math.random() * 10;
    
    const overallScore = Math.round(
      (clarity * 0.4 + (100 - noiseLevel) * 0.3 + volumeLevel * 0.2 + speechToNoiseRatio * 4 * 0.1)
    );

    const issues = [];
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
    }

    return {
      overallScore,
      clarity,
      noiseLevel,
      volumeLevel,
      backgroundNoise,
      speechToNoiseRatio,
      qualityIssues: issues,
      recommendations: issues.length > 0 ? issues.map(issue => issue.recommendation) : ['Audio quality is acceptable']
    };
  }

  calculateAudioDuration(audio) {
    const size = typeof audio === 'string' ? audio.length : audio.byteLength;
    return Math.max(1, size / 32); // seconds
  }

  calculateConfidence(transcript, audioQuality, language) {
    let baseConfidence = 0.85;
    baseConfidence += (audioQuality.overallScore - 75) / 100;
    
    if (transcript.split(' ').length < 3) {
      baseConfidence -= 0.1;
    }
    
    const isPrimaryLanguage = ['en-US', 'es-ES', 'fr-FR', 'de-DE', 'zh-CN'].includes(language);
    if (!isPrimaryLanguage) {
      baseConfidence -= 0.05;
    }
    
    return Math.max(0.1, Math.min(0.99, baseConfidence));
  }

  generateCacheKey(options) {
    const keyData = {
      audioSize: typeof options.audio === 'string' ? options.audio.length : 'binary',
      language: options.language,
      quality: options.quality,
      enableDiarization: options.enableDiarization,
      enableEmotion: options.enableEmotion
    };
    
    return Buffer.from(JSON.stringify(keyData)).toString('base64');
  }

  getRandomEmotion() {
    const emotions = ['happy', 'sad', 'angry', 'neutral', 'excited', 'calm', 'confident', 'gentle'];
    return emotions[Math.floor(Math.random() * emotions.length)];
  }

  getCacheStats() {
    return {
      size: this.cache.size,
      hitRate: 0.65 // Mock 65% hit rate
    };
  }

  clearCache() {
    this.cache.clear();
    console.log('[Enhanced STT] Cache cleared');
  }

  getSupportedLanguages() {
    return this.supportedLanguages;
  }

  // Streaming functionality
  createStreamingSession(options) {
    const sessionId = this.generateSessionId();
    const session = {
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

    this.streamingSessions.set(sessionId, session);
    
    console.log('[Streaming STT] Created session:', sessionId);
    return { sessionId };
  }

  async processAudioChunk(sessionId, audioChunk) {
    const session = this.streamingSessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    session.lastActivity = Date.now();
    const chunkSize = typeof audioChunk === 'string' ? audioChunk.length : audioChunk.byteLength;
    session.totalAudioLength += chunkSize;

    // Mock chunk processing
    const shouldProduceResult = Math.random() > 0.7;
    const isPartial = session.options.enablePartialResults && Math.random() > 0.5;

    if (shouldProduceResult) {
      const mockWords = this.generateMockWords(session.options.language);
      const transcript = isPartial ? 
        mockWords.slice(0, Math.ceil(Math.random() * 3)).join(' ') + '...' :
        mockWords.join(' ');

      session.confidence = (session.confidence * 0.8 + (0.75 + Math.random() * 0.2) * 0.2);

      if (!isPartial) {
        session.accumulatedTranscript = session.accumulatedTranscript ? 
          session.accumulatedTranscript + ' ' + transcript : transcript;
      } else {
        session.lastPartialResult = transcript;
      }

      return {
        sessionId,
        isFinal: !isPartial,
        transcript: isPartial ? transcript : session.accumulatedTranscript,
        confidence: session.confidence,
        partial: isPartial,
        language: session.language,
        processingTime: Date.now() - session.startTime,
        audioDuration: session.totalAudioLength / (session.options.sampleRate * 2)
      };
    }

    return {
      sessionId,
      isFinal: false,
      transcript: '',
      confidence: session.confidence,
      partial: false
    };
  }

  endSession(sessionId) {
    const session = this.streamingSessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    const result = {
      sessionId,
      isFinal: true,
      transcript: session.accumulatedTranscript || session.lastPartialResult,
      confidence: session.confidence,
      partial: false,
      language: session.language,
      processingTime: Date.now() - session.startTime,
      audioDuration: session.totalAudioLength / (session.options.sampleRate * 2)
    };

    this.streamingSessions.delete(sessionId);
    console.log('[Streaming STT] Session ended:', sessionId);
    return result;
  }

  getSessionStatus(sessionId) {
    const session = this.streamingSessions.get(sessionId);
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

  generateMockWords(language) {
    const mockWordsByLanguage = {
      'en-US': ['hello', 'this', 'is', 'test', 'streaming', 'speech', 'recognition'],
      'es-ES': ['hola', 'esto', 'es', 'una', 'prueba', 'reconocimiento'],
      'fr-FR': ['bonjour', 'ceci', 'est', 'test', 'reconnaissance'],
      'de-DE': ['hallo', 'dies', 'ist', 'test', 'spracherkennung'],
      'zh-CN': ['你好', '这是', '一个', '测试', '语音', '识别'],
      'ja-JP': ['こんにちは', 'これは', '強化', '音声', '認識']
    };

    const words = mockWordsByLanguage[language] || mockWordsByLanguage['en-US'];
    const wordCount = Math.floor(Math.random() * 5) + 3;
    const selectedWords = [];
    
    for (let i = 0; i < wordCount; i++) {
      selectedWords.push(words[Math.floor(Math.random() * words.length)]);
    }

    return selectedWords;
  }

  generateSessionId() {
    return `stream_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Initialize service
const sttService = new EnhancedSTTService();

// Create Express app
const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Enhanced STT endpoint
app.post('/api/stt/enhanced-transcribe', (req, res) => {
  try {
    console.log('[Enhanced STT Controller] Enhanced transcription request:', {
      audioSize: req.body.audio?.length || 0,
      language: req.body.language,
      quality: req.body.quality
    });

    if (!req.body.audio) {
      throw new Error('Audio data is required for transcription');
    }

    const result = sttService.enhancedTranscribe(req.body);
    
    res.json({
      success: true,
      message: 'Enhanced transcription completed successfully',
      data: result
    });
  } catch (error) {
    console.error('[Enhanced STT Controller] Error in enhanced transcription:', error);
    res.json({
      success: false,
      error: error.message,
      message: `Enhanced transcription failed: ${error.message}`
    });
  }
});

// Streaming endpoints
app.post('/api/stt/stream/session', (req, res) => {
  try {
    console.log('[Enhanced STT Controller] Create streaming session request');
    const result = sttService.createStreamingSession(req.body);
    
    res.json({
      success: true,
      message: 'Streaming session created successfully',
      data: result
    });
  } catch (error) {
    console.error('[Enhanced STT Controller] Error creating streaming session:', error);
    res.json({
      success: false,
      error: error.message,
      message: `Streaming session creation failed: ${error.message}`
    });
  }
});

app.post('/api/stt/stream/session/:id/chunk', (req, res) => {
  try {
    const { id } = req.params;
    console.log('[Enhanced STT Controller] Process audio chunk request:', { sessionId: id });
    
    if (!req.body.audioChunk) {
      throw new Error('Audio chunk is required');
    }

    const result = sttService.processAudioChunk(id, req.body.audioChunk);
    
    res.json({
      success: true,
      message: 'Audio chunk processed successfully',
      data: result
    });
  } catch (error) {
    console.error('[Enhanced STT Controller] Error processing audio chunk:', error);
    res.json({
      success: false,
      error: error.message,
      message: `Audio chunk processing failed: ${error.message}`
    });
  }
});

app.get('/api/stt/stream/session/:id/status', (req, res) => {
  try {
    const { id } = req.params;
    console.log('[Enhanced STT Controller] Get session status request:', { sessionId: id });
    
    const status = sttService.getSessionStatus(id);
    
    res.json({
      success: true,
      message: 'Session status retrieved successfully',
      data: status
    });
  } catch (error) {
    console.error('[Enhanced STT Controller] Error getting session status:', error);
    res.json({
      success: false,
      error: error.message,
      message: `Failed to get session status: ${error.message}`
    });
  }
});

app.post('/api/stt/stream/session/:id/end', (req, res) => {
  try {
    const { id } = req.params;
    console.log('[Enhanced STT Controller] End streaming session request:', { sessionId: id });
    
    const result = sttService.endSession(id);
    
    res.json({
      success: true,
      message: 'Streaming session ended successfully',
      data: result
    });
  } catch (error) {
    console.error('[Enhanced STT Controller] Error ending streaming session:', error);
    res.json({
      success: false,
      error: error.message,
      message: `Streaming session ending failed: ${error.message}`
    });
  }
});

// Additional STT endpoints
app.post('/api/stt/batch', (req, res) => {
  try {
    console.log('[Enhanced STT Controller] Batch transcription request:', {
      itemCount: req.body.items?.length || 0
    });

    if (!req.body.items || req.body.items.length === 0) {
      throw new Error('At least one item is required for batch processing');
    }

    const results = [];
    const errors = [];
    const startTime = Date.now();
    
    for (let i = 0; i < req.body.items.length; i++) {
      try {
        const result = sttService.enhancedTranscribe(req.body.items[i]);
        results.push(result);
      } catch (error) {
        errors.push({
          index: i,
          error: error.message
        });
      }
    }

    const batchResult = {
      requestId: `batch_${Date.now()}`,
      status: 'completed',
      results,
      errors: errors.length > 0 ? errors : undefined,
      totalProcessingTime: Date.now() - startTime,
      parallelProcessing: req.body.enableParallel || false,
      itemCount: req.body.items.length,
      successCount: results.length,
      errorCount: errors.length
    };

    res.json({
      success: true,
      message: `Batch processing completed: ${results.length} successful, ${errors.length} failed`,
      data: batchResult
    });
  } catch (error) {
    console.error('[Enhanced STT Controller] Error in batch transcription:', error);
    res.json({
      success: false,
      error: error.message,
      message: `Batch transcription failed: ${error.message}`
    });
  }
});

app.post('/api/stt/language-detect', (req, res) => {
  try {
    console.log('[Enhanced STT Controller] Language detection request');
    
    if (!req.body.audio) {
      throw new Error('Audio data is required for language detection');
    }

    const result = sttService.enhancedTranscribe({
      audio: req.body.audio,
      enableLanguageDetection: true,
      quality: 'balanced'
    });
    
    res.json({
      success: true,
      message: 'Language detection completed',
      data: {
        detectedLanguage: result.language,
        confidence: 0.85 + Math.random() * 0.1,
        alternatives: []
      }
    });
  } catch (error) {
    console.error('[Enhanced STT Controller] Error in language detection:', error);
    res.json({
      success: false,
      error: error.message,
      message: `Language detection failed: ${error.message}`
    });
  }
});

app.post('/api/stt/emotion-detect', (req, res) => {
  try {
    console.log('[Enhanced STT Controller] Emotion detection request');
    
    if (!req.body.audio) {
      throw new Error('Audio data is required for emotion detection');
    }

    const result = sttService.enhancedTranscribe({
      audio: req.body.audio,
      language: req.body.language || 'en-US',
      enableEmotion: true,
      quality: 'balanced'
    });
    
    res.json({
      success: true,
      message: 'Emotion detection completed',
      data: {
        emotion: result.emotion,
        transcript: result.transcript,
        confidence: result.confidence
      }
    });
  } catch (error) {
    console.error('[Enhanced STT Controller] Error in emotion detection:', error);
    res.json({
      success: false,
      error: error.message,
      message: `Emotion detection failed: ${error.message}`
    });
  }
});

app.post('/api/stt/diarize', (req, res) => {
  try {
    console.log('[Enhanced STT Controller] Speaker diarization request');
    
    if (!req.body.audio) {
      throw new Error('Audio data is required for speaker diarization');
    }

    const result = sttService.enhancedTranscribe({
      audio: req.body.audio,
      language: req.body.language,
      enableDiarization: true,
      enableEmotion: req.body.enableEmotionDetection
    });
    
    const speakers = result.speakerSegments ? 
      this.extractSpeakersFromSegments(result.speakerSegments) : [];

    const diarizationResult = {
      success: true,
      transcript: result.transcript,
      speakers,
      segments: result.speakerSegments || [],
      confidence: result.confidence,
      speakerCount: speakers.length,
      emotion: result.emotion,
      totalDuration: result.duration,
      dominantLanguage: result.language,
      processingTime: result.metadata.processingTime
    };

    res.json({
      success: true,
      message: 'Speaker diarization completed successfully',
      data: diarizationResult
    });
  } catch (error) {
    console.error('[Enhanced STT Controller] Error in speaker diarization:', error);
    res.json({
      success: false,
      error: error.message,
      message: `Speaker diarization failed: ${error.message}`
    });
  }
});

app.get('/api/stt/supported-languages', (req, res) => {
  try {
    console.log('[Enhanced STT Controller] Get supported languages request');
    
    const languages = sttService.getSupportedLanguages();
    
    res.json({
      success: true,
      message: `Retrieved ${languages.length} supported languages`,
      data: {
        languages,
        total: languages.length
      }
    });
  } catch (error) {
    console.error('[Enhanced STT Controller] Error getting supported languages:', error);
    res.json({
      success: false,
      error: error.message,
      message: `Failed to get supported languages: ${error.message}`
    });
  }
});

app.get('/api/stt/cache/stats', (req, res) => {
  try {
    const stats = sttService.getCacheStats();
    
    res.json({
      success: true,
      message: 'Cache statistics retrieved',
      data: stats
    });
  } catch (error) {
    console.error('[Enhanced STT Controller] Error getting cache stats:', error);
    res.json({
      success: false,
      error: error.message,
      message: `Failed to retrieve cache stats: ${error.message}`
    });
  }
});

app.delete('/api/stt/cache', (req, res) => {
  try {
    sttService.clearCache();
    
    res.json({
      success: true,
      message: 'Cache cleared successfully'
    });
  } catch (error) {
    console.error('[Enhanced STT Controller] Error clearing cache:', error);
    res.json({
      success: false,
      error: error.message,
      message: `Failed to clear cache: ${error.message}`
    });
  }
});

function extractSpeakersFromSegments(segments) {
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

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`🎯 Phase 4 Enhanced STT Server running on port ${PORT}`);
  console.log(`📝 API Endpoints:`);
  console.log(`   POST /api/stt/enhanced-transcribe - Enhanced transcription`);
  console.log(`   POST /api/stt/stream/session - Create streaming session`);
  console.log(`   POST /api/stt/stream/session/:id/chunk - Process audio chunk`);
  console.log(`   GET  /api/stt/stream/session/:id/status - Get session status`);
  console.log(`   POST /api/stt/stream/session/:id/end - End streaming session`);
  console.log(`   POST /api/stt/batch - Batch processing`);
  console.log(`   POST /api/stt/language-detect - Language detection`);
  console.log(`   POST /api/stt/emotion-detect - Emotion detection`);
  console.log(`   POST /api/stt/diarize - Speaker diarization`);
  console.log(`   GET  /api/stt/supported-languages - Get supported languages`);
  console.log(`   GET  /api/stt/cache/stats - Cache statistics`);
  console.log(`   DELETE /api/stt/cache - Clear cache`);
  console.log(`\n🌐 Test with: phase4-stt-test.html`);
});