const getConfig = () => {
  const env = {
    qdrantUrl: import.meta.env.VITE_QDRANT_URL,
    qdrantApiKey: import.meta.env.VITE_QDRANT_API_KEY,
    openaiApiKey: import.meta.env.VITE_OPENAI_API_KEY,
  };
  
  try {
    const saved = localStorage.getItem('vector-store-config');
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        qdrantUrl: env.qdrantUrl || parsed.qdrantUrl || 'https://keledon.tuyoisaza.com/qdrant',
        qdrantApiKey: env.qdrantApiKey || parsed.qdrantApiKey || '',
        openaiApiKey: env.openaiApiKey || parsed.openaiApiKey || '',
      };
    }
  } catch (e) {}
  
  return {
    qdrantUrl: env.qdrantUrl || 'https://keledon.tuyoisaza.com/qdrant',
    qdrantApiKey: env.qdrantApiKey || '',
    openaiApiKey: env.openaiApiKey || '',
  };
};

export interface PolicyDocument {
  id: string;
  title: string;
  content: string;
  category: 'safety' | 'procedure' | 'compliance' | 'knowledge';
  embedding?: number[];
  metadata?: Record<string, any>;
  // Organization context fields
  company_id: string;
  brand_id?: string;
  team_id?: string;
  // Audit trail
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
  private validateConfiguration() {
    const config = getConfig();
    if (!config.qdrantUrl) {
      throw new Error('getConfig().qdrantUrl not configured. Please configure in Vector Store Settings.');
    }
    if (!config.openaiApiKey) {
      throw new Error('OPENAI_API_KEY not configured. Please configure in Vector Store Settings.');
    }
  }

  private getHeaders() {
    this.validateConfiguration();
    const config = getConfig();
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    if (config.qdrantApiKey) {
      headers['api-key'] = config.qdrantApiKey;
    }
    return headers;
  }

  private getOpenAIHeaders() {
    this.validateConfiguration();
    const config = getConfig();
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.openaiApiKey}`,
    };
  }

  async generateEmbedding(text: string): Promise<number[]> {
    this.validateConfiguration();

    const config = getConfig();

    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.openaiApiKey}`,
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: text,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to generate embedding: ${response.statusText}`);
    }

    const data = await response.json();
    return data.data[0].embedding;
  }

  async getCollectionStatus(): Promise<VectorStoreStatus> {
    this.validateConfiguration();
    
    const response = await fetch(`${getConfig().qdrantUrl}/collections/keledon-policies`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      if (response.status === 404) {
        return {
          collectionExists: false,
          documentCount: 0,
          collectionSize: '0 B',
          dimensions: 0,
          distance: 'Cosine'
        };
      }
      throw new Error(`Failed to get collection status: ${response.statusText}`);
    }

    const data = await response.json();
    const result = data.result;

    return {
      collectionExists: true,
      documentCount: result.points_count || 0,
      collectionSize: this.formatBytes(result.points_count * 1536 * 4), // Rough estimate
      dimensions: result.config.params.vectors.size,
      distance: result.config.params.vectors.distance,
    };
  }

  async createCollection(): Promise<void> {
    const response = await fetch(`${getConfig().qdrantUrl}/collections/keledon-policies`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify({
        vectors: {
          size: 1536,
          distance: 'Cosine',
        },
      }),
    });

    if (!response.ok && response.status !== 409) { // 409 = already exists
      throw new Error(`Failed to create collection: ${response.statusText}`);
    }
  }

  async addDocument(document: PolicyDocument): Promise<void> {
    let embedding = document.embedding;
    if (!embedding) {
      embedding = await this.generateEmbedding(document.content);
    }

    const response = await fetch(`${getConfig().qdrantUrl}/collections/keledon-policies/points`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify({
        points: [{
          id: document.id,
          vector: embedding,
          payload: {
            title: document.title,
            content: document.content,
            category: document.category,
            metadata: document.metadata,
            company_id: document.company_id,
            brand_id: document.brand_id,
            team_id: document.team_id,
            created_by: document.created_by,
            created_at: document.created_at,
            updated_at: document.updated_at,
          },
        }],
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to add document: ${response.statusText}`);
    }
  }

  async updateDocument(document: PolicyDocument): Promise<void> {
    // Delete and recreate since Qdrant doesn't have update
    await this.deleteDocument(document.id);
    await this.addDocument(document);
  }

  async deleteDocument(id: string): Promise<void> {
    const response = await fetch(`${getConfig().qdrantUrl}/collections/keledon-policies/points/delete`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        points: [id],
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to delete document: ${response.statusText}`);
    }
  }

  async searchDocuments(query: string, options: {
    limit?: number;
    scoreThreshold?: number;
    category?: string[];
    company_id?: string;
    brand_id?: string;
    team_id?: string;
  } = {}): Promise<RetrievalResult[]> {
    const queryEmbedding = await this.generateEmbedding(query);
    
    const filterConditions = [];
    
    // Category filter
    if (options.category && options.category.length > 0) {
      filterConditions.push({ key: 'category', match: { any: options.category } });
    }
    
    // Organization filters
    if (options.company_id) {
      filterConditions.push({ key: 'company_id', match: { value: options.company_id } });
    }
    
    if (options.brand_id) {
      filterConditions.push({ key: 'brand_id', match: { value: options.brand_id } });
    }
    
    if (options.team_id) {
      filterConditions.push({ key: 'team_id', match: { value: options.team_id } });
    }
    
    const filter = filterConditions.length > 0 ? {
      must: filterConditions
    } : undefined;

    const response = await fetch(`${getConfig().qdrantUrl}/collections/keledon-policies/points/search`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        vector: queryEmbedding,
        limit: options.limit || 5,
        score_threshold: options.scoreThreshold || 0.5,
        filter: filter,
        with_payload: true,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to search documents: ${response.statusText}`);
    }

    const data = await response.json();
    
     return data.result.map((result: any) => ({
       document: {
         id: result.id as string,
         title: (result.payload?.title as string) || 'Untitled',
         content: (result.payload?.content as string) || '',
         category: (result.payload?.category as 'safety' | 'procedure' | 'compliance' | 'knowledge') || 'knowledge',
         metadata: result.payload?.metadata as Record<string, any> | undefined,
         company_id: (result.payload?.company_id as string) || '',
         brand_id: (result.payload?.brand_id as string) || undefined,
         team_id: (result.payload?.team_id as string) || undefined,
         created_by: (result.payload?.created_by as string) || 'unknown',
         created_at: (result.payload?.created_at as string) || new Date().toISOString(),
         updated_at: (result.payload?.updated_at as string) || new Date().toISOString(),
       },
       score: result.score,
       relevance: this.getRelevanceLevel(result.score),
     }));
  }

  async listAllDocuments(): Promise<PolicyDocument[]> {
    const response = await fetch(`${getConfig().qdrantUrl}/collections/keledon-policies/points/scroll`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        limit: 1000,
        with_payload: true,
        with_vector: false,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to list documents: ${response.statusText}`);
    }

    const data = await response.json();
    
    return data.result.points.map((point: any) => ({
      id: point.id as string,
      title: (point.payload?.title as string) || 'Untitled',
      content: (point.payload?.content as string) || '',
      category: (point.payload?.category as 'safety' | 'procedure' | 'compliance' | 'knowledge') || 'knowledge',
      metadata: point.payload?.metadata as Record<string, any> | undefined,
      company_id: (point.payload?.company_id as string) || '',
      brand_id: (point.payload?.brand_id as string) || undefined,
      team_id: (point.payload?.team_id as string) || undefined,
      created_by: (point.payload?.created_by as string) || 'unknown',
      created_at: (point.payload?.created_at as string) || new Date().toISOString(),
      updated_at: (point.payload?.updated_at as string) || new Date().toISOString(),
    }));
  }

  private getRelevanceLevel(score: number): 'high' | 'medium' | 'low' {
    if (score >= 0.8) return 'high';
    if (score >= 0.6) return 'medium';
    return 'low';
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }


}

export const vectorStoreAPI = new VectorStoreAPI();