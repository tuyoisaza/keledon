import { IntegrationHealthService } from './integration-health.service';

describe('IntegrationHealthService', () => {
  let service: IntegrationHealthService | undefined;

  beforeEach(() => {
    jest.useFakeTimers();
    service = new IntegrationHealthService();
  });

  afterEach(() => {
    service?.onModuleDestroy();
    service = undefined;
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('leaves provider health and sync unmeasured before a connection check', () => {
    const provider = service?.getProvider('salesforce');

    expect(provider?.status).toBe('disconnected');
    expect(provider?.health).toMatchObject({
      responseTime: 0,
      uptime: 0,
      errorRate: 0,
      totalRequests: 0,
    });
    expect(provider?.health?.lastCheck).toBeUndefined();
    expect(provider?.lastSync).toBeUndefined();
    expect(service?.getConnectionMetrics()[0]?.lastSync).toBeUndefined();
    expect(service?.getConnectionMetrics()[0]?.metrics).toBeUndefined();
  });

  it('starts measuring only after a real provider check runs', async () => {
    await expect(service?.testProviderConnection('salesforce')).resolves.toBe(
      false,
    );

    const health = service?.getProvider('salesforce')?.health;
    expect(health?.lastCheck).toBeInstanceOf(Date);
    expect(health).toMatchObject({
      totalRequests: 1,
      uptime: 0,
      errorRate: 100,
    });
  });
});
