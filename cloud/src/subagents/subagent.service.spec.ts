import { SubAgentService } from './subagent.service';
import { PrismaService } from '../prisma/prisma.service';

describe('SubAgentService', () => {
  const prisma = {
    subAgent: {
      upsert: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      findMany: jest.fn(),
    },
    flow: { findUnique: jest.fn() },
    flowRun: { create: jest.fn(), update: jest.fn(), findUnique: jest.fn() },
  };
  let service: SubAgentService;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.subAgent.upsert.mockImplementation(
      ({ where }: { where: { id: string } }) => ({
        id: where.id,
        role: 'flow-executor',
      }),
    );
    prisma.subAgent.update.mockResolvedValue({});
    prisma.flowRun.create.mockResolvedValue({ id: 'run-1' });
    prisma.flowRun.update.mockResolvedValue({});
    service = new SubAgentService(prisma as unknown as PrismaService);
  });

  it('evaluates supported decision conditions without executing JavaScript', async () => {
    await service.initializeSession('session-1');
    prisma.flow.findUnique.mockResolvedValue({
      id: 'flow-1',
      steps: [
        {
          id: 'decision-1',
          type: 'decision',
          condition: 'context.allowed === true',
          optional: false,
          timeout: 10,
        },
        {
          id: 'speak-1',
          type: 'speak',
          value: 'done',
          optional: false,
          timeout: 10,
        },
      ],
    });

    const result = await service.executeFlow(
      'flow-1',
      { allowed: true },
      'session-1',
    );

    expect(result.executionLog.map(({ status }) => status)).toEqual([
      'success',
      'success',
    ]);
  });

  it('fails closed on executable or unsupported condition expressions', async () => {
    await service.initializeSession('session-1');
    prisma.flow.findUnique.mockResolvedValue({
      id: 'flow-1',
      steps: [
        {
          id: 'decision-1',
          type: 'decision',
          condition:
            '(()=>{globalThis.__conditionExecuted = true; return true})()',
          optional: false,
          timeout: 10,
        },
      ],
    });
    delete (globalThis as typeof globalThis & { __conditionExecuted?: boolean })
      .__conditionExecuted;

    const result = await service.executeFlow('flow-1', {}, 'session-1');

    expect(result.executionLog[0]?.status).toBe('skipped');
    expect(
      (globalThis as typeof globalThis & { __conditionExecuted?: boolean })
        .__conditionExecuted,
    ).toBeUndefined();
  });

  it('does not loop forever when parallel execution has no available agents', async () => {
    await expect(
      service.executeParallelFlows(['flow-1'], {}, 'session-1'),
    ).rejects.toThrow('No flow executor agents available');
  });
});
