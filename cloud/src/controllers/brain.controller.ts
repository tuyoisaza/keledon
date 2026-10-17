import {
  Body,
  Controller,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Post,
  Req,
} from '@nestjs/common';
import { LLMService } from '../llm/llm.service';
import type { LLMResponse } from '../llm/llm.types';
import { PrismaService } from '../prisma/prisma.service';

interface AuthenticatedRequest {
  user?: { userId?: string };
}

interface BrainChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface BrainChatRequest {
  message: string;
  history?: BrainChatMessage[];
  companyId?: string;
  companyName?: string;
  brandId?: string;
  brandName?: string;
  teamId?: string;
  teamName?: string;
  language?: string;
}

@Controller('api/brain')
export class BrainController {
  constructor(
    private readonly llmService: LLMService,
    private readonly prisma: PrismaService,
  ) {}

  @Post('chat')
  async chat(@Body() body: BrainChatRequest, @Req() req: AuthenticatedRequest) {
    const message = body?.message?.trim();
    if (!message || message.length > 8000) {
      throw new HttpException('Message is required', HttpStatus.BAD_REQUEST);
    }

    const actor = await this.prisma.user.findUnique({
      where: { id: req.user?.userId },
      include: {
        company: true,
        team: { include: { brand: { include: { company: true } } } },
      },
    });
    if (!actor) throw new ForbiddenException('Resource access denied');
    if (
      actor.companyId &&
      actor.team?.brand?.companyId &&
      actor.companyId !== actor.team.brand.companyId
    )
      throw new ForbiddenException('Resource access denied');

    const companyId = actor.companyId || actor.team?.brand?.companyId;
    const teamId = actor.teamId;
    const companyName = actor.company?.name || 'Unspecified Company';
    const brandId = actor.team?.brand?.id;
    const brandName = actor.team?.brand?.name || 'Unspecified Brand';
    const teamName = actor.team?.name || 'Unspecified Team';
    if (
      (body?.language !== undefined &&
        (typeof body.language !== 'string' || body.language.length > 20)) ||
      (body?.history !== undefined &&
        (!Array.isArray(body.history) ||
          body.history.length > 12 ||
          body.history.some(
            (item) =>
              !item ||
              !['user', 'assistant'].includes(item.role) ||
              typeof item.content !== 'string' ||
              item.content.length > 8000,
          )))
    )
      throw new HttpException('Invalid Brain request', HttpStatus.BAD_REQUEST);

    const history = Array.isArray(body.history) ? body.history.slice(-12) : [];
    const historyLength = history.reduce(
      (total, item) => total + item.content.length,
      0,
    );
    if (historyLength + message.length > 12000)
      throw new HttpException('Invalid Brain request', HttpStatus.BAD_REQUEST);

    const context = [
      `Company: ${companyName}`,
      `Brand: ${brandName}`,
      `Team: ${teamName}`,
      body.language ? `Language: ${body.language}` : 'Language: auto',
    ];

    const conversation = history
      .map(
        (item) => `${item.role === 'user' ? 'User' : 'Brain'}: ${item.content}`,
      )
      .join('\n');

    const prompt = JSON.stringify({
      companyId,
      companyName,
      brandId,
      brandName,
      teamId,
      teamName,
      language: body.language || 'auto',
      conversation,
      message,
    });

    try {
      const response: LLMResponse = await this.llmService.generate({
        prompt,
        context,
        actorId: actor.id,
        feature: 'brain-chat',
        teamId: actor.teamId || undefined,
        maxTokens: 500,
        temperature: 0.35,
      });

      return {
        success: true,
        reply:
          response.text.trim() ||
          'I am ready, but I do not have a response yet.',
        usage: response.usage,
        context: {
          companyId,
          companyName,
          brandId,
          brandName,
          teamId,
          teamName,
        },
      };
    } catch {
      console.error('BrainController: failed to generate chat response');
      throw new HttpException(
        'Failed to talk to Brain',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
