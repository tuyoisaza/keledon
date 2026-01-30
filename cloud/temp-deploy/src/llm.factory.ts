import { Injectable } from '@nestjs/common';
import { LlmProvider } from './capabilities/llm/interfaces/llm-provider.interface';
import { OpenAiLlmProvider } from './providers/openai.provider';
import { MockLlmProvider } from './providers/mock-llm.provider';
import { Socket } from 'socket.io';
import { ToolExecutor } from './tool.executor';

@Injectable()
export class LlmFactory {
    private providers = new Map<string, LlmProvider>();

    constructor(private readonly toolExecutor: ToolExecutor) { }

    configure(client: Socket, config: any) {
        const socketId = client.id;
        let provider: LlmProvider;

        const apiKey = config.apiKeys?.openai;
        const tools = this.toolExecutor.getToolDefinitions();

        if (apiKey) {
            provider = new OpenAiLlmProvider(apiKey, tools);
            console.log(`LLM Factory: Configured OpenAI with ${tools.length} tools for ${socketId}`);
        } else {
            provider = new MockLlmProvider();
            console.log(`LLM Factory: Configured Mock LLM for ${socketId}`);
        }

        this.providers.set(socketId, provider);
    }

    getProvider(socketId: string): LlmProvider | undefined {
        return this.providers.get(socketId);
    }

    cleanup(socketId: string) {
        this.providers.delete(socketId);
    }
}
