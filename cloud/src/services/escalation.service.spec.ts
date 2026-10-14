import { EscalationService } from './escalation.service';
import { PrismaService } from '../prisma/prisma.service';

describe('EscalationService', () => {
  const findUnique = jest.fn();
  const findMany = jest.fn();
  const update = jest.fn();
  const escalationLog = { findUnique, findMany, update };
  const prisma = { escalationLog } as unknown as PrismaService;
  const service = new EscalationService(prisma);

  beforeEach(() => {
    findUnique.mockReset();
    findMany.mockReset();
    update.mockReset();
  });

  it('bounds list limits before querying Prisma', async () => {
    findMany.mockResolvedValue([]);
    await service.getByTeamId('team-a', 10000);
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { teamId: 'team-a' }, take: 100 }),
    );
  });

  it('returns generic database errors without exposing query details', async () => {
    findUnique.mockRejectedValue(
      new Error('secret SQL and connection details'),
    );
    await expect(service.getById('escalation-a')).rejects.toThrow(
      'Escalation retrieval failed',
    );
  });

  it('recovers from malformed persisted metadata when aborting', async () => {
    findUnique.mockResolvedValue({
      id: 'escalation-a',
      metadata: '{invalid-json',
    });
    update.mockResolvedValue({ id: 'escalation-a', status: 'aborted' });

    await service.abort('escalation-a');

    expect(update).toHaveBeenCalledWith({
      where: { id: 'escalation-a' },
      data: {
        status: 'aborted',
        metadata: JSON.stringify({ abortReason: 'user_abort' }),
      },
    });
  });
});
