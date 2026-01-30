import { Readable } from 'stream';
import { TtsProvider } from '../capabilities/tts/interfaces/tts-provider.interface';

interface Qwen3TtsConfig {
    apiUrl: string;
    apiKey?: string;
    voice?: string;
    language?: string;
    speed?: number;
    voiceDescription?: string;
}

export class Qwen3TtsProvider implements TtsProvider {
    private apiUrl: string;
    private apiKey?: string;
    private voice?: string;
    private language?: string;
    private speed?: number;
    private voiceDescription?: string;

    constructor(config: Qwen3TtsConfig) {
        this.apiUrl = config.apiUrl;
        this.apiKey = config.apiKey;
        this.voice = config.voice;
        this.language = config.language;
        this.speed = config.speed;
        this.voiceDescription = config.voiceDescription;

        if (!this.apiUrl) {
            console.error('Qwen3TtsProvider: No API URL provided');
        }
    }

    async generateAudio(text: string): Promise<Readable> {
        if (!this.apiUrl) {
            throw new Error('Qwen3TtsProvider: Missing API URL');
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
                voice_description: this.voiceDescription,
                language: this.language,
                speed: this.speed
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Qwen3 TTS error: ${response.status} ${response.statusText} - ${errorText}`);
        }

        const contentType = response.headers.get('content-type') || '';
        let audioBuffer: Buffer;

        if (contentType.includes('application/json')) {
            const data = await response.json();
            const base64 = data.audio || data.audio_base64 || data.data;
            if (!base64) throw new Error('Qwen3 TTS: Missing audio payload');
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
