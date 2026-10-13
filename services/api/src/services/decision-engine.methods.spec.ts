import { Logger } from '@nestjs/common';
import { DecisionContextMethods } from './decision-engine.methods';

describe('DecisionContextMethods.makeDecision without a working LLM', () => {
  const context = {
    sessionId: 'session-1',
    agentId: 'agent-1',
    previousEvents: [],
    currentTranscript: 'Please book me a flight',
    confidence: 0.8,
    metadata: {},
  };

  it('returns an explicit unavailable response instead of echoing user input', async () => {
    const methods = new DecisionContextMethods(
      {} as any,
      undefined,
      new Logger(),
    );

    await expect(methods.makeDecision(context)).resolves.toMatchObject({
      type: 'ask',
      confidence: 0,
      reasoning: 'AI reasoning unavailable; no user intent was inferred',
    });
    await expect(methods.makeDecision(context)).resolves.not.toHaveProperty(
      'text',
      `I heard: ${context.currentTranscript}`,
    );
  });

  it('preserves deterministic stop commands while reasoning is unavailable', async () => {
    const methods = new DecisionContextMethods(
      {} as any,
      undefined,
      new Logger(),
    );

    await expect(
      methods.makeDecision({ ...context, currentTranscript: 'cancel this' }),
    ).resolves.toMatchObject({
      type: 'stop',
      reasoning: 'stop keyword detected',
    });
  });

  it('does not convert an LLM failure into a fabricated intent', async () => {
    const llm = {
      isEnabled: () => true,
      generateCommand: async () => {
        throw new Error('provider unavailable');
      },
    };
    const methods = new DecisionContextMethods(
      {} as any,
      llm as any,
      new Logger(),
    );

    await expect(methods.makeDecision(context)).resolves.toMatchObject({
      type: 'ask',
      confidence: 0,
    });
  });
});
