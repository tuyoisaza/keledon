/** Process-local hard request caps; failures count, retries are disabled at providers. */
export class RuntimeAiBudget {
  private windowStart = Date.now();
  private total = 0;
  private calls = new Map<string, number>();
  private completed = new Map<string, { at: number; value: any }>();
  private inflight = new Map<string, Promise<any>>();
  async run<T>(actor: string, key: string | undefined, operation: () => Promise<T>): Promise<T> {
    if (process.env.KELEDON_AI_DISABLED === 'true') throw new Error('AI integration disabled');
    if (Date.now() - this.windowStart >= 3600000) { this.windowStart = Date.now(); this.total = 0; this.calls.clear(); }
    const identity = actor || 'system';
    const dedup = key ? `${identity}:${key}` : undefined;
    for (const [id, result] of this.completed) if (Date.now() - result.at > 60000) this.completed.delete(id);
    if (dedup && this.completed.has(dedup)) return this.completed.get(dedup).value;
    if (dedup && this.inflight.has(dedup)) return this.inflight.get(dedup);
    const count = this.calls.get(identity) || 0;
    if (count >= 120 || this.total >= 10000 || this.calls.size >= 5000 && !this.calls.has(identity)) throw new Error('AI request budget exceeded');
    this.calls.set(identity, count + 1); this.total++;
    const promise = operation();
    if (dedup) this.inflight.set(dedup, promise);
    try {
      const value = await promise;
      if (dedup) {
        if (this.completed.size >= 1000) this.completed.delete(this.completed.keys().next().value);
        this.completed.set(dedup, { at: Date.now(), value });
      }
      return value;
    } finally { if (dedup) this.inflight.delete(dedup); }
  }
}
export const runtimeAiBudget = new RuntimeAiBudget();
