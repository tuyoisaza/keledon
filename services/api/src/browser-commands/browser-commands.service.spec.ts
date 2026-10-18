import { BrowserCommandsService } from './browser-commands.service';

describe('browser queue transaction and device scope', () => {
  const actor = { userId: 'user', role: 'user', email: 'phdk-uat-a@example.invalid', teamId: 'team' };
  let service: BrowserCommandsService;
  let tx: any;
  let order: string[];
  beforeEach(() => {
    order = [];
    tx = {
      $executeRaw: jest.fn(async () => { order.push('lock'); return 1; }),
      device: { findUnique: jest.fn(async () => { order.push('device'); return {
        userId: 'user', organizationId: 'tenant', user: { id: 'user', companyId: 'tenant', teamId: 'team' },
      }; }) },
      user: { findUnique: jest.fn(async () => ({ id: 'user', role: 'user', companyId: 'tenant', teamId: 'team' })) },
      session: { findMany: jest.fn(async () => { order.push('read'); return [{
        id: 'session', metadata: JSON.stringify({ deviceId: 'device' }), events: [{
          type: 'browser.command.issued', payload: JSON.stringify({ id: 'command', metadata: { deviceId: 'device' } }),
        }],
      }]; }) },
      event: { create: jest.fn(async (input) => { order.push('write'); return input.data; }) },
    };
    service = new BrowserCommandsService({ $transaction: async callback => callback(tx) } as any);
  });
  it('takes the database lock before reading or claiming and uses the transaction client', async () => {
    const result = await service.getNextCommand('device', actor);
    expect(result.command?.id).toBe('command');
    expect(order).toEqual(['lock', 'device', 'read', 'write']);
  });
  it('does not let a session fallback override an explicit different device target', async () => {
    tx.session.findMany.mockResolvedValue([{ id: 'session', metadata: JSON.stringify({ deviceId: 'device' }),
      events: [{ type: 'browser.command.issued', payload: JSON.stringify({ id: 'other', metadata: { deviceId: 'foreign-device' } }) }] }]);
    const result = await service.getNextCommand('device', actor);
    expect(result.command).toBeNull();
    expect(tx.event.create).not.toHaveBeenCalled();
  });
  it('cannot overwrite the server-resolved device in result metadata', async () => {
    await service.recordCommandResult('device', { commandId: 'command', status: 'completed', metadata: { deviceId: 'foreign-device' } }, actor);
    const resultWrite = tx.event.create.mock.calls[0][0];
    expect(JSON.parse(resultWrite.data.payload).metadata.deviceId).toBe('device');
  });
});
