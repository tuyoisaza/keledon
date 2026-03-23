const getConfig = () => {
  return {
    apiUrl: import.meta.env.VITE_API_URL || '/',
    openaiApiKey: import.meta.env.VITE_OPENAI_API_KEY || '',
  };
};

export interface PolicyDocument {
  id: string;
  title: string;
  content: string;
  category: 'safety' | 'procedure' | 'compliance' | 'knowledge';
  embedding?: number[];
  metadata?: Record<string, any>;
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
  private async fetchApi(endpoint: string, options: RequestInit = {}) {
    const config = getConfig();
    const response = await fetch(`${config.apiUrl}api/vector-store${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(error || `API error: ${response.status}`);
    }
    
    return response.json();
  }

  async getCollectionStatus(): Promise<VectorStoreStatus> {
    try {
      return await this.fetchApi('/status');
    } catch (error) {
      return {
        collectionExists: false,
        documentCount: 0,
        collectionSize: '0 B',
        dimensions: 768,
        distance: 'Cosine'
      };
    }
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
    const result = await this.fetchApi('/search', {
      method: 'POST',
      body: JSON.stringify({
        query,
        ...options,
      }),
    });
    return result.results || [];
  }

  async listAllDocuments(): Promise<PolicyDocument[]> {
    const result = await this.fetchApi('/documents');
    return result.documents || [];
  }

  private getRelevanceLevel(score: number): 'high' | 'medium' | 'low' {
    if (score >= 0.8) return 'high';
    if (score >= 0.6) return 'medium';
    return 'low';
  }
}

export const vectorStoreAPI = new VectorStoreAPI();
