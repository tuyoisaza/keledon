/**
 * local.adapter.ts — TTS Adapter (Web Speech API)
 * 
 * Contract: https://github.com/keledon/contracts/v1/audio/speak.schema.json
 * Implements: text → audible speech, locally only.
 */

export class LocalTtsAdapter {
  private utteranceQueue: SpeechSynthesisUtterance[] = [];
  private isSpeaking = false;

  constructor(private readonly sessionId: string) {}

  async speak(params: {
    text: string;
    interruptible: boolean;
    priority?: 'normal' | 'high';
  }): Promise<void> {
    const utterance = new SpeechSynthesisUtterance(params.text);
    utterance.lang = 'en-US';
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    // Interrupt handling
    if (params.interruptible && this.isSpeaking) {
      speechSynthesis.cancel();
    }

    return new Promise((resolve) => {
      utterance.onend = () => {
        this.isSpeaking = false;
        resolve();
      };

      utterance.onerror = () => {
        this.isSpeaking = false;
        resolve();
      };

      this.isSpeaking = true;
      speechSynthesis.speak(utterance);
    });
  }

  destroy(): void {
    speechSynthesis.cancel();
    this.utteranceQueue = [];
    this.isSpeaking = false;
  }
}