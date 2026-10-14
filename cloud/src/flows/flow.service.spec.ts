import { FlowService } from './flow.service';
import { PrismaService } from '../prisma/prisma.service';

describe('FlowService tenant boundaries', () => {
  const flowFindMany = jest.fn();
  const prisma = {
    flow: { findMany: flowFindMany },
  } as unknown as PrismaService;
  const service = new FlowService(prisma);
  const fetchMock: jest.MockedFunction<typeof fetch> = jest.fn();
  const originalFetch = global.fetch;

  beforeEach(() => {
    fetchMock.mockReset();
    flowFindMany.mockReset();
    global.fetch = fetchMock;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('does not search the shared vector collection without a team', async () => {
    await expect(service.searchFlows('refund')).resolves.toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('always filters vector search by the requesting team', async () => {
    fetchMock
      .mockResolvedValueOnce(new Response(null, { status: 200 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ result: [{ id: 'flow-1', score: 0.8 }] }),
          {
            status: 200,
          },
        ),
      );

    await expect(service.searchFlows('refund', 'team-a')).resolves.toEqual([
      { id: 'flow-1', score: 0.8 },
    ]);
    const request = fetchMock.mock.calls[1]?.[1];
    expect(typeof request?.body).toBe('string');
    if (typeof request?.body !== 'string')
      throw new Error('Expected JSON request');
    const body: unknown = JSON.parse(request.body);
    const searchBody = body as {
      filter: {
        must: Array<{ key: string; match: { value: string | boolean } }>;
      };
      limit: number;
    };
    expect(searchBody.filter.must).toContainEqual({
      key: 'teamId',
      match: { value: 'team-a' },
    });
    expect(searchBody.limit).toBe(5);
  });

  it('bounds result limits and discards malformed vector rows', async () => {
    fetchMock
      .mockResolvedValueOnce(new Response(null, { status: 200 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            result: [
              { id: 'valid', score: 0.6, payload: { teamId: 'team-a' } },
              { id: 'invalid', score: 'high' },
            ],
          }),
          { status: 200 },
        ),
      );

    await expect(
      service.searchFlows('refund', 'team-a', 1000),
    ).resolves.toEqual([
      { id: 'valid', score: 0.6, payload: { teamId: 'team-a' } },
    ]);
    const request = fetchMock.mock.calls[1]?.[1];
    expect(typeof request?.body).toBe('string');
    if (typeof request?.body !== 'string')
      throw new Error('Expected JSON request');
    expect(JSON.parse(request.body)).toEqual(
      expect.objectContaining({ limit: 50 }),
    );
  });

  it('scopes database listings to one team and fails closed without one', async () => {
    flowFindMany.mockResolvedValue([]);
    await expect(service.findAll()).resolves.toEqual([]);
    expect(flowFindMany).not.toHaveBeenCalled();

    await service.findAll('team-a', 'support');
    expect(flowFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { teamId: 'team-a', category: 'support' },
      }),
    );
  });
});
