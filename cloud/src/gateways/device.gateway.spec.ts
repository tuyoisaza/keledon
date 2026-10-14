import { DeviceGateway } from './device.gateway';
import { PrismaService } from '../prisma/prisma.service';
import { DeviceService } from '../devices/device.service';

describe('DeviceGateway runtime scope', () => {
  const device = {
    id: 'device-a',
    userId: 'user-a',
    keledonId: 'keledon-a',
    status: 'paired',
    authToken: 'token-a',
    user: { id: 'user-a', companyId: 'company-a', teamId: 'team-a' },
  };
  const team = {
    id: 'team-a',
    name: 'Team A',
    brand: {
      id: 'brand-a',
      name: 'Brand A',
      companyId: 'company-a',
      company: { name: 'Company A' },
    },
  };

  function makeGateway(session: {
    userId: string;
    teamId: string;
    status: string;
  }) {
    const prisma = {
      device: {
        findFirst: jest.fn().mockResolvedValue(device),
        findUnique: jest.fn().mockResolvedValue({ authToken: 'token-a' }),
      },
      keledon: {
        findUnique: jest.fn().mockResolvedValue({
          isActive: true,
          userId: 'user-a',
          team,
        }),
      },
      session: { findUnique: jest.fn().mockResolvedValue(session) },
    } as unknown as PrismaService;
    const devices = {
      validateAuthToken: jest.fn().mockResolvedValue({
        valid: true,
        deviceId: 'device-a',
      }),
      updateDeviceStatus: jest.fn().mockResolvedValue(undefined),
    } as unknown as DeviceService;
    const gateway = new DeviceGateway(devices, prisma);
    const client = {
      handshake: { auth: { token: 'token-a', device_id: 'device-a' } },
      data: {} as Record<string, unknown>,
      disconnect: jest.fn(),
      join: jest.fn().mockResolvedValue(undefined),
      leave: jest.fn().mockResolvedValue(undefined),
    };
    return { gateway, client };
  }

  it('rejects a session start from a device without a resolved identity', async () => {
    const { gateway, client } = makeGateway({
      userId: 'user-a',
      teamId: 'team-a',
      status: 'active',
    });

    const result = await gateway.handleSessionStart(client as never, {
      session_id: 'session-a',
      team_id: 'team-a',
    });

    expect(result).toEqual({ error: 'Session is outside paired device scope' });
    expect(client.join).not.toHaveBeenCalled();
  });

  it('allows only an owned session after resolving the paired identity', async () => {
    const { gateway, client } = makeGateway({
      userId: 'user-a',
      teamId: 'team-a',
      status: 'active',
    });
    await gateway.handleConnection(client as never);

    const result = await gateway.handleSessionStart(client as never, {
      session_id: 'session-a',
      team_id: 'team-a',
    });

    expect(result).toEqual({ success: true, session_id: 'session-a' });
    expect(client.join).toHaveBeenCalledWith('session:session-a');
    expect(client.data.sessionId).toBe('session-a');
  });

  it('rejects a session owned by another user even inside the same team', async () => {
    const { gateway, client } = makeGateway({
      userId: 'user-other',
      teamId: 'team-a',
      status: 'active',
    });
    await gateway.handleConnection(client as never);

    const result = await gateway.handleSessionStart(client as never, {
      session_id: 'session-other',
      team_id: 'team-a',
    });

    expect(result).toEqual({ error: 'Session is outside paired device scope' });
    expect(client.join).not.toHaveBeenCalled();
    expect(client.data.sessionId).toBeNull();
  });
});
