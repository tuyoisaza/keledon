import { DefaultEventsMap, Server } from 'socket.io';
import { LocalAuthService } from '../auth-local/auth-local.service';
import { PrismaService } from '../prisma/prisma.service';
import { TTSService } from '../tts/tts.service';
import { VoiceGateway, VoiceSocket } from './voice.gateway';

describe('VoiceGateway actor and room boundaries', () => {
  const actorRecord = {
    id: 'user-a',
    team_id: 'team-db',
    company_id: 'company-db',
  };
  const validateToken = jest.fn();
  const findTeam = jest.fn();
  const findSession = jest.fn();
  const findDevice = jest.fn();
  const prisma = {
    team: { findUnique: findTeam },
    session: { findUnique: findSession },
    device: { findFirst: findDevice },
  } as unknown as PrismaService;
  const auth = { validateToken } as unknown as LocalAuthService;
  const tts = { speak: jest.fn() } as unknown as TTSService;
  const gateway = new VoiceGateway(tts, prisma, auth);
  const teamEmit = jest.fn();
  const teamRoom = { emit: teamEmit };
  const teamNamespace = { to: jest.fn(() => teamRoom) };
  const voiceEmit = jest.fn();
  const voiceRoom = { emit: voiceEmit };
  const serverTo = jest.fn(() => voiceRoom);
  const serverEmit = jest.fn();
  const server = {
    of: jest.fn(() => teamNamespace),
    to: serverTo,
    emit: serverEmit,
  } as unknown as Server<
    DefaultEventsMap,
    DefaultEventsMap,
    DefaultEventsMap,
    object
  >;

  function makeSocket(authData: Record<string, unknown>) {
    const disconnect = jest.fn();
    const join = jest.fn();
    const socket = {
      id: 'socket-a',
      handshake: { auth: authData },
      data: {} as Record<string, unknown>,
      disconnect,
      emit: jest.fn(),
      join,
      leave: jest.fn(),
    };
    return { client: socket as unknown as VoiceSocket, disconnect, join };
  }

  beforeEach(() => {
    validateToken.mockReset().mockResolvedValue(actorRecord);
    findTeam.mockReset().mockResolvedValue({
      id: 'team-db',
      name: 'Team',
      brand: {
        id: 'brand-db',
        name: 'Brand',
        companyId: 'company-db',
        company: { name: 'Company' },
      },
    });
    findSession.mockReset().mockResolvedValue(null);
    findDevice.mockReset().mockResolvedValue(null);
    teamEmit.mockReset();
    voiceEmit.mockReset();
    serverTo.mockClear();
    serverEmit.mockClear();
    teamNamespace.to.mockClear();
    server.of = jest.fn(() => teamNamespace) as unknown as typeof server.of;
    gateway.server = server;
  });

  it('rejects actors without a DB-assigned team', async () => {
    validateToken.mockResolvedValueOnce({ ...actorRecord, team_id: null });
    const { client: socket, disconnect } = makeSocket({
      token: 'valid-token',
      team_id: 'forged-team',
    });

    await gateway.handleConnection(socket);

    expect(disconnect).toHaveBeenCalled();
    expect(teamNamespace.to).not.toHaveBeenCalled();
  });

  it('derives team from the user record and emits transcripts only to its room', async () => {
    const { client: socket } = makeSocket({
      token: 'valid-token',
      device_id: 'brain_user-a',
    });
    await gateway.handleConnection(socket);
    const started = await gateway.handleCallStart(socket, {
      session_id: 'brain_123',
    });
    expect(started).toEqual({ success: true, session_id: 'brain_123' });

    await gateway.handleTranscript(socket, { text: 'hello', is_final: true });

    expect(teamNamespace.to).toHaveBeenCalledWith('team:team-db');
    expect(serverTo).toHaveBeenCalledWith(expect.stringMatching(/^voice:/));
    expect(voiceEmit).toHaveBeenCalledWith(
      'transcript',
      expect.objectContaining({ text: 'hello', is_final: true }),
    );
    expect(serverEmit).not.toHaveBeenCalled();
  });

  it('denies a persisted session belonging to another user or team', async () => {
    const { client: socket, join } = makeSocket({ token: 'valid-token' });
    await gateway.handleConnection(socket);
    findSession
      .mockResolvedValueOnce({ id: 'session-other' })
      .mockResolvedValueOnce({
        userId: 'user-b',
        teamId: 'team-other',
        status: 'active',
      });

    await expect(
      gateway.handleCallStart(socket, { session_id: 'session-other' }),
    ).resolves.toEqual({ error: 'Session is outside actor scope' });
    expect(join).not.toHaveBeenCalled();
  });

  it('stops accepting events when the persisted local actor is revoked', async () => {
    const { client: socket } = makeSocket({ token: 'valid-token' });
    await gateway.handleConnection(socket);
    validateToken.mockResolvedValueOnce(null);

    await expect(
      gateway.handleTranscript(socket, { text: 'hello', is_final: true }),
    ).resolves.toEqual({ error: 'Invalid transcript or voice session' });
    expect(serverTo).not.toHaveBeenCalled();
  });
});
