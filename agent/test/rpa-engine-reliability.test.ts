import { RPAExecutor } from '../src/rpa/executor/index.js';

describe('RPA Executor reliability controls', () => {
  let executor: RPAExecutor;

  beforeEach(() => {
    executor = new RPAExecutor({ retryAttempts: 3, retryDelay: 0 });
    jest.spyOn(executor, 'delay').mockResolvedValue(undefined);
  });

  it('retries a failed action and returns immediately after success', async () => {
    const action = jest
      .spyOn(executor, 'performStepAction')
      .mockResolvedValueOnce({ status: 'failure', error: 'transient' })
      .mockResolvedValueOnce({ status: 'success', data: { value: 'ok' } });
    const retryHandler = jest.fn();
    executor.on('step:retry', retryHandler);

    const result = await executor.executeStepWithRetry({ id: 'step-1', action: 'read' });

    expect(action).toHaveBeenCalledTimes(2);
    expect(result).toEqual({ status: 'success', data: { value: 'ok' } });
    expect(retryHandler).toHaveBeenCalledTimes(1);
  });

  it('returns the last failure after exhausting configured attempts', async () => {
    const action = jest
      .spyOn(executor, 'performStepAction')
      .mockRejectedValue(new Error('provider unavailable'));

    const result = await executor.executeStepWithRetry({ id: 'step-2', action: 'click' });

    expect(action).toHaveBeenCalledTimes(3);
    expect(result.status).toBe('failure');
    expect(result.error.message).toBe('provider unavailable');
  });

  it('accepts only HTTP(S) or relative navigation targets', () => {
    expect(executor.isValidUrl('https://crm.customer.example/cases')).toBe(true);
    expect(executor.isValidUrl('http://localhost:3000')).toBe(true);
    expect(executor.isValidUrl('/cases/123')).toBe(true);
    expect(executor.isValidUrl('//external.example/cases')).toBe(false);
    expect(executor.isValidUrl('javascript:alert(1)')).toBe(false);
    expect(executor.isValidUrl('file:///etc/passwd')).toBe(false);
  });

  it('resolves selector templates from the execution context', () => {
    executor.executionContext = { recordId: 'case-123' };

    expect(executor.resolveTemplateVariables('[data-id="{{recordId}}"]')).toBe(
      '[data-id="case-123"]',
    );
  });
});
