/** Serializes cloud goals on the shared BrowserView with a bounded pending queue. */
export class CloudGoalQueue {
  private tail: Promise<void> = Promise.resolve();
  private pending = 0;
  private generation = 0;
  private executions = new Map<string, Promise<void>>();

  constructor(private readonly maxPending = 20) {}

  invalidate(): void { this.generation++; }

  run(key: string, execute: () => Promise<void>): Promise<void> {
    const existing = key ? this.executions.get(key) : undefined;
    if (existing) return existing;
    if (this.pending >= this.maxPending) return Promise.reject(new Error('Cloud goal queue is full'));
    this.pending++;
    const generation = this.generation;
    const result = this.tail.then(() => {
      if (generation !== this.generation) throw new Error('Cloud goal cancelled after disconnect');
      return execute();
    });
    const settled = result.finally(() => {
      this.pending--;
      if (key) this.executions.delete(key);
    });
    if (key) this.executions.set(key, settled);
    this.tail = settled.catch(() => {});
    return settled;
  }
}
