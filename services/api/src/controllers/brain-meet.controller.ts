import { BadRequestException, Body, Controller, Get, Header, HttpException, Logger, Post, Req, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { Public } from '../guards/public.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { LLMService } from '../llm/llm.service';
import { VectorStoreService } from '../vector-store/vector-store.service';
import { BrainController } from './brain.controller';
import { BrainMeetGuard } from './brain-meet.guard';
import { ProviderConfigResolver } from '../voice/providers/provider-config.resolver';
import { transcribeConfiguredAudio } from '../voice/providers/configured-stt';
import { runtimeAiBudget } from '../llm/runtime-ai-budget';

@Controller('api/brain/meet/:teamId')
@Public()
@UseGuards(BrainMeetGuard)
export class BrainMeetController {
  private readonly logger = new Logger(BrainMeetController.name);
  constructor(private readonly prisma: PrismaService, private readonly llm: LLMService, private readonly knowledge: VectorStoreService) {}

  @Get('scope')
  @Header('Cache-Control', 'no-store')
  scope(@Req() req: any) {
    const { teamId, teamName, brandId, companyId } = req.runtimeIdentity;
    return { teamId, teamName, brandId, companyId };
  }

  @Post('turn')
  @Header('Cache-Control', 'no-store')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: 384044, files: 1, fields: 1, fieldSize: 50000 } }))
  async turn(@Req() req: any, @UploadedFile() file: any, @Body() body: { history?: string }) {
    const audio: Buffer | undefined = file?.buffer;
    // Accept only bounded mono PCM WAV, not compressed/decompression-bomb input.
    if (!audio || audio.length < 3244 || audio.length > 384044 ||
      audio.toString('ascii', 0, 4) !== 'RIFF' || audio.toString('ascii', 8, 12) !== 'WAVE' ||
      audio.toString('ascii', 12, 16) !== 'fmt ' || audio.readUInt32LE(16) !== 16 ||
      audio.readUInt16LE(20) !== 1 || audio.readUInt16LE(22) !== 1 || audio.readUInt32LE(24) !== 16000 ||
      audio.readUInt32LE(28) !== 32000 || audio.readUInt16LE(32) !== 2 || (audio.length - 44) % 2 !== 0 ||
      audio.readUInt16LE(34) !== 16 || audio.toString('ascii', 36, 40) !== 'data' ||
      audio.readUInt32LE(40) !== audio.length - 44 || audio.readUInt32LE(4) !== audio.length - 8)
      throw new BadRequestException('Expected 0.1–12 seconds of mono 16kHz PCM WAV');
    let history: { role: 'user' | 'assistant'; content: string }[] = [];
    try { history = JSON.parse(body.history || '[]'); } catch { throw new BadRequestException('Invalid conversation history'); }
    if (!Array.isArray(history) || history.length > 6 || history.some(x => !x || !['user','assistant'].includes(x.role) || typeof x.content !== 'string' || x.content.length > 4000))
      throw new BadRequestException('Invalid conversation history');
    let disconnected = false;
    const cancellation = new AbortController();
    const closed = () => { disconnected = true; cancellation.abort(); };
    req.res.once('close', closed);
    const current = () => { if (disconnected) throw new HttpException('Conversation cancelled', 409); };
    let stage: 'PREPARE' | 'STT' | 'BRAIN' = 'PREPARE';
    try {
      await runtimeAiBudget.run(`meet:${req.runtimeIdentity.userId}`, undefined, () => Promise.resolve());
      await this.prisma.auditLog.create({ data: {
        userId: req.runtimeIdentity.userId, entity: 'BRAIN_MEET', entityId: req.runtimeIdentity.teamId,
        action: 'MEET_VOICE_TURN', changes: JSON.stringify({ audioBytes: audio.length, language: 'es' }),
      } });
      const config = await new ProviderConfigResolver(this.prisma).resolveTeamConfig(req.runtimeIdentity.teamId);
      if (!['speaches', 'deepgram'].includes(config.sttProvider))
        throw new HttpException('Selected team requires configured server STT', 503);
      if (config.sttProvider === 'speaches') config.sttModel = 'Systran/faster-whisper-large-v3';
      current();
      stage = 'STT';
      const stt = await transcribeConfiguredAudio(config, audio, 'es', { timeoutMs: 45000, signal: cancellation.signal });
      current();
      const transcript = typeof stt.text === 'string' ? stt.text.trim() : '';
      if (!transcript) return { teamId: req.runtimeIdentity.teamId, transcript: '', reply: '' };
      if (transcript.length > 4000) throw new BadRequestException('Transcription too long');
      stage = 'BRAIN';
      const answer = await new BrainController(this.llm, this.knowledge).chat({
        message: `Conversación de voz: responde en español, en una o dos frases breves, sin acciones externas. El interlocutor dijo: ${transcript}`,
        history, language: 'es', voiceMode: true,
      }, req);
      current();
      return { teamId: req.runtimeIdentity.teamId, transcript, reply: answer.reply.slice(0, 4000) };
    } catch (error) {
      if (disconnected) throw new HttpException('Conversation cancelled', 409);
      const message = error instanceof Error ? error.message : '';
      if (message === 'AI request budget exceeded') throw new HttpException('Conversation spending limit reached', 429);
      if (message === 'AI integration disabled') throw new HttpException('Conversation disabled by spending controls', 503);
      if (error instanceof HttpException && error.getStatus() !== 500) throw error;
      const upstream = /provider returned HTTP (\d{3})$/.exec(message)?.[1];
      const reason = upstream ? `HTTP_${upstream}` : /timeout/i.test(message) ? 'TIMEOUT' : 'UNAVAILABLE';
      const code = `MEET_${stage}_${reason}`;
      // Global 5xx bodies remain redacted. This route exposes only its bounded safe code.
      req.res.setHeader('X-Keledon-Voice-Error', code);
      // Allowlisted metadata only: never error text, endpoint, prompt, audio or credentials.
      this.logger.warn(JSON.stringify({ event: 'meet.voice.failure', stage, code }));
      throw new HttpException({ statusCode: 502, message: `Configured team ${stage} unavailable`, code, stage }, 502);
    } finally { req.res.removeListener('close', closed); }
  }
}
