import { apiFetch } from './api-fetch';

export interface PolicyDocument {
  id: string;
  title: string;
  content: string;
  category: 'safety' | 'procedure' | 'compliance' | 'knowledge';
  embedding?: number[];
  metadata?: Record<string, unknown>;
  company_id: string;
  brand_id?: string;
  team_id?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface RetrievalResult {
  document: PolicyDocument;
  score: number;
  relevance: 'high' | 'medium' | 'low';
}

export interface VectorStoreStatus {
  collectionExists: boolean;
  documentCount: number;
  collectionSize: string;
  dimensions: number;
  distance: string;
}

class VectorStoreAPI {

  private async fetchApi<T = unknown>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const response = await apiFetch(`/api/vector-store${endpoint}`, options);
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(error || `API error: ${response.status}`);
    }
    
    const data: unknown = await response.json();
    return data as T;
  }

  async getCollectionStatus(): Promise<VectorStoreStatus> {
    // Unavailable/unauthorized is an error, never an invented empty collection.
    return this.fetchApi<VectorStoreStatus>('/status');
  }

  async addDocument(document: PolicyDocument): Promise<void> {
    await this.fetchApi('/documents', {
      method: 'POST',
      body: JSON.stringify(document),
    });
  }

  async updateDocument(document: PolicyDocument): Promise<void> {
    await this.fetchApi(`/documents/${document.id}`, {
      method: 'PUT',
      body: JSON.stringify(document),
    });
  }

  async deleteDocument(id: string): Promise<void> {
    await this.fetchApi(`/documents/${id}`, {
      method: 'DELETE',
    });
  }

  async searchDocuments(query: string, options: {
    limit?: number;
    scoreThreshold?: number;
    category?: string[];
    company_id?: string;
    brand_id?: string;
    team_id?: string;
  } = {}): Promise<RetrievalResult[]> {
    const result = await this.fetchApi<{ results?: RetrievalResult[] }>('/search', {
      method: 'POST',
      body: JSON.stringify({
        query,
        ...options,
      }),
    });
    return result.results ?? [];
  }

  async listAllDocuments(): Promise<PolicyDocument[]> {
    const result = await this.fetchApi<{ documents?: Array<PolicyDocument & { text?: string }> }>('/documents');
    return (result.documents ?? []).map((document) => ({
      ...document,
      content: document.content ?? document.text ?? '',
      title: document.title ?? document.text ?? 'Untitled document',
    }));
  }

}

export const vectorStoreAPI = new VectorStoreAPI();
