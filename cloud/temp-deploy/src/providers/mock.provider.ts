import { SttProvider, TranscriptPart } from '../capabilities/stt/interfaces/stt-provider.interface';
import { Subject, Observable } from 'rxjs';

const MOCK_PHRASES = [
    "Hello, can you help me with my order?",
    "I'd like to check a recent purchase.",
    "What options do I have for returns?",
    "Can you look up order number twelve three four five?",
];

export class MockSttProvider implements SttProvider {
    private transcriptSubject = new Subject<TranscriptPart>();
    public transcript$ = this.transcriptSubject.asObservable();
    private phraseIndex = 0;
    public instanceId = Math.random().toString(36).substring(7);

    constructor() {
        console.log(`MockSttProvider: Created instance ${this.instanceId}`);
    }

    async processAudio(audioData: any): Promise<TranscriptPart | null> {
        // Randomly decide whether to "detect" speech (for simulation)
        if (Math.random() > 0.7) {
            const phrase = MOCK_PHRASES[this.phraseIndex % MOCK_PHRASES.length];
            this.phraseIndex++;
            return this.injectTranscript(phrase);
        }
        return null;
    }

    public injectTranscript(text: string): TranscriptPart {
        const result: TranscriptPart = {
            speaker: 'customer',
            text: text,
            isFinal: true,
            timestamp: new Date().toISOString()
        };

        console.log(`MockSttProvider [${this.instanceId}]: Emitting transcript to subject: "${text}"`);
        this.transcriptSubject.next(result);
        return result;
    }

    disconnect(): void {
        this.transcriptSubject.complete();
    }
}
