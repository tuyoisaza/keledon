import type { Socket } from 'socket.io';
import { LocalAuthService } from '../auth-local/auth-local.service';
import { DashboardGateway } from './dashboard.gateway';

describe('DashboardGateway access boundary', () => {
  const makeGateway = (prisma: { user: { findUnique: jest.Mock } }) =>
    new DashboardGateway(
      { getAllAgentStatuses: jest.fn(), getCurrentHealth: jest.fn() } as never,
      { getAllLoops: jest.fn() } as never,
      { getAnalytics: jest.fn() } as never,
      { getProviders: jest.fn(), getConnectionMetrics: jest.fn() } as never,
      { getExecutions: jest.fn() } as never,
      prisma as never,
    );

  const makeSocket = (token?: string) => {
    const socket = {
      id: 'test-socket',
      handshake: { auth: token ? { token } : {} },
      data: {},
      emit: jest.fn(),
      disconnect: jest.fn(),
    };
    return socket as unknown as Socket & typeof socket;
  };

  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('rejects sockets without a session token', async () => {
    const gateway = makeGateway({ user: { findUnique: jest.fn() } });
    const socket = makeSocket();

    await gateway.handleConnection(socket);

    expect(socket.emit).toHaveBeenCalledWith('error', {
      message: 'Dashboard authentication required',
    });
    expect(socket.disconnect).toHaveBeenCalledWith(true);
  });

  it('rejects a token whose database actor is not a superadmin', async () => {
    jest
      .spyOn(LocalAuthService.prototype, 'validateToken')
      .mockResolvedValue({ id: 'tenant-admin' } as never);
    const prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'tenant-admin',
          role: 'admin',
        }),
      },
    };
    const gateway = makeGateway(prisma);
    const socket = makeSocket('valid-session-token');

    await gateway.handleConnection(socket);

    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: 'tenant-admin' },
      select: { id: true, role: true },
    });
    expect(socket.emit).toHaveBeenCalledWith('error', {
      message: 'Superadmin dashboard access required',
    });
    expect(socket.disconnect).toHaveBeenCalledWith(true);
  });
});
