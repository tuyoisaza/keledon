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
    subAgentRun: { create: jest.fn(), update: jest.fn() },
  };
  let service: SubAgentService;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.subAgent.upsert.mockImplementation(
      ({ where }: { where: { id: string } }) => {
        const role = where.id.includes('flow-executor')
          ? 'flow-executor'
          : where.id.includes('tool-')
            ? 'tool-operator'
            : where.id.includes('listener')
              ? 'listener'
              : 'processor';
        return { id: where.id, role };
      },
    );
    prisma.subAgent.update.mockResolvedValue({});
    prisma.flowRun.create.mockResolvedValue({ id: 'run-1' });
    prisma.flowRun.update.mockResolvedValue({});
    prisma.subAgentRun.create.mockResolvedValue({ id: 'subagent-run-1' });
    prisma.subAgentRun.update.mockResolvedValue({});
    service = new SubAgentService(prisma as unknown as PrismaService);
  });

  it('evaluates decisions and fails closed without a tenant step adapter', async () => {
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

    expect(result.success).toBe(false);
    expect(result.executionLog.map(({ status }) => status)).toEqual([
      'success',
      'failed',
    ]);
    expect(result.executionLog[1]?.error).toContain(
      'No tenant execution adapter',
    );
    expect(prisma.subAgentRun.create).toHaveBeenCalledWith({
      data: {
        subAgentId: 'session-1-flow-executor-1',
        flowRunId: 'run-1',
        flowId: 'flow-1',
        flowStepIds: '["decision-1","speak-1"]',
        status: 'running',
      },
    });
    expect(prisma.subAgentRun.update).toHaveBeenCalledWith({
      where: { id: 'subagent-run-1' },
      data: expect.objectContaining({ status: 'failed' }),
    });
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
