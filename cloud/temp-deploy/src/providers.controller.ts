import { Body, Controller, HttpException, HttpStatus, Param, Post } from '@nestjs/common';
import { Readable } from 'stream';
import { RpaFactory } from './rpa.factory';
import { RpaProviderConfig, StandardAction } from './capabilities/rpa/interfaces/rpa-provider.interface';
import { CoquiTtsProvider } from './providers/coqui-tts.provider';
import { Qwen3TtsProvider } from './providers/qwen3-tts.provider';
import { ElevenLabsProvider } from './providers/elevenlabs.provider';
import { MockTtsProvider } from './providers/mock-tts.provider';

interface SttRequestBody {
    audio: string;
    contentType?: string;
    sampleRate?: number;
    apiUrl?: string;
    apiKey?: string;
    language?: string;
}

interface TtsRequestBody {
    text: string;
    apiUrl?: string;
    apiKey?: string;
    voice?: string;
    voiceId?: string;
    voice_description?: string;
    voiceDescription?: string;
    language?: string;
    speed?: number;
}

interface RpaActionBody {
    action: StandardAction;
    variables?: Record<string, string>;
    config?: Partial<RpaProviderConfig>;
}

interface RpaWorkflowBody {
    actions: StandardAction[];
    variables?: Record<string, string>;
    config?: Partial<RpaProviderConfig>;
}

@Controller()
export class ProvidersController {
    constructor(private readonly rpaFactory: RpaFactory) { }

    @Post('stt/:provider')
    async transcribe(@Param('provider') provider: string, @Body() body: SttRequestBody) {
        if (!body?.audio) {
            throw new HttpException('audio is required (base64)', HttpStatus.BAD_REQUEST);
        }

        if (provider === 'deepgram' || provider === 'webspeech-stt') {
            throw new HttpException('Provider is streaming-only; use WebSocket', HttpStatus.NOT_IMPLEMENTED);
        }

        const apiConfig = this.resolveSttConfig(provider, body);
        if (!apiConfig.apiUrl) {
            throw new HttpException('Missing STT API URL', HttpStatus.BAD_REQUEST);
        }
        const audioBuffer = this.buildAudioBuffer(body);

        const response = await fetch(apiConfig.apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'audio/wav',
                ...(apiConfig.apiKey ? { Authorization: `Bearer ${apiConfig.apiKey}` } : {}),
            },
            body: new Uint8Array(audioBuffer),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new HttpException(
                `STT provider error (${response.status}): ${errorText}`,
                HttpStatus.BAD_GATEWAY,
            );
        }

        const data = await response.json();
        return {
            provider,
            transcript: data?.text || '',
            segments: data?.segments || [],
            raw: data,
        };
    }

    @Post('tts/:provider')
    async synthesize(@Param('provider') provider: string, @Body() body: TtsRequestBody) {
        if (!body?.text) {
            throw new HttpException('text is required', HttpStatus.BAD_REQUEST);
        }

        if (provider === 'webspeech-tts') {
            throw new HttpException('Provider is browser-only', HttpStatus.NOT_IMPLEMENTED);
        }

        const ttsProvider = this.createTtsProvider(provider, body);
        const audioStream = await ttsProvider.generateAudio(body.text);
        const audioBuffer = await this.streamToBuffer(audioStream);

        return {
            provider,
            contentType: this.getTtsContentType(provider),
            audio: audioBuffer.toString('base64'),
        };
    }

    @Post('rpa/:provider')
    async executeRpa(@Param('provider') provider: string, @Body() body: RpaActionBody) {
        if (!body?.action) {
            throw new HttpException('action is required', HttpStatus.BAD_REQUEST);
        }

        const action = this.ensureActionId(body.action);
        const variables = body.variables || {};
        const config = this.buildRpaConfig(provider, body.config);

        await this.rpaFactory.configure(provider, config);
        const result = await this.rpaFactory.execute(action, variables);
        return { provider, result };
    }

    @Post('rpa/:provider/workflows')
    async executeRpaWorkflow(@Param('provider') provider: string, @Body() body: RpaWorkflowBody) {
        if (!body?.actions || !Array.isArray(body.actions) || body.actions.length === 0) {
            throw new HttpException('actions are required', HttpStatus.BAD_REQUEST);
        }

        const actions = body.actions.map(action => this.ensureActionId(action));
        const variables = body.variables || {};
        const config = this.buildRpaConfig(provider, body.config);

        await this.rpaFactory.configure(provider, config);
        const activeProvider = this.rpaFactory.getProvider(provider);
        if (!activeProvider) {
            throw new HttpException('Unknown RPA provider', HttpStatus.BAD_REQUEST);
        }

        const results = await activeProvider.executeWorkflow(actions, variables);
        return { provider, results };
    }

    private resolveSttConfig(provider: string, body: SttRequestBody) {
        const normalized = provider.toLowerCase();
        if (normalized === 'whisperx') {
            return {
                apiUrl: body.apiUrl || process.env.WHISPERX_API_URL,
                apiKey: body.apiKey || process.env.WHISPERX_API_KEY,
            };
        }

        if (normalized === 'whisper') {
            return {
                apiUrl: body.apiUrl || process.env.WHISPER_API_URL,
                apiKey: body.apiKey || process.env.WHISPER_API_KEY,
            };
        }

        throw new HttpException('Unsupported STT provider', HttpStatus.BAD_REQUEST);
    }

    private buildAudioBuffer(body: SttRequestBody): Buffer {
        const rawBuffer = Buffer.from(body.audio, 'base64');
        const contentType = (body.contentType || 'audio/pcm').toLowerCase();
        if (contentType.includes('wav')) {
            return rawBuffer;
        }

        const sampleRate = body.sampleRate || 16000;
        return this.addWavHeader(rawBuffer, sampleRate);
    }

    private addWavHeader(samples: Buffer, sampleRate: number): Buffer {
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

    private createTtsProvider(provider: string, body: TtsRequestBody) {
        const normalized = provider.toLowerCase();
        if (normalized === 'elevenlabs') {
            const apiKey = body.apiKey || process.env.ELEVENLABS_API_KEY;
            if (!apiKey) {
                throw new HttpException('Missing ElevenLabs API key', HttpStatus.BAD_REQUEST);
            }
            return new ElevenLabsProvider(apiKey);
        }

        if (normalized === 'coqui-xtts-v2') {
            const apiUrl = body.apiUrl || process.env.COQUI_TTS_URL;
            if (!apiUrl) {
                throw new HttpException('Missing Coqui TTS API URL', HttpStatus.BAD_REQUEST);
            }
            return new CoquiTtsProvider({
                apiUrl,
                apiKey: body.apiKey || process.env.COQUI_TTS_KEY,
                voice: body.voiceId || body.voice || process.env.COQUI_TTS_VOICE,
                language: body.language || process.env.COQUI_TTS_LANGUAGE,
            });
        }

        if (normalized === 'qwen3-tts') {
            const apiUrl = body.apiUrl || process.env.QWEN3_TTS_URL;
            if (!apiUrl) {
                throw new HttpException('Missing Qwen3 TTS API URL', HttpStatus.BAD_REQUEST);
            }
            const speed = body.speed ?? (process.env.QWEN3_TTS_SPEED ? Number(process.env.QWEN3_TTS_SPEED) : undefined);
            return new Qwen3TtsProvider({
                apiUrl,
                apiKey: body.apiKey || process.env.QWEN3_TTS_KEY,
                voice: body.voiceId || body.voice || process.env.QWEN3_TTS_VOICE,
                voiceDescription: body.voiceDescription || body.voice_description || process.env.QWEN3_TTS_VOICE_DESCRIPTION,
                language: body.language || process.env.QWEN3_TTS_LANGUAGE,
                speed,
            });
        }

        if (normalized === 'mock') {
            return new MockTtsProvider();
        }

        throw new HttpException('Unsupported TTS provider', HttpStatus.BAD_REQUEST);
    }

    private getTtsContentType(provider: string) {
        const normalized = provider.toLowerCase();
        if (normalized === 'elevenlabs') {
            return 'audio/mpeg';
        }
        if (normalized === 'mock') {
            return 'application/octet-stream';
        }
        return 'audio/wav';
    }

    private async streamToBuffer(stream: Readable): Promise<Buffer> {
        return new Promise((resolve, reject) => {
            const chunks: Buffer[] = [];
            stream.on('data', (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
            stream.on('end', () => resolve(Buffer.concat(chunks)));
            stream.on('error', reject);
        });
    }

    private ensureActionId(action: StandardAction): StandardAction {
        if (action.id) return action;
        return { ...action, id: `action_${Date.now()}` };
    }

    private buildRpaConfig(provider: string, config?: Partial<RpaProviderConfig>): RpaProviderConfig {
        return {
            provider: provider as RpaProviderConfig['provider'],
            ...config,
        };
    }
}
