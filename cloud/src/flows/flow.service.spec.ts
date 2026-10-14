import { FlowService } from './flow.service';
import { PrismaService } from '../prisma/prisma.service';

describe('FlowService tenant boundaries', () => {
  const flowFindMany = jest.fn();
  const flowStepFindMany = jest.fn();
  const flowStepUpdate = jest.fn();
  const transaction = jest.fn((work: (tx: any) => Promise<void>) =>
    work({ flowStep: { findMany: flowStepFindMany, update: flowStepUpdate } }),
  );
  const prisma = {
    flow: { findMany: flowFindMany },
    flowStep: { findMany: flowStepFindMany, update: flowStepUpdate },
    $transaction: transaction,
  } as unknown as PrismaService;
  const service = new FlowService(prisma);
  const fetchMock: jest.MockedFunction<typeof fetch> = jest.fn();
  const originalFetch = global.fetch;

  beforeEach(() => {
    fetchMock.mockReset();
    flowFindMany.mockReset();
    flowStepFindMany.mockReset();
    flowStepUpdate.mockReset();
    transaction.mockClear();
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

  it('reorders only a complete, unique set of steps belonging to one flow', async () => {
    flowStepFindMany.mockResolvedValue([
      { id: 'step-a' },
      { id: 'step-b' },
      { id: 'step-c' },
    ]);
    flowStepUpdate.mockResolvedValue({ count: 1 });

    await service.reorderSteps('flow-a', ['step-c', 'step-a', 'step-b']);

    expect(flowStepFindMany).toHaveBeenCalledWith({
      where: { flowId: 'flow-a' },
      select: { id: true },
    });
    expect(flowStepUpdate.mock.calls).toEqual([
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
    ['duplicate', ['step-a', 'step-a', 'step-c']],
    ['foreign or unknown ID', ['step-a', 'step-b', 'step-other']],
    ['malformed value', ['step-a', 'step-b', null]],
    ['missing list', undefined],
  ])('rejects a %s reorder without writes', async (_case, stepIds) => {
    flowStepFindMany.mockResolvedValue([
      { id: 'step-a' },
      { id: 'step-b' },
      { id: 'step-c' },
    ]);

    await expect(service.reorderSteps('flow-a', stepIds)).rejects.toThrow(
      'Step order does not match flow steps',
    );
    expect(flowStepUpdate).not.toHaveBeenCalled();
  });
});
