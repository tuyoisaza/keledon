import type { Socket } from 'socket.io';
import { AgentMonitoringService } from './agent-monitoring.service';

describe('AgentMonitoringService health reporting', () => {
  let service: AgentMonitoringService;

  beforeEach(() => {
    jest.useFakeTimers();
    service = new AgentMonitoringService({
      getCurrentMetrics: jest.fn(),
    } as never);
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('does not report dependency health without dependency probes', () => {
    expect(service.getCurrentHealth()).toEqual({
      overall: 'unknown',
      websocket: 'disconnected',
      tts: 'unknown',
      stt: 'unknown',
      ai: 'unknown',
    });
  });

  it('reports socket connectivity separately from dependency health', () => {
    const socket = {
      id: 'test-dashboard-socket',
      emit: jest.fn(),
    } as unknown as Socket;

    service.registerSocket(socket);

    expect(service.getCurrentHealth()).toEqual({
      overall: 'unknown',
      websocket: 'connected',
      tts: 'unknown',
      stt: 'unknown',
      ai: 'unknown',
    });
  });
});
