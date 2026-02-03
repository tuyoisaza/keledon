import { OpenAI } from 'openai';
import { Observable, Subject } from 'rxjs';
import { LlmProvider, ToolDefinition } from '../capabilities/llm/interfaces/llm-provider.interface';
import type { Stream } from 'openai/streaming';
import type { ChatCompletionChunk } from 'openai/resources/chat/completions';

export class OpenAiLlmProvider implements LlmProvider {
    private client: OpenAI;
    private tools: ToolDefinition[] = [];

    constructor(apiKey: string, tools: ToolDefinition[] = []) {
        if (!apiKey) {
            console.error('OpenAI: No API Key provided');
            return;
        }
        this.client = new OpenAI({ apiKey });
        this.tools = tools;
    }

    generateResponse(messages: any[], options: { useJson?: boolean, systemPrompt?: string } = {}): Observable<string> {
        const subject = new Subject<string>();

        if (!this.client) {
            subject.error('OpenAI client not initialized');
            return subject.asObservable();
        }

        (async () => {
            try {
                // Determine System Prompt
                // If the first message is system, use it. Otherwise prepend default or provided override.
                let finalMessages = [...messages];
                if (options.systemPrompt) {
                    // Check if first message is system, if so replace it, else prepend
                    if (finalMessages.length > 0 && finalMessages[0].role === 'system') {
                        finalMessages[0].content = options.systemPrompt;
                    } else {
                        finalMessages.unshift({ role: 'system', content: options.systemPrompt });
                    }
                } else if (finalMessages.length === 0 || finalMessages[0].role !== 'system') {
                    // Default fallback if no system prompt passed
                    finalMessages.unshift({ role: 'system', content: 'You are KELDON. Be concise.' });
                }

                // If JSON mode is requested, ensure "json" is in the system prompt (OpenAI requirement)
                if (options.useJson) {
                    const sysContent = finalMessages[0].content as string;
                    if (!sysContent.toLowerCase().includes('json')) {
                        finalMessages[0].content = sysContent + ' You must output valid JSON.';
                    }
                }

                const stream: Stream<ChatCompletionChunk> = await this.client.chat.completions.create({
                    model: 'gpt-4o-mini',
                    messages: finalMessages.map(m => ({ role: m.role, content: m.content })),
                    stream: true,
                    response_format: options.useJson ? { type: 'json_object' } : undefined,
                    // Tools are temporarily disabled in this mode to force the "Action" schema thinking
                    // or we can keep them if we want hybrid, but the plan is "Action" centric.
                    // For now, let's keep tools optional if we want to fallback.
                });

                for await (const chunk of stream) {
                    const content = chunk.choices[0]?.delta?.content || '';
                    if (content) {
                        subject.next(content);
                    }
                }
                subject.complete();
            } catch (error) {
                console.error('OpenAI Stream Error:', error);
                subject.error(error);
            }
        })();

        return subject.asObservable();
    }
}
