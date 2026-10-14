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
