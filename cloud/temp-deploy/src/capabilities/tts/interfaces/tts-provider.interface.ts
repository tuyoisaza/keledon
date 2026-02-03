import { Readable } from 'stream';

export interface TtsProvider {
    /**
     * Generates audio from text and returns a readable stream of binary audio data.
     */
    generateAudio(text: string): Promise<Readable>;
}
