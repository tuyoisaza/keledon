import {
  Body,
  Controller,
  HttpException,
  HttpStatus,
  Post,
} from '@nestjs/common';
import { LLMService } from '../llm/llm.service';
import type { LLMResponse } from '../llm/llm.types';
import { ApiTags } from '@nestjs/swagger';

interface DecomposeStep {
  type:
    | 'navigate'
    | 'click'
    | 'fill'
    | 'wait'
    | 'extract'
    | 'scroll'
    | 'screenshot'
    | 'press_key'
    | 'select'
    | 'hover'
    | 'wait_for'
    | 'submit'
    | 'assert';
  selector?: string;
  value?: string;
  url?: string;
  description: string;
}

interface DecomposeRequest {
  goal: string;
  url?: string;
  pageContext?: string;
  pageTitle?: string;
  previousActions?: string[];
  maxSteps?: number;
}

interface DecomposeResponse {
  success: boolean;
  steps: DecomposeStep[];
  reasoning?: string;
  explanation?: string;
}

const VALID_ACTION_TYPES = [
  'navigate',
  'click',
  'fill',
  'wait',
  'extract',
  'scroll',
  'screenshot',
  'press_key',
  'select',
  'hover',
  'wait_for',
  'submit',
  'assert',
];

@ApiTags('Planner')
@Controller('api/planner')
export class PlannerController {
  constructor(private readonly llmService: LLMService) {}

  @Post('decompose')
  async decompose(@Body() body: DecomposeRequest): Promise<DecomposeResponse> {
    const goal = body?.goal?.trim();
    if (!goal) {
      throw new HttpException('Goal is required', HttpStatus.BAD_REQUEST);
    }

    const maxSteps = Math.min(body.maxSteps || 10, 20);
    const previousContext = body.previousActions?.length
      ? `Completed actions so far:\n${body.previousActions.map((a, i) => `  ${i + 1}. ${a}`).join('\n')}`
      : 'No actions completed yet.';

    const pageContextStr = body.pageContext
      ? `Current page context:\n  URL: ${body.url || 'unknown'}\n  Title: ${body.pageTitle || 'unknown'}\n  Visible content: ${body.pageContext.slice(0, 2000)}`
      : `Starting fresh.${body.url ? ` Target URL: ${body.url}` : ''}`;

    const prompt = [
      `You are KELEDON's browser automation planner. Your job is to break a user's goal into a sequence of concrete browser actions.`,
      ``,
      `## Goal`,
      `${goal}`,
      ``,
      `## Context`,
      `${pageContextStr}`,
      ``,
      `${previousContext}`,
      ``,
      `## Instructions`,
      `Based on the goal and the current page context, produce a sequence of steps (up to ${maxSteps}) that will achieve the goal.`,
      `Each step MUST be one of these action types: ${VALID_ACTION_TYPES.join(', ')}.`,
      ``,
      `Rules:`,
      `- If the goal requires navigating to a specific site, start with a "navigate" step.`,
      `- For search-related goals, navigate to the appropriate search engine or site, fill in the query, then submit.`,
      `- After navigation or form submission, add a "wait" step (1000-3000ms) to let the page render.`,
      `- Use "fill" with "selector" and "value" for form/input fields. Use CSS selectors like input[name="q"], input[type="email"], etc.`,
      `- Use "click" with "selector" for buttons/links.`,
      `- Use "extract" after pages load to read content.`,
      `- Use "screenshot" to capture the final or intermediate state.`,
      `- After filling forms on Google-like login pages, use "wait_for" with selector for the Next button before clicking.`,
      `- If the goal is already complete based on the current page, return an empty steps array with an explanation.`,
      `- If the goal is ambiguous, make a reasonable default choice.`,
      `- Do NOT include steps that require credentials the browser doesn't have (e.g., don't guess passwords).`,
      `- For data extraction goals (prices, flight info, product details), navigate, search/filter, then "extract".`,
      ``,
      `Return ONLY valid JSON with this structure:`,
      `{`,
      `  "steps": [{ "type": "...", "selector": "...", "value": "...", "url": "...", "description": "..." }],`,
      `  "reasoning": "brief explanation of your plan",`,
      `  "explanation": "what you expect to find or achieve"`,
      `}`,
      ``,
      `No markdown, no code fences, no extra text — ONLY the JSON object.`,
    ].join('\n');

    try {
      const response: LLMResponse = await this.llmService.generate({
        prompt,
        context: ['Browser automation planning', `Goal: ${goal}`],
        maxTokens: 2000,
        temperature: 0.2,
      });

      const raw = response.text.trim();
      const json = this.extractJSON(raw);

      if (!json || !Array.isArray(json.steps)) {
        return {
          success: false,
          steps: [],
          reasoning: 'AI returned invalid response format',
          explanation: raw.slice(0, 500),
        };
      }

      const validatedSteps: DecomposeStep[] = json.steps
        .filter(
          (s: any) =>
            s && typeof s === 'object' && VALID_ACTION_TYPES.includes(s.type),
        )
        .map((s: any) => ({
          type: s.type,
          selector: s.selector || undefined,
          value: s.value || undefined,
          url: s.url || undefined,
          description: s.description || `${s.type} step`,
        }))
        .slice(0, maxSteps);

      return {
        success: validatedSteps.length > 0,
        steps: validatedSteps,
        reasoning:
          typeof json.reasoning === 'string' ? json.reasoning : undefined,
        explanation:
          typeof json.explanation === 'string' ? json.explanation : undefined,
      };
    } catch (error) {
      console.error('PlannerController: decomposition failed', error);
      throw new HttpException(
        'Failed to decompose goal',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  private extractJSON(text: string): any {
    // Try parsing directly first
    try {
      return JSON.parse(text);
    } catch {
      // Try extracting from code fences
      const blockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (blockMatch) {
        try {
          return JSON.parse(blockMatch[1].trim());
        } catch {
          // Ignore malformed fenced JSON and try the next extraction strategy.
        }
      }
      // Try finding the first { }
      const braceMatch = text.match(/\{[\s\S]*\}/);
      if (braceMatch) {
        try {
          return JSON.parse(braceMatch[0]);
        } catch {
          // Ignore malformed braced JSON and fall through to null.
        }
      }
    }
    return null;
  }
}
