import { RAGService } from './rag.service';

describe('RAGService tenant-scoped retrieval', () => {
  const service = new RAGService();
  const fetchMock = jest.spyOn(global, 'fetch');

  afterEach(() => fetchMock.mockReset());

  it('requires company and session scope before contacting Qdrant', async () => {
    await expect(
      service.retrieveKnowledge('lookup', {
        sessionId: '',
        companyId: '',
      }),
    ).rejects.toThrow('RAG tenant scope is required');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('filters by tenant, team and brand and discards mismatched payloads', async () => {
    fetchMock
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            result: { config: { params: { vectors: { size: 4 } } } },
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            result: [
              {
                id: 'same-tenant',
                score: 0.9,
                payload: {
                  doc_id: 'doc-1',
                  text: 'allowed',
                  company_id: 'company-a',
                  team_id: 'team-a',
                  brand_id: 'brand-a',
                },
              },
              {
                id: 'other-tenant',
                score: 1,
                payload: {
                  doc_id: 'doc-2',
                  text: 'private',
                  company_id: 'company-b',
                  team_id: 'team-a',
                  brand_id: 'brand-a',
                },
              },
            ],
          }),
          { status: 200 },
        ),
      );

    const results = await service.retrieveKnowledge('lookup', {
      sessionId: 'session-a',
      companyId: 'company-a',
      teamId: 'team-a',
      brandId: 'brand-a',
      maxResults: 500,
    });

    expect(results.map(({ id }) => id)).toEqual(['same-tenant']);
    const [, request] = fetchMock.mock.calls[1] ?? [];
    const bodyValue = request?.body;
    if (typeof bodyValue !== 'string') {
      throw new Error('Expected serialized Qdrant request body');
    }
    const body = JSON.parse(bodyValue) as {
      limit: number;
      filter: { must: Array<{ key: string; match: { value: string } }> };
    };
    expect(body.limit).toBe(50);
    expect(body.filter.must).toEqual([
      { key: 'company_id', match: { value: 'company-a' } },
      { key: 'team_id', match: { value: 'team-a' } },
      { key: 'brand_id', match: { value: 'brand-a' } },
    ]);
  });
});
