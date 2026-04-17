import { EventEmitter } from 'events';

// TypeScript declarations for Web Speech API
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

declare var SpeechRecognition: {
  new (): SpeechRecognition;
  prototype: SpeechRecognition;
};

interface SpeechSynthesisUtterance extends EventTarget {
  text: string;
  rate: number;
  pitch: number;
  volume: number;
  onstart: ((this: SpeechSynthesisUtterance, ev: Event) => any) | null;
  onend: ((this: SpeechSynthesisUtterance, ev: Event) => any) | null;
  onerror: ((this: SpeechSynthesisUtterance, ev: Event) => any) | null;
}

interface SpeechSynthesis {
  speak(utterance: SpeechSynthesisUtterance): void;
  cancel(): void;
}

declare var speechSynthesis: SpeechSynthesis;

export interface MediaLayerEvents {
  'transcript': (text: string, isFinal: boolean) => void;
  'call-status': (status: 'idle' | 'in-call' | 'on-hold') => void;
  'audio-level': (level: number) => void;
  'error': (error: Error) => void;
}

export class MediaLayer extends EventEmitter {
  private recognition: SpeechRecognition | null = null;
  private synthesis: SpeechSynthesis | null = null;
  private currentStream: MediaStream | null = null;
  private callStatus: 'idle' | 'in-call' | 'on-hold' = 'idle';
  private isSpeaking: boolean = false;
  private isMuted: boolean = false;

  constructor() {
    super();
    // Defer browser API initialization to initialize() method
    // since window/speechSynthesis are only available in renderer process
  }

  async initialize(): Promise<void> {
    console.log('[MediaLayer] Initializing...');
    this.initializeSpeechRecognition();
    this.initializeSpeechSynthesis();
    console.log('[MediaLayer] Initialized');
  }

  private initializeSpeechRecognition(): void {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn('[MediaLayer] Speech Recognition not supported');
      return;
    }

    this.recognition = new SpeechRecognition();
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.lang = 'en-US';

    this.recognition.onresult = (event: SpeechRecognitionEvent) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        const isFinal = event.results[i].isFinal;
        this.emit('transcript', transcript, isFinal);
      }
    };

    this.recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('[MediaLayer] Recognition error:', event.error);
      this.emit('error', new Error(event.error));
    };

    this.recognition.onend = () => {
      if (this.callStatus === 'in-call') {
        this.recognition?.start();
      }
    };
  }

  private initializeSpeechSynthesis(): void {
    this.synthesis = speechSynthesis;
  }

  async startCall(sessionId?: string): Promise<void> {
    try {
      this.currentStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      this.callStatus = 'in-call';
      this.emit('call-status', this.callStatus);
      
      if (this.recognition) {
        this.recognition.start();
      }
    } catch (error) {
      console.error('[MediaLayer] Failed to start call:', error);
      throw error;
    }
  }

  async stopCall(): Promise<void> {
    if (this.currentStream) {
      this.currentStream.getTracks().forEach(track => track.stop());
      this.currentStream = null;
    }
    
    this.recognition?.stop();
    this.callStatus = 'idle';
    this.emit('call-status', this.callStatus);
  }

  async speak(text: string, interruptible: boolean = true): Promise<void> {
    if (!this.synthesis) {
      console.warn('[MediaLayer] Synthesis not available');
      return;
    }

    if (interruptible && this.isSpeaking) {
      this.synthesis.cancel();
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    utterance.onstart = () => {
      this.isSpeaking = true;
    };

    utterance.onend = () => {
      this.isSpeaking = false;
    };

    utterance.onerror = (event) => {
      console.error('[MediaLayer] TTS error:', event.error);
      this.isSpeaking = false;
    };

    this.synthesis.speak(utterance);
  }

  async stopSpeaking(): Promise<void> {
    this.synthesis?.cancel();
    this.isSpeaking = false;
  }

  mute(): void {
    this.isMuted = true;
    if (this.currentStream) {
      this.currentStream.getAudioTracks().forEach(track => track.enabled = false);
    }
  }

  unmute(): void {
    this.isMuted = false;
    if (this.currentStream) {
      this.currentStream.getAudioTracks().forEach(track => track.enabled = true);
    }
  }

  async hold(): Promise<void> {
    this.callStatus = 'on-hold';
    this.emit('call-status', this.callStatus);
  }

  async resume(): Promise<void> {
    this.callStatus = 'in-call';
    this.emit('call-status', this.callStatus);
  }

  getCallStatus(): { status: 'idle' | 'in-call' | 'on-hold'; isSpeaking: boolean; isMuted: boolean } {
    return {
      status: this.callStatus,
      isSpeaking: this.isSpeaking,
      isMuted: this.isMuted
    };
  }
}

export const mediaLayer = new MediaLayer();