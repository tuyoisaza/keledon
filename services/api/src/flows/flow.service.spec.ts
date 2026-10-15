import { BadRequestException } from '@nestjs/common';
import { FlowService } from './flow.service';

describe('FlowService.reorderSteps', () => {
  const existingSteps = [{ id: 'step-a' }, { id: 'step-b' }, { id: 'step-c' }];
  let findMany: jest.Mock;
  let update: jest.Mock;
  let transaction: jest.Mock;
  let service: FlowService;

  beforeEach(() => {
    findMany = jest.fn().mockResolvedValue(existingSteps);
    update = jest.fn().mockResolvedValue({ count: 1 });
    transaction = jest.fn((work: (tx: any) => Promise<void>) =>
      work({ flowStep: { findMany, update } }),
    );
    service = new FlowService({
      flowStep: { findMany, update },
      $transaction: transaction,
    } as any);
  });

  it('applies a complete unique ordering atomically', async () => {
    await service.reorderSteps('flow-a', ['step-c', 'step-a', 'step-b']);

    expect(findMany).toHaveBeenCalledWith({
      where: { flowId: 'flow-a' },
      select: { id: true },
    });
    expect(update.mock.calls).toEqual([
      [{ where: { id: 'step-c' }, data: { order: 0 } }],
      [{ where: { id: 'step-a' }, data: { order: 1 } }],
      [{ where: { id: 'step-b' }, data: { order: 2 } }],
    ]);
    expect(transaction).toHaveBeenCalledTimes(1);
    expect(transaction).toHaveBeenCalledWith(expect.any(Function), {
      isolationLevel: 'Serializable',
    });
  });

  it.each([
    ['subset', ['step-a']],
    ['duplicate IDs', ['step-a', 'step-a', 'step-c']],
    ['unknown or foreign IDs', ['step-a', 'step-b', 'step-other']],
    ['malformed IDs', ['step-a', 'step-b', null]],
    ['missing IDs', undefined],
  ])('rejects %s without writes', async (_case, stepIds) => {
    await expect(
      service.reorderSteps('flow-a', stepIds),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(update).not.toHaveBeenCalled();
  });

  it('accepts the empty ordering only when the flow has no steps', async () => {
    findMany.mockResolvedValueOnce([]);

    await service.reorderSteps('empty-flow', []);

    expect(transaction).toHaveBeenCalledWith(expect.any(Function), {
      isolationLevel: 'Serializable',
    });
  });
});

describe('FlowService.searchFlows', () => {
  let service: FlowService;
  let fetchMock: jest.MockedFunction<typeof fetch>;
  const originalFetch = global.fetch;

  beforeEach(() => {
    fetchMock = jest.fn();
    global.fetch = fetchMock;
    service = new FlowService({} as any);
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('fails closed without a team or non-empty query', async () => {
    await expect(service.searchFlows('refund')).resolves.toEqual([]);
    await expect(service.searchFlows('  ', 'team-a')).resolves.toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('always filters by team, bounds results, and rejects malformed rows', async () => {
    fetchMock
      .mockResolvedValueOnce(new Response(null, { status: 200 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            result: [
              { id: 'flow-a', score: 0.8, payload: { teamId: 'team-a' } },
              { id: 'flow-b', score: 'high', payload: { teamId: 'team-a' } },
              { id: 'flow-c', score: 0.4, payload: 'invalid' },
            ],
          }),
          { status: 200 },
        ),
      );

    await expect(
      service.searchFlows(' refund ', 'team-a', 1000),
    ).resolves.toEqual([
      { id: 'flow-a', score: 0.8, payload: { teamId: 'team-a' } },
      { id: 'flow-c', score: 0.4 },
    ]);

    const request = fetchMock.mock.calls[1]?.[1];
    expect(typeof request?.body).toBe('string');
    if (typeof request?.body !== 'string')
      throw new Error('Expected JSON request');
    const body = JSON.parse(request.body);
    expect(body.limit).toBe(50);
    expect(body.filter.must).toContainEqual({
      key: 'teamId',
      match: { value: 'team-a' },
    });
    expect(body.vector).toHaveLength(768);
  });

  it('uses a bounded default for non-finite limits', async () => {
    fetchMock
      .mockResolvedValueOnce(new Response(null, { status: 200 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ result: [] }), { status: 200 }),
      );

    await service.searchFlows('refund', 'team-a', Number.POSITIVE_INFINITY);

    const request = fetchMock.mock.calls[1]?.[1];
    expect(typeof request?.body).toBe('string');
    if (typeof request?.body !== 'string')
      throw new Error('Expected JSON request');
    const body = JSON.parse(request.body);
    expect(body.limit).toBe(5);
  });

  it('fails closed when Qdrant rejects a scoped search', async () => {
    fetchMock
      .mockResolvedValueOnce(new Response(null, { status: 200 }))
      .mockResolvedValueOnce(new Response(null, { status: 503 }));

    await expect(service.searchFlows('refund', 'team-a')).rejects.toThrow(
      'Flow search failed',
    );
  });
});

describe('FlowService.findAll', () => {
  it('fails closed without a team and scopes listings to the requested team', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const service = new FlowService({ flow: { findMany } } as any);

    await expect(service.findAll()).resolves.toEqual([]);
    expect(findMany).not.toHaveBeenCalled();

    await expect(service.findAll('team-a', 'support')).resolves.toEqual([]);
    expect(findMany).toHaveBeenCalledWith({
      where: { teamId: 'team-a', category: 'support' },
      include: { steps: { orderBy: { order: 'asc' } } },
      orderBy: { updatedAt: 'desc' },
    });
  });
});
