import { EventEmitter } from 'events';

export interface EscalationMatch {
  trigger: string;
  transcript: string;
  timestamp: string;
}

export class TranscriptMonitor extends EventEmitter {
  private triggers: string[] = [];
  private isMonitoring: boolean = false;
  private lastTranscript: string = '';
  private lastAlertTime: number = 0;
  private mediaLayer: any = null;

  constructor() {
    super();
  }

  setMediaLayer(mediaLayerInstance: any): void {
    this.mediaLayer = mediaLayerInstance;
  }

  setTriggers(triggers: string[]): void {
    this.triggers = triggers.map(t => t.toLowerCase());
    console.log('[TranscriptMonitor] Triggers updated:', this.triggers.length);
  }

  startMonitoring(): void {
    if (this.isMonitoring || !this.mediaLayer) return;
    
    this.isMonitoring = true;
    console.log('[TranscriptMonitor] Started');
    
    this.mediaLayer.on('transcript', (text: string, isFinal: boolean) => {
      if (isFinal) {
        this.checkTranscript(text);
      }
    });
  }

  stopMonitoring(): void {
    this.isMonitoring = false;
    console.log('[TranscriptMonitor] Stopped');
  }

  private checkTranscript(text: string): void {
    if (!text || text.trim().length < 3) return;
    
    const lowerText = text.toLowerCase();
    
    for (const trigger of this.triggers) {
      if (lowerText.includes(trigger)) {
        this.triggerEscalation(trigger, text);
        return;
      }
    }
    
    this.lastTranscript = text;
  }

  private triggerEscalation(trigger: string, transcript: string): void {
    const now = Date.now();
    
    if (now - this.lastAlertTime < 30000) {
      console.log('[TranscriptMonitor] Debouncing alert for:', trigger);
      return;
    }
    
    this.lastAlertTime = now;
    
    const match: EscalationMatch = {
      trigger,
      transcript,
      timestamp: new Date().toISOString()
    };
    
    console.log('[TranscriptMonitor] ESCALATION TRIGGERED:', trigger);
    console.log('[TranscriptMonitor] Transcript:', transcript);
    
    this.emit('escalation', match);
  }

  getLastTranscript(): string {
    return this.lastTranscript;
  }

  getActiveTriggers(): string[] {
    return [...this.triggers];
  }
}

export const transcriptMonitor = new TranscriptMonitor();