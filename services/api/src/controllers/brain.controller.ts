import {
  Body,
  Controller,
  HttpException,
  HttpStatus,
  Post,
} from '@nestjs/common';
import { LLMService } from '../llm/llm.service';
import { VectorStoreService } from '../vector-store/vector-store.service';
import type { LLMResponse } from '../llm/llm.types';
import { ApiTags } from '@nestjs/swagger';

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

@ApiTags('Brain')
@Controller('api/brain')
export class BrainController {
  constructor(
    private readonly llmService: LLMService,
    private readonly vectorStoreService: VectorStoreService,
  ) {}

  @Post('chat')
  async chat(@Body() body: BrainChatRequest) {
    const message = body?.message?.trim();
    if (!message) {
      throw new HttpException('Message is required', HttpStatus.BAD_REQUEST);
    }

    const companyName =
      body.companyName?.trim() || body.companyId || 'Unspecified Company';
    const brandName =
      body.brandName?.trim() || body.brandId || 'Unspecified Brand';
    const teamName = body.teamName?.trim() || body.teamId || 'Unspecified Team';
    const history = Array.isArray(body.history) ? body.history.slice(-12) : [];

    const context = [
      `Company: ${companyName}`,
      `Brand: ${brandName}`,
      `Team: ${teamName}`,
      body.language ? `Language: ${body.language}` : 'Language: auto',
    ];

    // ── Vector Store RAG ──
    let knowledgeContext = '';
    try {
      const searchResult = await this.vectorStoreService.search(message, {
        limit: 5,
        scoreThreshold: 0.35,
        team_id: body.teamId,
        company_id: body.companyId,
        brand_id: body.brandId,
      });
      const relevantDocs = searchResult.results?.filter(
        (r: any) => r.score >= 0.35,
      );
      if (relevantDocs && relevantDocs.length > 0) {
        knowledgeContext =
          '\n\nRelevant knowledge base documents:\n' +
          relevantDocs
            .map(
              (r: any, i: number) =>
                `[${i + 1}] ${r.document.title || 'Untitled'} (${r.document.category || 'general'}, relevance=${(r.score * 100).toFixed(0)}%):\n${r.document.content}`,
            )
            .join('\n\n');
        context.push('Knowledge retrieval: active');
      } else {
        context.push('Knowledge retrieval: no relevant documents found');
      }
    } catch (err) {
      console.warn('BrainController: vector store search failed', err);
      context.push('Knowledge retrieval: unavailable');
    }

    const conversation = history
      .map(
        (item) => `${item.role === 'user' ? 'User' : 'Brain'}: ${item.content}`,
      )
      .join('\n');

    const prompt = [
      'You are KELEDON Brain inside the operator dashboard.',
      'Respond as the live brand brain for the selected company, brand, and team.',
      'Be concise, practical, and ready for production operations.',
      'If the user asks for missing context, ask one focused follow-up question.',
      'Do not mention internal policy unless the user asks.',
      '',
      'Selected context:',
      ...context.map((line) => `- ${line}`),
      '',
      conversation ? `Conversation so far:\n${conversation}\n` : '',
      knowledgeContext,
      `Latest user message: ${message}`,
      '',
      'Answer as the brain for this brand only. Return the direct reply and nothing else.',
    ]
      .filter(Boolean)
      .join('\n');

    try {
      const response: LLMResponse = await this.llmService.generate({
        prompt,
        context,
        maxTokens: 500,
        temperature: 0.35,
        teamId: body.teamId || undefined,
      });

      return {
        success: true,
        reply:
          response.text.trim() ||
          'I am ready, but I do not have a response yet.',
        usage: response.usage,
        context: {
          companyId: body.companyId,
          companyName,
          brandId: body.brandId,
          brandName,
          teamId: body.teamId,
          teamName,
        },
      };
    } catch (error) {
      console.error('BrainController: failed to generate chat response', error);
      throw new HttpException(
        'Failed to talk to Brain',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
