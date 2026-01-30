/**
 * STT Adapter — Local (Web Speech API)
 * Contract: contracts/v1/audio/text_input.schema.json
 */
export class LocalSttAdapter {
  private recognition: SpeechRecognition | null = null;
  private sessionId: string = '';

  constructor() {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      this.recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
      this.recognition.continuous = false;
      this.recognition.interimResults = false;
      this.recognition.lang = 'en-US';
    }
  }

  start(sessionId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.sessionId = sessionId;
      if (!this.recognition) {
        return reject(new Error('Web Speech API not supported'));
      }

      this.recognition.onresult = (event: SpeechRecognitionEvent) => {
        const transcript = event.results[0][0].transcript;
        const final = event.results[0].isFinal;
        if (final) {
          const payload = {
            type: 'text_input' as const,
            session_id: this.sessionId,
            text: transcript,
            confidence: 0.8,
            is_final: true,
          };
          // Emit via background message or direct callback
          this.onTranscript(payload);
          resolve();
        }
      };

      this.recognition.onerror = (event) => {
        console.error('STT error:', event.error);
        reject(new Error(`STT failed: ${event.error}`));
      };

      this.recognition.start();
    });
  }

  stop(): void {
    if (this.recognition) {
      this.recognition.stop();
    }
  }

  private onTranscript(payload: any): void {
    // To be replaced by actual event emitter or background messaging
    console.log('[STT] Final transcript:', payload);
  }
}