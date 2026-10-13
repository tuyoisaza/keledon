/** @jest-environment node */

describe('MV3 RPA content-script bridge', () => {
  let messageHandler: (request: any, sender: any, respond: (value: any) => void) => unknown;
  let elements: Map<string, any>;

  beforeEach(() => {
    jest.resetModules();
    elements = new Map();
    const addListener = jest.fn((handler) => {
      messageHandler = handler;
    });
    (global as any).chrome = {
      runtime: { onMessage: { addListener } },
    };
    (global as any).document = {
      querySelector: jest.fn((selector: string) => elements.get(selector) ?? null),
    };
    (global as any).window = { location: { href: 'https://crm.customer.example/' } };

    require('../src/content_scripts/shared/content.js');
  });

  it('answers PING with the sender tab id', () => {
    const respond = jest.fn();

    messageHandler({ type: 'PING' }, { tab: { id: 17 } }, respond);

    expect(respond).toHaveBeenCalledWith({ alive: true, tabId: 17 });
  });

  it('executes the supported click action on a matched element', async () => {
    const click = jest.fn();
    elements.set('#submit', { click });
    const resultPromise = new Promise((resolve) => {
      messageHandler(
        {
          type: 'EXECUTE_RPA_STEP',
          step: { step_id: 'step-1', action: 'click', selector: '#submit' },
        },
        {},
        resolve,
      );
    });

    await expect(resultPromise).resolves.toEqual({
      step_id: 'step-1',
      status: 'success',
      evidence: 'Executed click',
    });
    expect(click).toHaveBeenCalledTimes(1);
  });

  it('returns a failure result when a selector is absent or an action is unsupported', async () => {
    const requestStep = (step: Record<string, unknown>) =>
      new Promise<any>((resolve) => {
        messageHandler({ type: 'EXECUTE_RPA_STEP', step }, {}, resolve);
      });

    await expect(
      requestStep({ step_id: 'missing', action: 'click', selector: '#missing' }),
    ).resolves.toMatchObject({ status: 'failure', step_id: 'missing' });
    await expect(
      requestStep({ step_id: 'unknown', action: 'delete', selector: '#anything' }),
    ).resolves.toMatchObject({ status: 'failure', step_id: 'unknown' });
  });
});
