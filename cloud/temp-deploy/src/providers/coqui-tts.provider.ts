import { Readable } from 'stream';
import { TtsProvider } from '../capabilities/tts/interfaces/tts-provider.interface';

interface CoquiTtsConfig {
    apiUrl: string;
    apiKey?: string;
    voice?: string;
    language?: string;
}

export class CoquiTtsProvider implements TtsProvider {
    private apiUrl: string;
    private apiKey?: string;
    private voice?: string;
    private language?: string;

    constructor(config: CoquiTtsConfig) {
        this.apiUrl = config.apiUrl;
        this.apiKey = config.apiKey;
        this.voice = config.voice;
        this.language = config.language;

        if (!this.apiUrl) {
            console.error('CoquiTtsProvider: No API URL provided');
        }
    }

    async generateAudio(text: string): Promise<Readable> {
        if (!this.apiUrl) {
            throw new Error('CoquiTtsProvider: Missing API URL');
        }

        const response = await fetch(this.apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {})
            },
            body: JSON.stringify({
                text,
                voice: this.voice,
                language: this.language
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Coqui TTS error: ${response.status} ${response.statusText} - ${errorText}`);
        }

        const contentType = response.headers.get('content-type') || '';
        let audioBuffer: Buffer;

        if (contentType.includes('application/json')) {
            const data = await response.json();
            const base64 = data.audio || data.audio_base64 || data.data;
            if (!base64) throw new Error('Coqui TTS: Missing audio payload');
            audioBuffer = Buffer.from(base64, 'base64');
        } else {
            const arrayBuffer = await response.arrayBuffer();
            audioBuffer = Buffer.from(arrayBuffer);
        }

        const stream = new Readable();
        stream.push(audioBuffer);
        stream.push(null);
        return stream;
    }
}
