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
import { getVendorAllowedOrigins } from '../vendor-url-policy';
import { InterfaceControlService } from '../interface-control/interface-control.service';

@Controller('api/brain/meet/:teamId')
@Public()
@UseGuards(BrainMeetGuard)
export class BrainMeetController {
  private readonly logger = new Logger(BrainMeetController.name);
  constructor(private readonly prisma: PrismaService, private readonly llm: LLMService, private readonly knowledge: VectorStoreService, private readonly interfaces: InterfaceControlService) {}

  private async charge(req: any) {
    try { await runtimeAiBudget.run(`meet:${req.runtimeIdentity.userId}`, undefined, () => Promise.resolve()); }
    catch (error) {
      if (error instanceof Error && error.message === 'AI request budget exceeded') throw new HttpException('Conversation spending limit reached', 429);
      if (error instanceof Error && error.message === 'AI integration disabled') throw new HttpException('Conversation disabled by spending controls', 503);
      throw error;
    }
  }

  @Get('scope')
  @Header('Cache-Control', 'no-store')
  scope(@Req() req: any) {
    const { teamId, teamName, brandId, companyId } = req.runtimeIdentity;
    return { teamId, teamName, brandId, companyId };
  }

  @Get('crm')
  @Header('Cache-Control', 'no-store')
  async crm(@Req() req: any) {
    // Never fetch credential columns or let a client invent tenant destinations.
    const vendors = await this.prisma.vendor.findMany({ where: { teamId: req.runtimeIdentity.teamId, type: 'crm', isActive: true }, select: { id: true, baseUrl: true, config: true } });
    const destinations = vendors.flatMap(v => getVendorAllowedOrigins(v.baseUrl, (v.config as any)?.allowedOrigins)
      .filter(origin => /^https:\/\/[a-z0-9-]+\.(?:lightning\.force\.com|my\.salesforce\.com)$/.test(origin))
      .map(origin => ({ vendorId: v.id, origin })));
    return { teamId: req.runtimeIdentity.teamId, destinations };
  }

  @Post('crm-scope')
  @Header('Cache-Control', 'no-store')
  async crmScope(@Req() req: any, @Body() body: { vendorId?: string; origin?: string }) {
    const choices = await this.crm(req);
    const match = choices.destinations.find(d => d.vendorId === body?.vendorId && d.origin === body?.origin);
    if (!match) throw new BadRequestException('Active Salesforce destination for selected team required');
    await this.prisma.auditLog.create({ data: { userId: req.runtimeIdentity.userId, entity: 'BRAIN_MEET', entityId: req.runtimeIdentity.teamId, action: 'MEET_CRM_READ_SCOPE', changes: JSON.stringify({ vendorId: match.vendorId }) } });
    return { teamId: req.runtimeIdentity.teamId, ...match };
  }

  @Post('case-answer')
  @Header('Cache-Control', 'no-store')
  async caseAnswer(@Req() req: any, @Body() body: { vendorId?: string; origin?: string; caseNumber?: string; status?: string; subject?: string; outcome?: string }) {
    await this.crmScope(req, body);
    if (typeof body.caseNumber !== 'string' || !/^\d{1,12}$/.test(body.caseNumber) || !['found', 'not_found', 'needs_assistance'].includes(body.outcome || ''))
      throw new BadRequestException('Exact fictitious case observation required');
    if (body.outcome === 'found' && (typeof body.status !== 'string' || !body.status.trim() || body.status.length > 120 || /[\r\n\x00-\x1f]/.test(body.status)))
      throw new BadRequestException('Bounded case status required');
    if (body.subject !== undefined && (typeof body.subject !== 'string' || body.subject.length > 200 || /[\r\n\x00-\x1f]/.test(body.subject)))
      throw new BadRequestException('Bounded fictitious subject required');
    // Page text is untrusted data, never instructions to a model or an action executor.
    const reply = body.outcome === 'found' ? `El caso ${body.caseNumber} figura con estado «${body.status!.trim()}».${body.subject?.trim() ? ` Asunto: «${body.subject.trim()}».` : ''} ¿Necesitas algo más?`
      : body.outcome === 'not_found' ? 'No encontré una coincidencia exacta. Confirma el número de caso.'
      : 'No pude verificar el caso en la interfaz. Necesito ayuda para continuar.';
    return { teamId: req.runtimeIdentity.teamId, reply, outcome: body.outcome };
  }

  @Post('stt')
  @Header('Cache-Control', 'no-store')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: 384044, files: 1, fields: 0 } }))
  async stt(@Req() req: any, @UploadedFile() file: any) {
    return this.processAudio(req, file, {}, true);
  }

  @Post('brain')
  @Header('Cache-Control', 'no-store')
  async brain(@Req() req: any, @Body() body: { message?: string }) {
    if (!body || typeof body.message !== 'string' || !body.message.trim() || body.message.length > 1000)
      throw new BadRequestException('Expected a fictitious message of 1–1000 characters');
    await this.charge(req);
    await this.prisma.auditLog.create({ data: { userId: req.runtimeIdentity.userId, entity: 'BRAIN_MEET', entityId: req.runtimeIdentity.teamId, action: 'MEET_BRAIN_LAYER', changes: '{}' } });
    try {
      const answer = await new BrainController(this.llm, this.knowledge).chat({ message: body.message, language: 'es', voiceMode: true }, req);
      return { teamId: req.runtimeIdentity.teamId, reply: answer.reply.slice(0, 4000) };
    } catch (error) {
      if (error instanceof HttpException && error.getStatus() !== 500) throw error;
      req.res.setHeader('X-Keledon-Voice-Error', 'MEET_BRAIN_UNAVAILABLE');
      throw new HttpException('Configured team Brain unavailable', 502);
    }
  }

  @Post('knowledge')
  @Header('Cache-Control', 'no-store')
  async searchKnowledge(@Req() req: any, @Body() body: { message?: string }) {
    if (!body || typeof body.message !== 'string' || !body.message.trim() || body.message.length > 1000)
      throw new BadRequestException('Expected a fictitious query of 1–1000 characters');
    await this.charge(req);
    await this.prisma.auditLog.create({ data: { userId: req.runtimeIdentity.userId, entity: 'BRAIN_MEET', entityId: req.runtimeIdentity.teamId, action: 'MEET_KNOWLEDGE_LAYER', changes: '{}' } });
    const result = await this.knowledge.search(body.message.trim(), {
      limit: 5, scoreThreshold: 0.35, team_id: req.runtimeIdentity.teamId,
      company_id: req.runtimeIdentity.companyId, brand_id: req.runtimeIdentity.brandId,
    });
    return { teamId: req.runtimeIdentity.teamId, count: result.results?.filter((r: any) => r.score >= 0.35).length || 0 };
  }

  @Post('turn')
  @Header('Cache-Control', 'no-store')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: 384044, files: 1, fields: 2, fieldSize: 50000 } }))
  async turn(@Req() req: any, @UploadedFile() file: any, @Body() body: { history?: string; interfaceControlId?: string }) {
    return this.processAudio(req, file, body);
  }

  private async processAudio(req: any, file: any, body: { history?: string; interfaceControlId?: string }, sttOnly = false) {
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
      await this.charge(req);
      await this.prisma.auditLog.create({ data: {
        userId: req.runtimeIdentity.userId, entity: 'BRAIN_MEET', entityId: req.runtimeIdentity.teamId,
        action: sttOnly ? 'MEET_STT_LAYER' : 'MEET_VOICE_TURN', changes: JSON.stringify({ audioBytes: audio.length, language: 'es' }),
      } });
      const config = await new ProviderConfigResolver(this.prisma).resolveTeamConfig(req.runtimeIdentity.teamId);
      if (!['speaches', 'deepgram'].includes(config.sttProvider))
        throw new HttpException('Selected team requires configured server STT', 503);
      if (config.sttProvider === 'speaches') config.sttModel = 'Systran/faster-whisper-large-v3';
      current();
      stage = 'STT';
      const sttStart = Date.now();
      const stt = await transcribeConfiguredAudio(config, audio, 'es', { timeoutMs: 45000, signal: cancellation.signal });
      const timings: { sttMs: number; brainMs?: number } = { sttMs: Date.now() - sttStart };
      current();
      const transcript = typeof stt.text === 'string' ? stt.text.trim() : '';
      if (sttOnly) return { teamId: req.runtimeIdentity.teamId, transcript: transcript.slice(0, 4000), timings };
      if (!transcript) return { teamId: req.runtimeIdentity.teamId, transcript: '', reply: '', timings };
      if (transcript.length > 4000) throw new BadRequestException('Transcription too long');
      if (/^(?:gracias[,\s]*)?(?:adiós|adios|terminar|finalizar|hasta luego)[.!\s]*$/i.test(transcript)) return {teamId:req.runtimeIdentity.teamId,transcript,reply:'Gracias. La conversación ha terminado.',goal:{type:'close'},timings};
      if (body.interfaceControlId) {
        if (typeof body.interfaceControlId !== 'string' || !/^[a-f0-9-]{36}$/.test(body.interfaceControlId)) throw new BadRequestException('Invalid interface control');
        await this.interfaces.get(req, body.interfaceControlId);
        return { teamId: req.runtimeIdentity.teamId, transcript, reply: '', goal: { type: 'interface_objective', controlId: body.interfaceControlId }, timings };
      }
      const cases = [...transcript.matchAll(/\b(?:caso|case|ticket)\s*(?:es\s*)?(?:el\s*)?(?:(?:número|numero|n[º°.]|#)\s*)?(\d{1,12})\b/gi)];
      const caseNumber = cases.length === 1 ? cases[0][1] : undefined;
      if (cases.length > 1) return { teamId: req.runtimeIdentity.teamId, transcript, reply: 'Indica un único número de caso ficticio para poder verificarlo.', timings };
      if (caseNumber) return { teamId: req.runtimeIdentity.teamId, transcript, reply: '', goal: { type: 'search_case', caseNumber }, timings };
      if (/^(?:gracias[,\s]*)?(?:adiós|adios|terminar|finalizar|hasta luego)[.!\s]*$/i.test(transcript))
        return { teamId: req.runtimeIdentity.teamId, transcript, reply: 'Gracias. La conversación ha terminado.', goal: { type: 'close' }, timings };
      stage = 'BRAIN';
      const brainStart = Date.now();
      const answer = await new BrainController(this.llm, this.knowledge).chat({
        message: `Conversación de voz del MVP: responde en español, en una o dos frases breves. Para consultar Salesforce pide el número de caso ficticio escrito en cifras. Nunca inventes estados ni ejecutes acciones externas; la lectura la realiza un adaptador autorizado por equipo. El interlocutor dijo: ${transcript}`,
        history, language: 'es', voiceMode: true,
      }, req);
      current();
      timings.brainMs = Date.now() - brainStart;
      return { teamId: req.runtimeIdentity.teamId, transcript, reply: answer.reply.slice(0, 4000), timings };
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
