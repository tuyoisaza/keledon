import { SttProvider, TranscriptPart } from '../capabilities/stt/interfaces/stt-provider.interface';
import { Subject, Observable } from 'rxjs';

export class WhisperXProvider implements SttProvider {
    private transcriptSubject = new Subject<TranscriptPart>();
    public transcript$: Observable<TranscriptPart> = this.transcriptSubject.asObservable();

    private apiUrl: string;
    private apiKey?: string;
    private audioBuffer: number[] = [];
    private bufferThreshold = 16000 * 2 * 3; // ~3 seconds of audio at 16kHz (assumes Int16 input)
    private isProcessing = false;

    constructor(config: { apiUrl: string; apiKey?: string }) {
        this.apiUrl = config.apiUrl;
        this.apiKey = config.apiKey;

        if (!this.apiUrl) {
            console.error('WhisperXProvider: No API URL provided');
        } else {
            console.log('WhisperXProvider initialized with URL:', this.apiUrl);
        }
    }

    async processAudio(chunk: any): Promise<TranscriptPart | null> {
        if (!this.apiUrl) return null;

        // chunk is likely generic Buffer or Uint8Array.
        // We assume incoming data is raw PCM 16-bit LE (standard for WebAudio capture converted)
        // Accumulate
        if (chunk && chunk.length > 0) {
            // Convert Buffer to array numbers for simple concatenation (inefficient but safe for now)
            // Better: use Buffer.concat
            const buffer = chunk instanceof Buffer ? chunk : Buffer.from(chunk);
            for (const byte of buffer) {
                this.audioBuffer.push(byte);
            }
        }

        // Check threshold
        if (this.audioBuffer.length >= this.bufferThreshold && !this.isProcessing) {
            this.flushAndTranscribe();
        }

        return null;
    }

    private async flushAndTranscribe() {
        if (this.audioBuffer.length === 0) return;
        this.isProcessing = true;

        // Move buffer to processing
        const rawData = Buffer.from(this.audioBuffer);
        this.audioBuffer = []; // Clear main buffer

        try {
            // Add WAV Header
            const wavData = this.addWavHeader(rawData);

            // Send to WhisperX
            const response = await fetch(this.apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'audio/wav',
                    ...(this.apiKey ? { 'Authorization': `Bearer ${this.apiKey}` } : {})
                },
                body: new Uint8Array(wavData) // Convert Buffer to Uint8Array for fetch compatibility
            });

            if (!response.ok) {
                console.error(`WhisperX API Error: ${response.status} ${response.statusText}`);
                const text = await response.text();
                console.error('Body:', text);
            } else {
                const data = await response.json();
                this.handleResponse(data);
            }
        } catch (error) {
            console.error('WhisperX Transcription Failed:', error);
        } finally {
            this.isProcessing = false;
            // If buffer filled up again while processing, we might want to trigger again?
            // For now, simple logic.
        }
    }

    private handleResponse(data: any) {
        // Expected format: { segments: [{ text, speaker, start, end }] }
        if (data && data.segments) {
            for (const segment of data.segments) {
                this.transcriptSubject.next({
                    text: segment.text,
                    speaker: this.mapSpeaker(segment.speaker),
                    isFinal: true, // WhisperX results are usually final
                    timestamp: new Date().toISOString()
                });
            }
        } else if (data && data.text) {
            // Fallback for non-diarized output
            this.transcriptSubject.next({
                text: data.text,
                speaker: 'agent',
                isFinal: true,
                timestamp: new Date().toISOString()
            });
        }
    }

    private mapSpeaker(speakerFn?: string): 'agent' | 'customer' {
        // Simple mapping: SPEAKER_00 -> agent, others -> customer
        if (!speakerFn) return 'agent';
        // Normalize
        const s = speakerFn.toUpperCase();
        if (s.endsWith('00')) return 'agent';
        return 'customer';
    }

    private addWavHeader(samples: Buffer): Buffer {
        // Assume 16kHz, 1 channel, 16-bit
        const sampleRate = 16000;
        const numChannels = 1;
        const bitsPerSample = 16;

        const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
        const blockAlign = (numChannels * bitsPerSample) / 8;
        const dataSize = samples.length;
        const chunkSize = 36 + dataSize;

        const header = Buffer.alloc(44);

        // RIFF chunk
        header.write('RIFF', 0);
        header.writeUInt32LE(chunkSize, 4);
        header.write('WAVE', 8);

        // fmt chunk
        header.write('fmt ', 12);
        header.writeUInt32LE(16, 16); // Subchunk1Size (16 for PCM)
        header.writeUInt16LE(1, 20); // AudioFormat (1 for PCM)
        header.writeUInt16LE(numChannels, 22);
        header.writeUInt32LE(sampleRate, 24);
        header.writeUInt32LE(byteRate, 28);
        header.writeUInt16LE(blockAlign, 32);
        header.writeUInt16LE(bitsPerSample, 34);

        // data chunk
        header.write('data', 36);
        header.writeUInt32LE(dataSize, 40);

        return Buffer.concat([header, samples]);
    }

    disconnect() {
        this.transcriptSubject.complete();
    }
}
