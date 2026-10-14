import { AgentGateway } from './agent.gateway';
import { PrismaService } from '../prisma/prisma.service';
import { DecisionEngineService } from '../services/decision-engine.service';
import { SessionService } from '../services/session.service';

describe('AgentGateway runtime scope', () => {
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
    const sessionCreate = jest.fn().mockResolvedValue({
      id: 'session-a',
      status: 'active',
      created_at: new Date(0),
    });
    const getSession = jest.fn();
    const persistEvent = jest.fn();
    const sessionService = {
      create: sessionCreate,
      getSession,
      persistEvent,
    } as unknown as SessionService;
    const gateway = new AgentGateway(
      sessionService,
      {} as DecisionEngineService,
      prisma,
    );
    const client = {
      id: 'socket-a',
      handshake: { auth: { token: 'token-a' } as Record<string, unknown> },
      data: {} as Record<string, unknown>,
      disconnect: jest.fn(),
      emit: jest.fn(),
      join: jest.fn().mockResolvedValue(undefined),
      leave: jest.fn().mockResolvedValue(undefined),
    };
    return { gateway, client, sessionCreate, getSession, persistEvent };
  }

  it('rejects connections without a database-resolved paired identity', async () => {
    const { gateway, client } = makeGateway({
      userId: 'user-a',
      teamId: 'team-a',
      status: 'active',
    });
    client.handshake.auth = {};

    await gateway.handleConnection(client as never);

    expect(client.disconnect).toHaveBeenCalled();
    expect(client.emit).not.toHaveBeenCalledWith(
      'connected',
      expect.anything(),
    );
  });

  it('creates sessions with the stored device user and team, ignoring caller agent IDs', async () => {
    const { gateway, client, sessionCreate } = makeGateway({
      userId: 'user-a',
      teamId: 'team-a',
      status: 'active',
    });
    await gateway.handleConnection(client as never);

    await gateway.handleSessionCreate(client as never, {
      agent_id: 'forged-device',
      tab_url: 'https://crm.customer.test',
    });

    expect(sessionCreate).toHaveBeenCalledWith('device-a', {
      userId: 'user-a',
      teamId: 'team-a',
      tab_url: 'https://crm.customer.test',
      tab_title: undefined,
    });
    expect(client.join).toHaveBeenCalledWith('session:session-a');
    expect(client.emit).toHaveBeenCalledWith(
      'session.created',
      expect.objectContaining({ agent_id: 'device-a' }),
    );
  });

  it('rejects events for a session owned by another user in the same team', async () => {
    const { gateway, client, getSession, persistEvent } = makeGateway({
      userId: 'user-other',
      teamId: 'team-a',
      status: 'active',
    });
    await gateway.handleConnection(client as never);

    await gateway.handleBrainEvent(client as never, {
      session_id: 'session-other',
      event_type: 'text_input',
      payload: { text: 'sensitive text' },
      ts: new Date(0).toISOString(),
      agent_id: 'device-a',
    });

    expect(client.emit).toHaveBeenCalledWith('error', {
      message: 'Invalid session scope',
    });
    expect(client.join).not.toHaveBeenCalled();
    expect(getSession).not.toHaveBeenCalled();
    expect(persistEvent).not.toHaveBeenCalled();
  });

  it('emits session commands only to the authorized session room', () => {
    const { gateway } = makeGateway({
      userId: 'user-a',
      teamId: 'team-a',
      status: 'active',
    });
    const emit = jest.fn();
    const to = jest.fn().mockReturnValue({ emit });
    gateway.server = { to } as never;

    gateway.sendCommand('session-a', {
      type: 'say',
      metadata: {},
      say: { text: 'Hello', interruptible: true },
      confidence: 1,
      mode: 'normal',
      flow_id: null,
      flow_run_id: null,
    });

    expect(to).toHaveBeenCalledWith('session:session-a');
    expect(emit).toHaveBeenCalledWith(
      'command.session-a',
      expect.objectContaining({ type: 'say' }),
    );
  });
});
