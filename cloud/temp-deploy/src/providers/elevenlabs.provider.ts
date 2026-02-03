import { ElevenLabsClient } from 'elevenlabs';
import { TtsProvider } from '../capabilities/tts/interfaces/tts-provider.interface';
import { Readable } from 'stream';

export class ElevenLabsProvider implements TtsProvider {
    private client: ElevenLabsClient;

    constructor(apiKey: string) {
        if (!apiKey) {
            console.error('ElevenLabsProvider: No API Key provided');
            return;
        }
        this.client = new ElevenLabsClient({ apiKey });
    }

    async generateAudio(text: string): Promise<Readable> {
        if (!this.client) {
            throw new Error('ElevenLabs client not initialized');
        }

        try {
            console.log('ElevenLabs: Generating audio for:', text);
            const audioStream = await this.client.generate({
                voice: "Sarah", // Standard friendly voice
                model_id: "eleven_multilingual_v2", // Better for Spanish/English mix
                text: text,
                stream: true,
            });

            return audioStream as unknown as Readable; // SDK types might mismatch Node streams slightly
        } catch (error) {
            console.error('ElevenLabs Error:', error);
            throw error;
        }
    }
}
