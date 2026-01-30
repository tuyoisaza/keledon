/**
 * Voice Activity Detection (VAD) implementation using Web Audio API
 */
export interface VoiceDetectorOptions {
  /** Energy threshold for voice detection (0.0-1.0) */
  energyThreshold?: number;
  /** Minimum duration of voice to trigger start event (ms) */
  minVoiceDuration?: number;
  /** Minimum duration of silence to trigger stop event (ms) */
  minSilenceDuration?: number;
  /** FFT size for analyser node */
  fftSize?: number;
  /** Smoothing time constant for analyser */
  smoothingTimeConstant?: number;
}

export interface VoiceDetectorEvents {
  onVoiceStart: () => void;
  onVoiceStop: () => void;
  onVoiceActive: (energy: number) => void;
  onError: (error: Error) => void;
}

export class VoiceDetector {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private scriptProcessor: ScriptProcessorNode | null = null;
  private isActive: boolean = false;
  private isListening: boolean = false;
  private lastVoiceState: boolean = false;
  private voiceStartTime: number = 0;
  private silenceStartTime: number = 0;

  private readonly options: Required<VoiceDetectorOptions>;
  private readonly events: Partial<VoiceDetectorEvents>;

  constructor(options: VoiceDetectorOptions = {}, events: Partial<VoiceDetectorEvents> = {}) {
    this.options = {
      energyThreshold: options.energyThreshold ?? 0.01,
      minVoiceDuration: options.minVoiceDuration ?? 200,
      minSilenceDuration: options.minSilenceDuration ?? 500,
      fftSize: options.fftSize ?? 2048,
      smoothingTimeConstant: options.smoothingTimeConstant ?? 0.8,
    };
    
    this.events = events;
  }

  /**
   * Initialize the voice detector with a media stream
   */
  async init(stream: MediaStream): Promise<void> {
    try {
      // Create audio context if not already created
      if (!this.audioContext) {
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      }

      // Create analyser node
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = this.options.fftSize;
      this.analyser.smoothingTimeConstant = this.options.smoothingTimeConstant;

      // Create script processor node for real-time analysis
      const bufferSize = 4096;
      this.scriptProcessor = this.audioContext.createScriptProcessor(bufferSize, 1, 1);

      // Connect nodes: source -> analyser -> scriptProcessor
      this.source = this.audioContext.createMediaStreamSource(stream);
      this.source.connect(this.analyser);
      this.analyser.connect(this.scriptProcessor);
      this.scriptProcessor.connect(this.audioContext.destination);

      // Set up processing callback
      this.scriptProcessor.onaudioprocess = this.handleAudioProcess.bind(this);

      this.isActive = true;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.events.onError?.(err);
      throw err;
    }
  }

  /**
   * Start listening for voice activity
   */
  start(): void {
    if (!this.isActive) {
      throw new Error('VoiceDetector not initialized. Call init() first.');
    }
    
    this.isListening = true;
    this.lastVoiceState = false;
    this.voiceStartTime = 0;
    this.silenceStartTime = 0;
  }

  /**
   * Stop listening for voice activity
   */
  stop(): void {
    this.isListening = false;
  }

  /**
   * Get current voice activity status
   */
  isVoiceActive(): boolean {
    if (!this.isActive || !this.isListening) {
      return false;
    }

    const energy = this.getCurrentEnergy();
    return energy > this.options.energyThreshold;
  }

  /**
   * Calculate current audio energy from analyser data
   */
  private getCurrentEnergy(): number {
    if (!this.analyser) {
      return 0;
    }

    const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(dataArray);

    // Calculate average energy
    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
      sum += dataArray[i];
    }

    // Normalize to 0.0-1.0 range
    return (sum / dataArray.length) / 255;
  }

  /**
   * Handle audio processing in real-time
   */
  private handleAudioProcess(): void {
    if (!this.isListening) {
      return;
    }

    const currentTime = Date.now();
    const energy = this.getCurrentEnergy();
    const isCurrentlyActive = energy > this.options.energyThreshold;

    // Check if we're transitioning from silence to voice
    if (!this.lastVoiceState && isCurrentlyActive) {
      if (this.silenceStartTime === 0) {
        this.silenceStartTime = currentTime;
      }
      
      // Check if we've been in voice state long enough
      if (currentTime - this.silenceStartTime >= this.options.minVoiceDuration) {
        this.lastVoiceState = true;
        this.voiceStartTime = currentTime;
        this.silenceStartTime = 0;
        this.events.onVoiceStart?.();
      }
    } 
    // Check if we're transitioning from voice to silence
    else if (this.lastVoiceState && !isCurrentlyActive) {
      if (this.voiceStartTime === 0) {
        this.voiceStartTime = currentTime;
      }
      
      // Check if we've been in silence long enough
      if (currentTime - this.voiceStartTime >= this.options.minSilenceDuration) {
        this.lastVoiceState = false;
        this.silenceStartTime = currentTime;
        this.voiceStartTime = 0;
        this.events.onVoiceStop?.();
      }
    } 
    // We're staying in the same state, update the appropriate timer
    else {
      if (isCurrentlyActive) {
        this.voiceStartTime = currentTime;
      } else {
        this.silenceStartTime = currentTime;
      }
    }

    // Always emit voice active event with current energy
    if (isCurrentlyActive) {
      this.events.onVoiceActive?.(energy);
    }
  }

  /**
   * Get current audio energy level
   */
  getCurrentLevel(): number {
    return this.getCurrentEnergy();
  }

  /**
   * Update detector options
   */
  setOptions(options: Partial<VoiceDetectorOptions>): void {
    this.options.energyThreshold = options.energyThreshold ?? this.options.energyThreshold;
    this.options.minVoiceDuration = options.minVoiceDuration ?? this.options.minVoiceDuration;
    this.options.minSilenceDuration = options.minSilenceDuration ?? this.options.minSilenceDuration;
    this.options.fftSize = options.fftSize ?? this.options.fftSize;
    this.options.smoothingTimeConstant = options.smoothingTimeConstant ?? this.options.smoothingTimeConstant;
  }

  /**
   * Clean up all resources
   */
  async destroy(): Promise<void> {
    this.stop();

    if (this.scriptProcessor) {
      this.scriptProcessor.disconnect();
      this.scriptProcessor.onaudioprocess = null;
      this.scriptProcessor = null;
    }

    if (this.source) {
      this.source.disconnect();
      this.source = null;
    }

    if (this.analyser) {
      this.analyser.disconnect();
      this.analyser = null;
    }

    if (this.audioContext) {
      if (this.audioContext.state !== 'closed') {
        await this.audioContext.close();
      }
      this.audioContext = null;
    }

    this.isActive = false;
  }

  /**
   * Get current status of the detector
   */
  getStatus(): { isActive: boolean; isListening: boolean; currentEnergy: number } {
    return {
      isActive: this.isActive,
      isListening: this.isListening,
      currentEnergy: this.getCurrentEnergy(),
    };
  }
}