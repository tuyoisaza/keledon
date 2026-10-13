import { RPAExecutor } from '../src/rpa/executor/index.js';

describe('RPA Executor flow lifecycle', () => {
  let executor: RPAExecutor;

  beforeEach(() => {
    executor = new RPAExecutor({ retryAttempts: 1, retryDelay: 0 });
  });

  it('starts idle and exposes an empty execution history', () => {
    expect(executor.getExecutionStatus()).toMatchObject({
      isExecuting: false,
      currentFlow: null,
      currentStep: null,
      resultHistory: [],
    });
  });

  it('executes a valid flow in order and records its result', async () => {
    const stepOrder: string[] = [];
    jest.spyOn(executor, 'executeStep').mockImplementation(async (step, index) => {
      stepOrder.push(step.id);
      return { stepId: step.id, status: 'success', duration_ms: index + 1, result: step.id };
    });

    const result = await executor.executeFlow(
      { id: 'flow-1', steps: [{ id: 'first' }, { id: 'second' }] },
      { startTime: Date.now(), tenant: 'tenant-a' },
    );

    expect(stepOrder).toEqual(['first', 'second']);
    expect(result.status).toBe('success');
    expect(result.steps).toHaveLength(2);
    expect(executor.getExecutionStatus().resultHistory).toHaveLength(1);
    expect(executor.getExecutionStatus().isExecuting).toBe(false);
  });

  it('rejects invalid flow definitions before starting execution', async () => {
    await expect(executor.executeFlow({ id: 'missing-steps' })).rejects.toThrow(
      'Invalid flow: must have steps array',
    );
    expect(executor.getExecutionStatus().isExecuting).toBe(false);
  });

  it('stops after a failed step and reports a failed flow', async () => {
    const executeStep = jest
      .spyOn(executor, 'executeStep')
      .mockResolvedValue({ stepId: 'first', status: 'failure' });

    const result = await executor.executeFlow(
      { id: 'flow-fails', steps: [{ id: 'first' }, { id: 'must-not-run' }] },
      { startTime: Date.now() },
    );

    expect(executeStep).toHaveBeenCalledTimes(1);
    expect(result.status).toBe('failed');
  });
});
