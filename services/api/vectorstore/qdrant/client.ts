/**
 * Qdrant Client Stub — for Semantic Memory
 * Contract: metadata schema per Keledón brief
 * 
 * {
 *   "project": "string",
 *   "flow": "string",
 *   "version": "YYYY-MM",
 *   "language": "en",
 *   "status": "active"
 * }
 */
export class QdrantClient {
  private readonly url: string;
  private readonly apiKey: string;

  constructor() {
    this.url = process.env.QDRANT_URL || 'http://localhost:6333';
    this.apiKey = process.env.QDRANT_API_KEY || '';
  }

  async upsert(points: Array<{
    id: string;
    vector: number[];
    payload: {
      project: string;
      flow: string;
      version: string;
      language: string;
      status: 'active' | 'archived';
      content: string;
    };
  }>): Promise<void> {
    // In production: call Qdrant HTTP API
    console.log('[Qdrant] Upserting', points.length, 'points');
    // TODO: implement real HTTP client
  }

  async search(queryVector: number[], limit = 3): Promise<Array<{
    id: string;
    score: number;
    payload: any;
  }>> {
    console.log('[Qdrant] Search with vector length', queryVector.length);
    return [];
  }
}