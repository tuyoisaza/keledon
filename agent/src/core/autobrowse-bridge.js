/**
 * AutoBrowse Bridge - HTTP Client for AutoBrowse Service
 * Bridges the Agent Extension to the AutoBrowse Playwright service
 */

export class AutoBrowseBridge {
  constructor() {
    this.baseUrl = process.env.AUTOBROWSE_URL || 'http://localhost:8765';
    this.timeoutMs = parseInt(process.env.AUTOBROWSE_TIMEOUT || '60000');
    this.enabled = process.env.AUTOBROWSE_ENABLED === 'true';
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  async executeGoal(params: {
    goal: string;
    context?: Record<string, unknown>;
    flowId?: string;
    sessionId?: string;
    tabId?: string;
    targetUrl?: string;
    maxSteps?: number;
    timeoutMs?: number;
  }): Promise<{
    execution_id: string;
    status: 'success' | 'failure' | 'partial';
    results: Array<{
      step_id: string;
      status: string;
      result?: Record<string, unknown>;
      error?: Record<string, unknown>;
      duration_ms?: number;
    }>;
    summary: Record<string, number>;
  }> {
    if (!this.enabled) {
      throw new Error('AutoBrowse bridge is disabled');
    }

    const executionContext = {
      sessionId: params.sessionId || 'unknown',
      flowId: params.flowId || 'unknown',
      tabId: params.tabId,
      targetUrl: params.targetUrl,
      metadata: params.context
    };

    const executionGoal = {
      goal: params.goal,
      context: params.context,
      maxSteps: params.maxSteps || 20,
      timeoutMs: params.timeoutMs || this.timeoutMs
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), params.timeoutMs || this.timeoutMs);

    try {
      const response = await fetch(`${this.baseUrl}/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          context: executionContext,
          goal: executionGoal
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`AutoBrowse service returned ${response.status}: ${errorText}`);
      }

      const result = await response.json();
      
      this.emit('autobrowse:result', result);
      
      return result;

    } catch (error) {
      clearTimeout(timeoutId);
      
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      this.emit('autobrowse:error', { error: errorMessage });
      
      throw error;
    }
  }

  async checkHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000)
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  private eventHandlers: Map<string, Array<(data: unknown) => void>> = new Map();

  on(event: string, handler: (data: unknown) => void): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event)!.push(handler);
  }

  emit(event: string, data: unknown): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.error(`Error in AutoBrowse bridge event handler for ${event}:`, error);
        }
      });
    }
  }

  getStatus(): { enabled: boolean; baseUrl: string; timeoutMs: number } {
    return {
      enabled: this.enabled,
      baseUrl: this.baseUrl,
      timeoutMs: this.timeoutMs
    };
  }
}

export const autoBrowseBridge = new AutoBrowseBridge();