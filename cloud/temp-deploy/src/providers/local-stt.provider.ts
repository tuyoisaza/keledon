import { SttProvider, TranscriptPart } from '../capabilities/stt/interfaces/stt-provider.interface';
import { Subject, Observable } from 'rxjs';

interface LocalSttConfig {
    apiUrl: string;
    apiKey?: string;
    bufferSeconds?: number;
}

export class LocalSttProvider implements SttProvider {
    private transcriptSubject = new Subject<TranscriptPart>();
    public transcript$: Observable<TranscriptPart> = this.transcriptSubject.asObservable();

    private apiUrl: string;
    private apiKey?: string;
    private audioBuffer: number[] = [];
    private bufferThreshold: number;
    private isProcessing = false;

    constructor(config: LocalSttConfig) {
        this.apiUrl = config.apiUrl;
        this.apiKey = config.apiKey;
        const bufferSeconds = config.bufferSeconds ?? 2.5;
        this.bufferThreshold = Math.floor(16000 * 2 * bufferSeconds);

        if (!this.apiUrl) {
            console.error('LocalSttProvider: No API URL provided');
        } else {
            console.log('LocalSttProvider initialized with URL:', this.apiUrl);
        }
    }

    async processAudio(chunk: any): Promise<TranscriptPart | null> {
        if (!this.apiUrl) return null;

        if (chunk && chunk.length > 0) {
            const buffer = chunk instanceof Buffer ? chunk : Buffer.from(chunk);
            for (const byte of buffer) {
                this.audioBuffer.push(byte);
            }
        }

        if (this.audioBuffer.length >= this.bufferThreshold && !this.isProcessing) {
            this.flushAndTranscribe();
        }

        return null;
    }

    private async flushAndTranscribe() {
        if (this.audioBuffer.length === 0 || !this.apiUrl) return;
        this.isProcessing = true;

        const rawData = Buffer.from(this.audioBuffer);
        this.audioBuffer = [];

        try {
            const wavData = this.addWavHeader(rawData);
            const response = await fetch(this.apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'audio/wav',
                    ...(this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {})
                },
                body: new Uint8Array(wavData)
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error(`Local STT Error: ${response.status} ${response.statusText} - ${errorText}`);
                return;
            }

            const data = await response.json();
            this.handleResponse(data);
        } catch (error) {
            console.error('Local STT transcription failed:', error);
        } finally {
            this.isProcessing = false;
        }
    }

    private handleResponse(data: any) {
        if (!data) return;

        if (Array.isArray(data.segments)) {
            data.segments.forEach((segment: any) => {
                if (!segment?.text) return;
                this.transcriptSubject.next({
                    text: segment.text,
                    speaker: this.mapSpeaker(segment.speaker),
                    isFinal: segment.is_final ?? true,
                    timestamp: new Date().toISOString()
                });
            });
            return;
        }

        if (typeof data.text === 'string' && data.text.trim().length > 0) {
            this.transcriptSubject.next({
                text: data.text,
                speaker: 'customer',
                isFinal: true,
                timestamp: new Date().toISOString()
            });
        }
    }

    private mapSpeaker(speaker?: string): 'agent' | 'customer' {
        if (!speaker) return 'customer';
        const normalized = speaker.toUpperCase();
        if (normalized.endsWith('00') || normalized.includes('AGENT')) return 'agent';
        return 'customer';
    }

    private addWavHeader(samples: Buffer): Buffer {
        const sampleRate = 16000;
        const numChannels = 1;
        const bitsPerSample = 16;

        const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
        const blockAlign = (numChannels * bitsPerSample) / 8;
        const dataSize = samples.length;
        const chunkSize = 36 + dataSize;

        const header = Buffer.alloc(44);
        header.write('RIFF', 0);
        header.writeUInt32LE(chunkSize, 4);
        header.write('WAVE', 8);

        header.write('fmt ', 12);
        header.writeUInt32LE(16, 16);
        header.writeUInt16LE(1, 20);
        header.writeUInt16LE(numChannels, 22);
        header.writeUInt32LE(sampleRate, 24);
        header.writeUInt32LE(byteRate, 28);
        header.writeUInt16LE(blockAlign, 32);
        header.writeUInt16LE(bitsPerSample, 34);

        header.write('data', 36);
        header.writeUInt32LE(dataSize, 40);

        return Buffer.concat([header, samples]);
    }

    disconnect() {
        this.transcriptSubject.complete();
    }
}
