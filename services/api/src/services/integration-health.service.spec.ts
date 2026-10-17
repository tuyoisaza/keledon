import { IntegrationHealthService } from './integration-health.service';

describe('IntegrationHealthService', () => {
  it('leaves provider health and sync unmeasured before a connection check', () => {
    const service = new IntegrationHealthService();
    const provider = service.getProvider('salesforce');

    expect(provider?.status).toBe('disconnected');
    expect(provider?.health).toMatchObject({
      responseTime: 0,
      uptime: 0,
      errorRate: 0,
      totalRequests: 0,
    });
    expect(provider?.health?.lastCheck).toBeUndefined();
    expect(provider?.lastSync).toBeUndefined();
    expect(service.getConnectionMetrics()[0]?.lastSync).toBeUndefined();
    expect(service.getConnectionMetrics()[0]?.metrics).toBeUndefined();
  });

  it('does not report success until a tenant provider adapter exists', async () => {
    const service = new IntegrationHealthService();

    await expect(
      service.connectProvider('salesforce', { apiKey: 'synthetic-test-key' }),
    ).resolves.toBe(false);
    await expect(service.testProviderConnection('salesforce')).resolves.toBe(
      false,
    );
    await expect(service.syncProvider('salesforce')).resolves.toBe(false);

    expect(service.getProvider('salesforce')?.status).toBe('error');
    expect(service.getProvider('salesforce')?.lastSync).toBeUndefined();
  });
});
