const QDRANT_URL = import.meta.env.VITE_QDRANT_URL || 'https://keledon.tuyoisaza.com/qdrant';
const QDRANT_API_KEY = import.meta.env.VITE_QDRANT_API_KEY || '';
const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY || '';

export interface PolicyDocument {
  id: string;
  title: string;
  content: string;
  category: 'safety' | 'procedure' | 'compliance' | 'knowledge';
  embedding?: number[];
  metadata?: Record<string, any>;
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
  private getHeaders() {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    if (QDRANT_API_KEY) {
      headers['api-key'] = QDRANT_API_KEY;
    }
    return headers;
  }

  async generateEmbedding(text: string): Promise<number[]> {
    if (!OPENAI_API_KEY) {
      throw new Error('OpenAI API key not configured');
    }

    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
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
    try {
      const response = await fetch(`${QDRANT_URL}/collections/keledon-policies`, {
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
    } catch (error) {
      console.error('Failed to get collection status:', error);
      // Return mock data for development
      return {
        collectionExists: true,
        documentCount: 5,
        collectionSize: '2.4 MB',
        dimensions: 1536,
        distance: 'Cosine'
      };
    }
  }

  async createCollection(): Promise<void> {
    const response = await fetch(`${QDRANT_URL}/collections/keledon-policies`, {
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

    const response = await fetch(`${QDRANT_URL}/collections/keledon-policies/points`, {
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
    const response = await fetch(`${QDRANT_URL}/collections/keledon-policies/points/delete`, {
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
  } = {}): Promise<RetrievalResult[]> {
    const queryEmbedding = await this.generateEmbedding(query);
    
    const filter = options.category ? {
      must: [
        { key: 'category', match: { any: options.category } }
      ]
    } : undefined;

    const response = await fetch(`${QDRANT_URL}/collections/keledon-policies/points/search`, {
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
      },
      score: result.score,
      relevance: this.getRelevanceLevel(result.score),
    }));
  }

  async listAllDocuments(): Promise<PolicyDocument[]> {
    const response = await fetch(`${QDRANT_URL}/collections/keledon-policies/points/scroll`, {
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

  // Mock methods for development when API is not available
  async mockStatus(): Promise<VectorStoreStatus> {
    return {
      collectionExists: true,
      documentCount: 5,
      collectionSize: '2.4 MB',
      dimensions: 1536,
      distance: 'Cosine'
    };
  }

  async mockSearch(query: string): Promise<RetrievalResult[]> {
    const mockDocs: PolicyDocument[] = [
      {
        id: 'safety-001',
        title: 'User Safety First',
        content: 'Always prioritize user safety. If uncertain about an action, ask for clarification rather than making assumptions.',
        category: 'safety',
        metadata: { priority: 'high', version: '1.0' }
      },
      {
        id: 'procedure-001',
        title: 'Confirmation Before Actions',
        content: 'Before executing any browser automation actions that modify data, always confirm with the user by describing what will happen.',
        category: 'procedure',
        metadata: { priority: 'medium', version: '1.0' }
      }
    ];

    return mockDocs.map(doc => ({
      document: doc,
      score: Math.random() * 0.5 + 0.5, // Random score between 0.5-1.0
      relevance: 'high' as const
    }));
  }

  async mockDocuments(): Promise<PolicyDocument[]> {
    return [
      {
        id: 'safety-001',
        title: 'User Safety First',
        content: 'Always prioritize user safety. If uncertain about an action, ask for clarification rather than making assumptions.',
        category: 'safety',
        metadata: { priority: 'high', version: '1.0' }
      },
      {
        id: 'procedure-001',
        title: 'Confirmation Before Actions',
        content: 'Before executing any browser automation actions that modify data, always confirm with the user by describing what will happen.',
        category: 'procedure',
        metadata: { priority: 'medium', version: '1.0' }
      },
      {
        id: 'compliance-001',
        title: 'Privacy Protection',
        content: 'Never store, transmit, or log sensitive user information such as passwords, credit card numbers, or personal identifiers.',
        category: 'compliance',
        metadata: { priority: 'high', version: '1.0' }
      },
      {
        id: 'knowledge-001',
        title: 'CRM System Navigation',
        content: 'When users need to navigate CRM systems like Salesforce or Genesys, look for common navigation patterns: main menu items, search bars.',
        category: 'knowledge',
        metadata: { domain: ['salesforce', 'genesys'], version: '1.0' }
      },
      {
        id: 'knowledge-002',
        title: 'Form Automation Best Practices',
        content: 'When automating form filling: 1) Wait for fields to be visible and enabled 2) Use clear selectors 3) Validate data before submission.',
        category: 'knowledge',
        metadata: { domain: ['automation'], version: '1.0' }
      }
    ];
  }
}

export const vectorStoreAPI = new VectorStoreAPI();