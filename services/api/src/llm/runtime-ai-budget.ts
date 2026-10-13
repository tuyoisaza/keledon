/** Process-local hard request caps; failures count, retries are disabled at providers. */
const WINDOW_MS = 60 * 60 * 1000;
const PER_ACTOR_LIMIT = 120;
const TOTAL_LIMIT = 10_000;
const ACTOR_LIMIT = 5_000;
const METERED_PROVIDERS = new Set([
  'anthropic',
  'deepgram',
  'elevenlabs',
  'google',
  'kokoro',
  'ollama',
  'openai',
  'speaches',
]);

export class RuntimeAiBudget {
  private windowStart = Date.now();
  private total = 0;
  private calls = new Map<string, number>();
  private completed = new Map<string, { at: number; value: any }>();
  private inflight = new Map<string, Promise<any>>();
  private metered = new Map<string, { calls: number; failures: number }>();
  private meteredTotal = 0;
  private meteredFailures = 0;
  private lastMetered?: {
    provider: string;
    at: string;
    success: boolean;
    retryCount: number;
    failureCode?: string;
    correlationId?: string;
  };

  private refreshWindow(now = Date.now()) {
    if (now - this.windowStart < WINDOW_MS) return;
    this.windowStart = now;
    this.total = 0;
    this.calls.clear();
    this.metered.clear();
    this.meteredTotal = 0;
    this.meteredFailures = 0;
    this.lastMetered = undefined;
  }

  recordMeteredOutcome(input: {
    provider: string;
    success: boolean;
    retryCount: number;
    failureCode?: string;
    correlationId?: string;
  }) {
    this.refreshWindow();
    const provider = METERED_PROVIDERS.has(input.provider.toLowerCase())
      ? input.provider.toLowerCase()
      : 'other';
    const count = this.metered.get(provider) || { calls: 0, failures: 0 };
    count.calls++;
    if (!input.success) count.failures++;
    this.metered.set(provider, count);
    this.meteredTotal++;
    if (!input.success) this.meteredFailures++;
    this.lastMetered = {
      provider,
      at: new Date().toISOString(),
      success: input.success,
      retryCount: Number.isInteger(input.retryCount)
        ? Math.max(0, Math.min(input.retryCount, 20))
        : 0,
      ...(input.failureCode && /^[A-Z0-9_]{1,64}$/.test(input.failureCode)
        ? { failureCode: input.failureCode }
        : {}),
      ...(input.correlationId && /^req_[a-f0-9]{32}$/i.test(input.correlationId)
        ? { correlationId: input.correlationId }
        : {}),
    };
  }

  async trackProviderCall<T>(
    provider: string,
    correlationId: string | undefined,
    operation: () => Promise<T>,
    isSuccessful: (result: T) => boolean = () => true,
  ): Promise<T> {
    try {
      const result = await operation();
      const success = isSuccessful(result);
      this.recordMeteredOutcome({
        provider,
        correlationId,
        success,
        retryCount: 0,
        ...(success ? {} : { failureCode: 'PROVIDER_CALL_FAILED' }),
      });
      return result;
    } catch (error) {
      this.recordMeteredOutcome({
        provider,
        correlationId,
        success: false,
        retryCount: 0,
        failureCode: 'PROVIDER_CALL_FAILED',
      });
      throw error;
    }
  }

  getDiagnostics(now = Date.now()) {
    this.refreshWindow(now);
    const elapsedMinutes = Math.min(
      60,
      Math.max(0, Math.floor((now - this.windowStart) / 60_000)),
    );
    return {
      status: 'measured' as const,
      windowMinutes: 60,
      elapsedMinutes,
      calls: this.meteredTotal,
      failures: this.meteredFailures,
      retryCountLastCall: this.lastMetered?.retryCount ?? 0,
      lastCall: this.lastMetered ? { ...this.lastMetered } : undefined,
      providers: [...this.metered.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([provider, counts]) => ({ provider, ...counts })),
      requestBudget: {
        calls: this.total,
        actors: this.calls.size,
        perActorLimit: PER_ACTOR_LIMIT,
        totalLimit: TOTAL_LIMIT,
        actorCardinalityLimit: ACTOR_LIMIT,
      },
      killSwitches: {
        ai: process.env.KELEDON_AI_DISABLED === 'true',
        voice: process.env.KELEDON_VOICE_DISABLED === 'true',
      },
      automaticRetriesEnabled: false,
    };
  }

  async run<T>(
    actor: string,
    key: string | undefined,
    operation: () => Promise<T>,
  ): Promise<T> {
    if (process.env.KELEDON_AI_DISABLED === 'true')
      throw new Error('AI integration disabled');
    this.refreshWindow();
    const identity = actor || 'system';
    const dedup = key ? `${identity}:${key}` : undefined;
    for (const [id, result] of this.completed)
      if (Date.now() - result.at > 60000) this.completed.delete(id);
    if (dedup && this.completed.has(dedup))
      return this.completed.get(dedup).value;
    if (dedup && this.inflight.has(dedup)) return this.inflight.get(dedup);
    const count = this.calls.get(identity) || 0;
    if (
      count >= PER_ACTOR_LIMIT ||
      this.total >= TOTAL_LIMIT ||
      (this.calls.size >= ACTOR_LIMIT && !this.calls.has(identity))
    )
      throw new Error('AI request budget exceeded');
    this.calls.set(identity, count + 1);
    this.total++;
    const promise = operation();
    if (dedup) this.inflight.set(dedup, promise);
    try {
      const value = await promise;
      if (dedup) {
        if (this.completed.size >= 1000)
          this.completed.delete(this.completed.keys().next().value);
        this.completed.set(dedup, { at: Date.now(), value });
      }
      return value;
    } finally {
      if (dedup) this.inflight.delete(dedup);
    }
  }
}
export const runtimeAiBudget = new RuntimeAiBudget();
