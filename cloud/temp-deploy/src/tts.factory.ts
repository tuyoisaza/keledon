import { Injectable } from '@nestjs/common';
import { TtsProvider } from './capabilities/tts/interfaces/tts-provider.interface';
import { ElevenLabsProvider } from './providers/elevenlabs.provider';
import { MockTtsProvider } from './providers/mock-tts.provider';
import { CoquiTtsProvider } from './providers/coqui-tts.provider';
import { Qwen3TtsProvider } from './providers/qwen3-tts.provider';
import { Socket } from 'socket.io';

@Injectable()
export class TtsFactory {
    private providers = new Map<string, TtsProvider>();

    configure(client: Socket, config: any) {
        const socketId = client.id;
        let provider: TtsProvider;

        const providerId = config.ttsProvider || config.provider || process.env.DEFAULT_TTS_PROVIDER || 'mock';

        if (providerId === 'elevenlabs') {
            const apiKey = config.apiKeys?.elevenlabs || process.env.ELEVENLABS_API_KEY;
            provider = apiKey ? new ElevenLabsProvider(apiKey) : new MockTtsProvider();
        } else if (providerId === 'coqui-xtts-v2') {
            provider = new CoquiTtsProvider({
                apiUrl: config.coquiUrl || process.env.COQUI_TTS_URL,
                apiKey: config.coquiKey || process.env.COQUI_TTS_KEY,
                voice: config.voice || process.env.COQUI_TTS_VOICE,
                language: config.language || process.env.COQUI_TTS_LANGUAGE,
            });
        } else if (providerId === 'qwen3-tts') {
            provider = new Qwen3TtsProvider({
                apiUrl: config.qwen3Url || process.env.QWEN3_TTS_URL,
                apiKey: config.qwen3Key || process.env.QWEN3_TTS_KEY,
                voice: config.voice || process.env.QWEN3_TTS_VOICE,
                language: config.language || process.env.QWEN3_TTS_LANGUAGE,
                speed: config.speed || Number(process.env.QWEN3_TTS_SPEED || 0) || undefined,
                voiceDescription: config.voice_description || config.voiceDescription || process.env.QWEN3_TTS_VOICE_DESCRIPTION,
            });
        } else {
            provider = new MockTtsProvider();
        }

        this.providers.set(socketId, provider);
    }

    getProvider(socketId: string): TtsProvider | undefined {
        return this.providers.get(socketId);
    }

    cleanup(socketId: string) {
        this.providers.delete(socketId);
    }
}
