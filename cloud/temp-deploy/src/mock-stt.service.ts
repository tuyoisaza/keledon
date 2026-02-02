// Mock STT service removed - replaced with real STT providers
// Use SttFactory with Deepgram, WhisperX, or Local providers instead
// See: cloud/temp-deploy/src/stt.factory.ts
// This file kept for backward compatibility during migration

import { Injectable } from '@nestjs/common';
import { SttFactory } from './stt.factory';
import { Socket } from 'socket.io';

@Injectable()
export class MockSttService {
    constructor(private readonly sttFactory: SttFactory) {
        console.warn('[MockSttService] DEPRECATED: This service is deprecated. Use SttFactory directly instead.');
    }

    // Redirect to real STT factory
    processAudio(clientSocketId: string, audioChunk: any, client?: Socket) {
        if (client) {
            const provider = this.sttFactory.getProvider(client.id);
            if (provider) {
                return provider.processAudio(audioChunk);
            }
        }
        return null;
    }
}
