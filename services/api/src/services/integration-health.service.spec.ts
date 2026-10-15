import { IntegrationHealthService } from './integration-health.service';

describe('IntegrationHealthService', () => {
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
