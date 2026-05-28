import { Body, Controller, HttpException, HttpStatus, Post } from '@nestjs/common';
import { LLMService } from '../llm/llm.service';
import type { LLMResponse } from '../llm/llm.types';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

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
  constructor(private readonly llmService: LLMService) {}

  @Post('chat')
  async chat(@Body() body: BrainChatRequest) {
    const message = body?.message?.trim();
    if (!message) {
      throw new HttpException('Message is required', HttpStatus.BAD_REQUEST);
    }

    const companyName = body.companyName?.trim() || body.companyId || 'Unspecified Company';
    const brandName = body.brandName?.trim() || body.brandId || 'Unspecified Brand';
    const teamName = body.teamName?.trim() || body.teamId || 'Unspecified Team';
    const history = Array.isArray(body.history) ? body.history.slice(-12) : [];

    const context = [
      `Company: ${companyName}`,
      `Brand: ${brandName}`,
      `Team: ${teamName}`,
      body.language ? `Language: ${body.language}` : 'Language: auto',
    ];

    const conversation = history
      .map((item) => `${item.role === 'user' ? 'User' : 'Brain'}: ${item.content}`)
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
      });

      return {
        success: true,
        reply: response.text.trim() || 'I am ready, but I do not have a response yet.',
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
      throw new HttpException('Failed to talk to Brain', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
