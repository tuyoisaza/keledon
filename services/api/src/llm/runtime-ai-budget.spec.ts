import { RuntimeAiBudget } from './runtime-ai-budget';

describe('RuntimeAiBudget metered diagnostics', () => {
  const previousAiSwitch = process.env.KELEDON_AI_DISABLED;
  const previousVoiceSwitch = process.env.KELEDON_VOICE_DISABLED;
  afterEach(() => {
    if (previousAiSwitch === undefined) delete process.env.KELEDON_AI_DISABLED;
    else process.env.KELEDON_AI_DISABLED = previousAiSwitch;
    if (previousVoiceSwitch === undefined)
      delete process.env.KELEDON_VOICE_DISABLED;
    else process.env.KELEDON_VOICE_DISABLED = previousVoiceSwitch;
  });

  it('reports aggregate provider outcomes, retry policy, caps and kill switches without actor identifiers', async () => {
    process.env.KELEDON_VOICE_DISABLED = 'false';
    const budget = new RuntimeAiBudget();
    await budget.run('private-actor-id', undefined, () =>
      Promise.resolve('ok'),
    );
    process.env.KELEDON_AI_DISABLED = 'true';
    budget.recordMeteredOutcome({
      provider: 'OpenAI',
      success: false,
      retryCount: 0,
      failureCode: 'AI_PROVIDER_CALL_FAILED',
      correlationId: 'req_0123456789abcdef0123456789abcdef',
    });
    budget.recordMeteredOutcome({
      provider: 'client-supplied-private-provider',
      success: true,
      retryCount: 99,
      correlationId: 'private-correlation-id',
    });

    const report = budget.getDiagnostics();
    expect(report).toMatchObject({
      status: 'measured',
      windowMinutes: 60,
      calls: 2,
      failures: 1,
      retryCountLastCall: 20,
      requestBudget: {
        calls: 1,
        actors: 1,
        perActorLimit: 120,
        totalLimit: 10000,
        actorCardinalityLimit: 5000,
      },
      killSwitches: { ai: true, voice: false },
      automaticRetriesEnabled: false,
    });
    expect(report.providers).toEqual([
      { provider: 'openai', calls: 1, failures: 1 },
      { provider: 'other', calls: 1, failures: 0 },
    ]);
    expect(JSON.stringify(report)).not.toContain('private-actor-id');
    expect(JSON.stringify(report)).not.toContain('private-correlation-id');
    expect(report.lastCall).not.toHaveProperty('correlationId');
  });

  it('records a safe failed outcome and rethrows the original provider error', async () => {
    const budget = new RuntimeAiBudget();
    const original = new Error('private provider URL and credential');
    await expect(
      budget.trackProviderCall('deepgram', undefined, () =>
        Promise.reject(original),
      ),
    ).rejects.toBe(original);
    expect(budget.getDiagnostics()).toMatchObject({
      calls: 1,
      failures: 1,
      lastCall: {
        provider: 'deepgram',
        success: false,
        retryCount: 0,
        failureCode: 'PROVIDER_CALL_FAILED',
      },
    });
    expect(JSON.stringify(budget.getDiagnostics())).not.toContain(
      'private provider URL',
    );
  });
});
