import { TtsProvider } from '../capabilities/tts/interfaces/tts-provider.interface';
import { Readable } from 'stream';

export class MockTtsProvider implements TtsProvider {
    async generateAudio(text: string): Promise<Readable> {
        console.log('MockTTS: returning empty stream for:', text);
        // Return an empty stream or maybe a generated sine wave if we were fancy.
        // For now, just a stream that ends immediately.
        const stream = new Readable();
        stream.push(null); // End of stream
        return stream;
    }
}
