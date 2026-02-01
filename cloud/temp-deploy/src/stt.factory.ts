import { Injectable } from '@nestjs/common';
import { SttProvider } from './capabilities/stt/interfaces/stt-provider.interface';
import { DeepgramProvider } from './providers/deepgram.provider';
import { WhisperXProvider } from './providers/whisperx.provider';
import { LocalSttProvider } from './providers/local-stt.provider';
import { Socket } from 'socket.io'; // For emitting events directly?

@Injectable()
export class SttFactory {
    constructor() {
        console.log('SttFactory: Initialized instance');
    }

    private providers = new Map<string, SttProvider>();
    private subscriptions = new Map<string, any>();

    configure(client: Socket, config: any) {
        const socketId = client.id;

        // Cleanup existing
        this.cleanup(socketId);

        const providerId = config.sttProvider || config.provider || process.env.DEFAULT_STT_PROVIDER;
        console.log(`Configuring STT for ${socketId}:`, providerId);

        let provider: SttProvider;

        if (providerId === 'deepgram') {
            const apiKey = config.apiKeys?.deepgram || process.env.DEEPGRAM_API_KEY;
            const dgProvider = new DeepgramProvider(apiKey);
            // Subscribe to its stream
            const sub = dgProvider.transcript$.subscribe((part) => {
                client.emit('transcript-part', part);
            });
            this.subscriptions.set(socketId, sub);
            provider = dgProvider;
        } else if (providerId === 'whisperx') {
            const apiUrl = config.whisperxUrl || process.env.WHISPERX_API_URL;
            const apiKey = config.whisperxKey || process.env.WHISPERX_API_KEY;

            const wxProvider = new WhisperXProvider({ apiUrl, apiKey });
            const sub = wxProvider.transcript$.subscribe((part) => {
                client.emit('transcript-part', part);
            });
            this.subscriptions.set(socketId, sub);
            provider = wxProvider;
        } else if (providerId === 'whisper') {
            const apiUrl = config.whisperUrl || process.env.WHISPER_API_URL;
            const apiKey = config.whisperKey || process.env.WHISPER_API_KEY;
            const localProvider = new LocalSttProvider({ apiUrl, apiKey });
            const sub = localProvider.transcript$.subscribe((part) => {
                client.emit('transcript-part', part);
            });
            this.subscriptions.set(socketId, sub);
            provider = localProvider;
        } else {
            throw new Error(`STT Factory: Unsupported provider '${providerId}' for ${socketId}. Mock providers have been removed.`);
        }

        this.providers.set(socketId, provider);
    }

    getProvider(socketId: string): SttProvider | undefined {
        return this.providers.get(socketId);
    }

    cleanup(socketId: string) {
        const provider = this.providers.get(socketId);
        if (provider && provider.disconnect) {
            provider.disconnect();
        }

        const sub = this.subscriptions.get(socketId);
        if (sub) {
            sub.unsubscribe();
        }

        this.providers.delete(socketId);
        this.subscriptions.delete(socketId);
    }
}
