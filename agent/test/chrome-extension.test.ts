import { io } from 'socket.io-client';
import { CloudConnection } from '../src/connection/CloudConnection';

jest.mock('socket.io-client', () => ({ io: jest.fn() }));

describe('Agent CloudConnection', () => {
  const ioMock = io as unknown as jest.Mock;
  let handlers: Record<string, (...args: any[]) => void>;
  let socket: any;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    handlers = {};
    socket = {
      connected: false,
      on: jest.fn((event: string, handler: (...args: any[]) => void) => {
        handlers[event] = handler;
        return socket;
      }),
      emit: jest.fn(),
      off: jest.fn(),
      removeAllListeners: jest.fn(),
      disconnect: jest.fn(() => handlers.disconnect?.()),
    };
    ioMock.mockReturnValue(socket);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('connects to the Agent namespace and creates a session', async () => {
    const connection = new CloudConnection('https://cloud.example', 'agent-1');
    const connected = connection.connect();

    expect(ioMock).toHaveBeenCalledWith('https://cloud.example/agent', {
      transports: ['websocket'],
      timeout: 10000,
    });
    socket.connected = true;
    handlers.connect();
    await expect(connected).resolves.toBeUndefined();

    expect(connection.getSession()).toMatchObject({ agent_id: 'agent-1', status: 'connected' });
    expect(socket.emit).toHaveBeenCalledWith(
      'session.create',
      expect.objectContaining({ agent_id: 'agent-1' }),
    );
    expect(jest.getTimerCount()).toBe(0);
  });

  it('sends speech input through the active session and forwards commands', async () => {
    const onCommand = jest.fn();
    const connection = new CloudConnection('https://cloud.example', 'agent-2', onCommand);
    const connected = connection.connect();
    socket.connected = true;
    handlers.connect();
    await connected;
    handlers['session.created']({ session_id: 'session-42' });

    connection.sendTextInput('open the case', 0.91, { companyId: 'tenant-7' });
    handlers.command({ type: 'say', text: 'Ready' });

    expect(socket.emit).toHaveBeenCalledWith(
      'brain_event',
      expect.objectContaining({
        session_id: 'session-42',
        event_type: 'text_input',
        payload: expect.objectContaining({
          text: 'open the case',
          confidence: 0.91,
          metadata: { companyId: 'tenant-7' },
        }),
      }),
    );
    expect(onCommand).toHaveBeenCalledWith({ type: 'say', text: 'Ready' });
  });

  it('rejects a connection timeout and clears its timer on disconnect', async () => {
    const connection = new CloudConnection('https://cloud.example', 'agent-3');
    const connecting = connection.connect();
    const timeout = expect(connecting).rejects.toThrow('Connection timeout');

    await jest.advanceTimersByTimeAsync(10000);
    await timeout;
    expect(jest.getTimerCount()).toBe(0);

    await connection.disconnect();
    expect(connection.getSession()).toBeNull();
    expect(socket.disconnect).toHaveBeenCalledTimes(1);
  });
});
