import { VectorStoreService } from './vector-store.service';

describe('VectorStoreService input and tenant boundaries', () => {
  function makeService() {
    const qdrant = {
      upsert: jest.fn().mockResolvedValue(undefined),
      delete: jest.fn().mockResolvedValue(undefined),
      search: jest.fn().mockResolvedValue([
        {
          id: 'document-a',
          score: 0.9,
          payload: { company_id: 'company-a', team_id: 'team-a' },
        },
      ]),
      scroll: jest.fn().mockResolvedValue({
        points: [
          { id: 'document-a', payload: { company_id: 'company-a' } },
          { id: null, payload: null },
        ],
      }),
    };
    const service = Object.create(
      VectorStoreService.prototype,
    ) as VectorStoreService;
    Object.defineProperty(service, 'qdrant', { value: qdrant });
    Object.defineProperty(service, 'collectionName', { value: 'keledon' });
    Object.defineProperty(service, 'vectorSize', { value: 768 });
    return { service, qdrant };
  }

  it('rejects malformed documents before contacting Qdrant', async () => {
    const { service, qdrant } = makeService();

    await expect(service.addDocument({ content: 5 })).rejects.toThrow(
      'Document content is required',
    );
    expect(qdrant.upsert).not.toHaveBeenCalled();
  });

  it('updates with an upsert so invalid replacements cannot delete the prior point', async () => {
    const { service, qdrant } = makeService();

    await expect(
      service.updateDocument('document-a', { content: '' }),
    ).rejects.toThrow('Document content is required');
    expect(qdrant.delete).not.toHaveBeenCalled();

    const result = await service.updateDocument('document-a', {
      content: 'Updated policy',
      company_id: 'company-a',
      team_id: 'team-a',
    });

    expect(result).toEqual({ id: 'document-a', success: true });
    expect(qdrant.upsert).toHaveBeenCalledTimes(1);
    expect(result.id).toBe('document-a');
  });

  it('applies every supplied tenant filter and safely projects search results', async () => {
    const { service, qdrant } = makeService();

    const result: Awaited<ReturnType<VectorStoreService['search']>> =
      await service.search('query', {
        company_id: 'company-a',
        brand_id: 'brand-a',
        team_id: 'team-a',
        category: ['guide'],
        limit: 200,
        scoreThreshold: 2,
      });

    expect(qdrant.search).toHaveBeenCalledWith(
      'keledon',
      expect.objectContaining({
        limit: 100,
        score_threshold: 1,
        filter: {
          must: [
            { key: 'category', match: { any: ['guide'] } },
            { key: 'company_id', match: { value: 'company-a' } },
            { key: 'brand_id', match: { value: 'brand-a' } },
            { key: 'team_id', match: { value: 'team-a' } },
          ],
        },
      }),
    );
    expect(result.results[0].document.company_id).toBe('company-a');
    expect(result.results[0].relevance).toBe('high');
  });

  it('ignores malformed scroll points', async () => {
    const { service } = makeService();

    await expect(service.listDocuments()).resolves.toEqual({
      documents: [{ id: 'document-a', company_id: 'company-a' }],
    });
  });
});
