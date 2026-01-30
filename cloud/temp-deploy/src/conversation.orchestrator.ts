import { Injectable } from '@nestjs/common';
import { Socket } from 'socket.io';
import { SttFactory } from './stt.factory';
import { LlmFactory } from './llm.factory';
import { TtsFactory } from './tts.factory';
import { Subscription } from 'rxjs';
import { ORCHESTRATOR_SYSTEM_PROMPT } from './core/llm/prompts';
import { ExecutionOrchestrator } from './core/execution/execution.orchestrator';
import { KeledonAction, AutonomyContext } from './core/interfaces/action.interface';
import { ContextService } from './core/context/context.service';
import { OrchestratorState } from './core/orchestrator.types';
import { RAGService } from './rag/rag.controller';

interface Message {
    role: 'user' | 'assistant' | 'system';
    content: string;
}

@Injectable()
export class ConversationOrchestrator {
    private activeConversations = new Map<string, Subscription>();
    private conversationHistory = new Map<string, Message[]>();
    private systemPrompts = new Map<string, string>();
    private contexts = new Map<string, AutonomyContext>();
    private states = new Map<string, OrchestratorState>();

    constructor(
        private readonly sttFactory: SttFactory,
        private readonly llmFactory: LlmFactory,
        private readonly ttsFactory: TtsFactory,
        private readonly executionOrchestrator: ExecutionOrchestrator,
        private readonly contextService: ContextService,
        private readonly ragService: RAGService,
    ) { }

    private transitionTo(client: Socket, newState: OrchestratorState, details?: string) {
        const socketId = client.id;
        const previousState = this.states.get(socketId) || OrchestratorState.IDLE;

        if (previousState === newState) return;

        this.states.set(socketId, newState);
        console.log(`Orchestrator [${socketId}]: ${previousState} -> ${newState} ${details ? `(${details})` : ''}`);

        client.emit('state-change', {
            previousState,
            newState,
            timestamp: new Date().toISOString(),
            details
        });
    }

    public setSystemPrompt(socketId: string, prompt: string) {
        this.systemPrompts.set(socketId, prompt);
    }

    public clearHistory(socketId: string) {
        this.conversationHistory.set(socketId, []);
        // Reload context on clear? Or keep it? Keep it.
    }

    public async startConversation(client: Socket, agentId?: string) {
        const socketId = client.id;
        console.log(`Orchestrator: Starting loop for ${socketId} (Agent: ${agentId || 'default'})`);

        // Initialize state
        this.transitionTo(client, OrchestratorState.IDLE);

        // Get STT provider first to establish subscription early
        const sttProvider = this.sttFactory.getProvider(socketId);
        if (!sttProvider || !sttProvider.transcript$) {
            console.warn(`Orchestrator: No STT provider or transcript$ for ${socketId}`);
        } else {
            const sub = sttProvider.transcript$.pipe(
                // Ensure we are in a state that accepts listening
            ).subscribe(async (part: any) => {
                if (part && part.text && part.text.trim().length > 0) {
                    const currentState = this.states.get(socketId);
                    // Only process if IDLE or LISTENING
                    if (currentState === OrchestratorState.IDLE || currentState === OrchestratorState.LISTENING) {
                        this.transitionTo(client, OrchestratorState.LISTENING, part.text);
                        await this.processTurn(client, part.text);
                    } else {
                        console.log(`Orchestrator: Ignoring input "${part.text}" because state is ${currentState}`);
                    }
                }
            });
            this.activeConversations.set(socketId, sub);
        }

        // Load Context asynchronously
        const context = await this.contextService.loadContext(agentId);
        this.contexts.set(socketId, context);

        if (!this.conversationHistory.has(socketId)) {
            this.conversationHistory.set(socketId, []);
        }
    }

    public stopConversation(client: Socket) {
        const sub = this.activeConversations.get(client.id);
        if (sub) {
            sub.unsubscribe();
            this.activeConversations.delete(client.id);
        }
        this.states.delete(client.id);
    }

    public async processTurn(client: Socket, text: string) {
        const socketId = client.id;

        // Double check state guard
        const currentState = this.states.get(socketId);
        if (currentState === OrchestratorState.THINKING || currentState === OrchestratorState.EXECUTING) {
            return;
        }

        this.transitionTo(client, OrchestratorState.THINKING);
        const llmProvider = this.llmFactory.getProvider(socketId);
        const ttsProvider = this.ttsFactory.getProvider(socketId);

        if (!llmProvider || !ttsProvider) {
            console.warn(`Orchestrator: Missing LLM/TTS provider for ${socketId}`);
            return;
        }

        const history = this.conversationHistory.get(socketId) || [];
        history.push({ role: 'user', content: text });

        // Retrieve relevant knowledge using RAG
        const context = await this.contextService.getContext(socketId);
        let ragContext: any[] = [];
        let enhancedSystemPrompt = this.systemPrompts.get(socketId) || ORCHESTRATOR_SYSTEM_PROMPT;

        try {
            ragContext = await this.ragService.retrieveRelevantKnowledge(text, {
                sessionId: socketId,
                companyId: context.accountId,
                brandId: context.brandId,
                teamId: context.teamId,
                limit: 5,
                threshold: 0.7
            });

            if (ragContext.length > 0) {
                // Simple prompt augmentation - add context to system prompt
                const contextText = ragContext.map(doc => `Context: ${doc.content}`).join('\n\n');
                enhancedSystemPrompt = `${ORCHESTRATOR_SYSTEM_PROMPT}\n\nRelevant Context:\n${contextText}`;
                console.log(`[RAG] Retrieved ${ragContext.length} relevant documents for: "${text}"`);
            }
        } catch (error) {
            console.warn(`[RAG] Error retrieving knowledge: ${error.message}`);
            // Continue without RAG if it fails
        }

        // Use custom system prompt if set, otherwise default to enhanced prompt
        const systemPrompt = enhancedSystemPrompt;

        console.log(`Orchestrator: Querying LLM with ${history.length} turns in JSON mode...`);
        const llmStream$ = llmProvider.generateResponse(history, {
            useJson: true,
            systemPrompt
        });

        let buffer = '';

        llmStream$.subscribe({
            next: (chunk: string) => {
                buffer += chunk;
            },
            complete: async () => {
                try {
                    console.log(`Orchestrator: Full LLM Response: ${buffer}`);
                    const parsed = JSON.parse(buffer);

                    // Add Assistant's thought/response to history
                    const assistantContent = JSON.stringify(parsed); // Store raw JSON in history for context? 
                    // Or maybe just the response? For the loop to work, the LLM needs to know what it did.
                    // Storing the JSON allows it to see its previous thoughts and actions.
                    history.push({ role: 'assistant', content: assistantContent });
                    this.conversationHistory.set(socketId, history);

                    // 1. Speak the response if present
                    if (parsed.response) {
                        console.log(`Orchestrator: TTS for: "${parsed.response}"`);
                        this.synthesizeAndPlay(client, ttsProvider, parsed.response);

                        // Emit transcript
                        client.emit('transcript-part', {
                            speaker: 'agent',
                            text: parsed.response,
                            isFinal: true,
                            timestamp: new Date().toISOString()
                        });
                    }

                    // 2. Execute Action if present
                    if (parsed.action) {
                        const action = parsed.action as KeledonAction;
                        this.transitionTo(client, OrchestratorState.EXECUTING, `${action.type}:${action.intent}`);

                        // Fake context for now
                        // const context: AutonomyContext = {
                        //     accountId: 'demo-account',
                        //     level: action.requiredLevel || 1, // Auto-grant required level for demo
                        //     features: []
                        // };

                        // Real Context
                        const context = this.contexts.get(socketId) || await this.contextService.loadContext();

                        try {
                            const result = await this.executionOrchestrator.execute(action, context, client);

                            // 3. Feed result back?
                            // Ideally we would trigger another loop here: "Action executed, result: X. What next?"
                            // but for now let's just log it. 
                            console.log('Action execution successful:', result);

                            // Optional: If result has output, maybe we assume the task is done or we need to tell the user?
                            // Integration Plan Step 3 says: "Feed execution result back to LLM context."
                            // Let's do a simple follow-up loop if needed, but maybe risk of infinite loop.
                            // For this MVP, we stop here.
                        } catch (err) {
                            console.error('Action Execution Failed:', err);
                            this.transitionTo(client, OrchestratorState.ERROR, 'Action failure');
                            this.synthesizeAndPlay(client, ttsProvider, "I encountered an error executing that action.");
                        }
                    }

                    // Return to IDLE if we didn't start TTS or Action (or after they would have started)
                    // Note: synthesizeAndPlay handles its own IDLE transition.
                    if (!parsed.response && !parsed.action) {
                        this.transitionTo(client, OrchestratorState.IDLE);
                    }

                } catch (e) {
                    console.error('Orchestrator: Failed to parse JSON response or execute', e);
                    this.transitionTo(client, OrchestratorState.ERROR, 'Parse error');
                    if (!buffer.trim().startsWith('{')) {
                        this.synthesizeAndPlay(client, ttsProvider, buffer);
                    }
                }
            },
            error: (err: unknown) => {
                console.error('LLM Error:', err);
                this.transitionTo(client, OrchestratorState.ERROR, 'LLM stream error');
            }
        });
    }

    private async synthesizeAndPlay(client: Socket, ttsProvider: any, text: string) {
        try {
            this.transitionTo(client, OrchestratorState.SPEAKING);
            const audioStream = await ttsProvider.generateAudio(text);

            // For now, TTS providers might or might not emit 'end' in a way we can track easily via streams
            // Let's assume for now we transition back to IDLE after initiating playback or eventually.
            // A more robust way would be to wait for the stream to end.

            audioStream.on('data', (chunk: any) => client.emit('audio-playback', chunk));
            audioStream.on('end', () => {
                this.transitionTo(client, OrchestratorState.IDLE, 'Speech finished');
            });
        } catch (err) {
            console.error('TTS Error:', err);
            this.transitionTo(client, OrchestratorState.ERROR, 'TTS failure');
        }
    }
}
