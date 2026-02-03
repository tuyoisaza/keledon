import { createClient, LiveTranscriptionEvents } from '@deepgram/sdk';
import { SttProvider, TranscriptPart } from '../capabilities/stt/interfaces/stt-provider.interface';
import { Subject, Observable } from 'rxjs';

export class DeepgramProvider implements SttProvider {
    private deepgramLive: any;
    private transcriptSubject = new Subject<TranscriptPart>();
    public transcript$: Observable<TranscriptPart> = this.transcriptSubject.asObservable(); // We need a way to emit async events

    constructor(apiKey: string) {
        if (!apiKey) {
            console.error('DeepgramProvider: No API Key provided');
            return;
        }

        try {
            const deepgram = createClient(apiKey);
            console.log('Deepgram Client Initialized');

            this.deepgramLive = deepgram.listen.live({
                model: 'nova-2',
                language: 'es',
                smart_format: true,
            });

            this.deepgramLive.on(LiveTranscriptionEvents.Open, () => {
                console.log('Deepgram Live Connection Opened');
            });

            this.deepgramLive.on(LiveTranscriptionEvents.Transcript, (data: any) => {
                const transcript = data.channel?.alternatives?.[0]?.transcript;
                if (transcript) {
                    this.transcriptSubject.next({
                        speaker: 'agent', // Deepgram doesn't diarize single stream easily without config
                        text: transcript + ' ',
                        isFinal: data.is_final,
                        timestamp: new Date().toLocaleTimeString()
                    });
                }
            });

            this.deepgramLive.on(LiveTranscriptionEvents.Error, (err: any) => {
                console.error('Deepgram Error:', err);
            });

            this.deepgramLive.on(LiveTranscriptionEvents.Close, () => {
                console.log('Deepgram Connection Closed');
            });

        } catch (error) {
            console.error('Failed to init Deepgram:', error);
        }
    }

    async processAudio(chunk: any): Promise<TranscriptPart | null> {
        if (this.deepgramLive && this.deepgramLive.getReadyState() === 1) { // 1 = OPEN
            // Deepgram expects Buffer or Uint8Array
            this.deepgramLive.send(chunk);
        }
        // Deepgram is async, so we don't return here. We rely on the observable.
        // The Interface might need adjustment for async streams vs sync returns.
        return null;
    }

    disconnect() {
        if (this.deepgramLive) {
            this.deepgramLive.finish();
            this.deepgramLive = null;
        }
    }
}
