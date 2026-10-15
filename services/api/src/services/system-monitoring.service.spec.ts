import { SystemMonitoringService } from './system-monitoring.service';

describe('SystemMonitoringService', () => {
  it('reports only the current Node process and honors a requested PID', () => {
    const service = new SystemMonitoringService();

    expect(service.getProcessMetrics(process.pid)).toHaveLength(1);
    expect(service.getProcessMetrics(process.pid)[0]?.pid).toBe(process.pid);
    expect(service.getProcessMetrics(-1)).toEqual([]);
    expect(service.getProcessMetrics().map(({ pid }) => pid)).toEqual([
      process.pid,
    ]);
  });
});
