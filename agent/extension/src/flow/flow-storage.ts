import type { Flow, FlowStep } from './flow-recorder';

const STORAGE_KEY = 'keledon-flows';
const API_BASE = '/api/flows';

export class FlowStorage {
  private cache: Map<string, Flow> = new Map();

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const flows: Flow[] = JSON.parse(stored);
        for (const flow of flows) {
          this.cache.set(flow.id, flow);
        }
      }
    } catch (error) {
      console.error('[FlowStorage] Failed to load from storage:', error);
    }
  }

  private saveToStorage(): void {
    try {
      const flows = Array.from(this.cache.values());
      localStorage.setItem(STORAGE_KEY, JSON.stringify(flows));
    } catch (error) {
      console.error('[FlowStorage] Failed to save to storage:', error);
    }
  }

  async syncWithBackend(): Promise<void> {
    try {
      const response = await fetch(API_BASE);
      if (response.ok) {
        const flows: Flow[] = await response.json();
        for (const flow of flows) {
          this.cache.set(flow.id, flow);
        }
        this.saveToStorage();
      }
    } catch (error) {
      console.error('[FlowStorage] Failed to sync with backend:', error);
    }
  }

  async uploadFlow(flow: Flow): Promise<Flow> {
    try {
      const method = flow.id.startsWith('flow-') ? 'POST' : 'PUT';
      const url = method === 'PUT' ? `${API_BASE}/${flow.id}` : API_BASE;

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(flow),
      });

      if (response.ok) {
        const savedFlow: Flow = await response.json();
        this.cache.set(savedFlow.id, savedFlow);
        this.saveToStorage();
        return savedFlow;
      }
    } catch (error) {
      console.error('[FlowStorage] Failed to upload flow:', error);
    }

    this.cache.set(flow.id, flow);
    this.saveToStorage();
    return flow;
  }

  async deleteFlow(flowId: string): Promise<void> {
    try {
      await fetch(`${API_BASE}/${flowId}`, { method: 'DELETE' });
    } catch (error) {
      console.error('[FlowStorage] Failed to delete flow from backend:', error);
    }

    this.cache.delete(flowId);
    this.saveToStorage();
  }

  async searchFlows(query: string): Promise<Flow[]> {
    try {
      const response = await fetch(`${API_BASE}/search?q=${encodeURIComponent(query)}`);
      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      console.error('[FlowStorage] Failed to search flows:', error);
    }

    const lowerQuery = query.toLowerCase();
    return Array.from(this.cache.values()).filter(flow =>
      flow.name.toLowerCase().includes(lowerQuery) ||
      flow.description.toLowerCase().includes(lowerQuery) ||
      flow.triggerKeywords.some(k => k.toLowerCase().includes(lowerQuery))
    );
  }

  async findFlowsByTrigger(trigger: string): Promise<Flow[]> {
    try {
      const response = await fetch(`${API_BASE}/trigger/${encodeURIComponent(trigger)}`);
      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      console.error('[FlowStorage] Failed to find flows by trigger:', error);
    }

    const lowerTrigger = trigger.toLowerCase();
    return Array.from(this.cache.values()).filter(flow =>
      flow.isActive &&
      flow.triggerKeywords.some(k => lowerTrigger.includes(k.toLowerCase()))
    );
  }

  getFlow(flowId: string): Flow | undefined {
    return this.cache.get(flowId);
  }

  getAllFlows(): Flow[] {
    return Array.from(this.cache.values());
  }

  getActiveFlows(): Flow[] {
    return Array.from(this.cache.values()).filter(f => f.isActive);
  }

  getFlowsByCategory(category: string): Flow[] {
    return Array.from(this.cache.values()).filter(f => f.category === category);
  }

  getFlowsByTool(tool: string): Flow[] {
    return Array.from(this.cache.values()).filter(f => f.tool === tool);
  }

  clearCache(): void {
    this.cache.clear();
    localStorage.removeItem(STORAGE_KEY);
  }
}

export const flowStorage = new FlowStorage();
