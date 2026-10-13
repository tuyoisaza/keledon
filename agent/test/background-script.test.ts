import { BackgroundRuntimeMethods } from '../extension/background/background-runtime.methods';

describe('Background runtime configuration', () => {
  const methods = new BackgroundRuntimeMethods();
  let storageGet: jest.Mock;
  let storageSet: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.KELEDON_CLOUD_BASE_URL;
    storageGet = jest.fn().mockResolvedValue({});
    storageSet = jest.fn().mockResolvedValue(undefined);
    (global as any).chrome = {
      storage: { local: { get: storageGet, set: storageSet } },
    };
  });

  it('normalizes configured endpoints to their HTTP(S) origin', () => {
    const context = { runtimeTier: 'DEV_LOCAL', isLoopbackOrigin: methods.isLoopbackOrigin };

    expect(methods.normalizeCloudUrl.call(context, ' https://cloud.example/api/v1 ')).toBe(
      'https://cloud.example',
    );
    expect(methods.normalizeCloudUrl.call(context, 'file:///etc/passwd')).toBeNull();
    expect(methods.normalizeCloudUrl.call(context, 'not a URL')).toBeNull();
  });

  it('rejects loopback cloud endpoints in the managed runtime tier', () => {
    const context = { runtimeTier: 'PRODUCTION_MANAGED', isLoopbackOrigin: methods.isLoopbackOrigin };

    expect(methods.normalizeCloudUrl.call(context, 'http://localhost:3001')).toBeNull();
    expect(methods.normalizeCloudUrl.call(context, 'https://127.0.0.1:3001')).toBeNull();
    expect(methods.normalizeCloudUrl.call(context, 'https://cloud.example')).toBe(
      'https://cloud.example',
    );
  });

  it('loads a customer-provided local endpoint from extension storage in development', async () => {
    storageGet.mockResolvedValue({ KELEDON_BACKEND_URL: 'http://localhost:4100/api' });
    const context = {
      runtimeTier: 'DEV_LOCAL',
      cloudUrlStorageKey: 'KELEDON_BACKEND_URL',
      legacyCloudUrlStorageKey: 'keledon.cloud_url',
      cloudUrl: '',
      normalizeCloudUrl: methods.normalizeCloudUrl,
      isLoopbackOrigin: methods.isLoopbackOrigin,
    };

    await methods.loadCloudRuntimeConfig.call(context);

    expect(context.cloudUrl).toBe('http://localhost:4100');
    expect(storageGet).toHaveBeenCalledWith([
      'KELEDON_BACKEND_URL',
      'keledon.cloud_url',
    ]);
  });

  it('stores an explicitly updated endpoint and reconnects the runtime', async () => {
    const connectCloudRuntime = jest.fn();
    const context = {
      runtimeTier: 'DEV_LOCAL',
      cloudUrl: 'http://localhost:3001',
      cloudUrlStorageKey: 'KELEDON_BACKEND_URL',
      legacyCloudUrlStorageKey: 'keledon.cloud_url',
      normalizeCloudUrl: methods.normalizeCloudUrl,
      connectCloudRuntime,
    };

    await expect(
      methods.updateCloudRuntimeUrl.call(context, 'https://crm-cloud.example/v2', 'test'),
    ).resolves.toEqual({ cloudUrl: 'https://crm-cloud.example', reconnected: true });
    expect(storageSet).toHaveBeenCalledWith({
      KELEDON_BACKEND_URL: 'https://crm-cloud.example',
      'keledon.cloud_url': 'https://crm-cloud.example',
    });
    expect(connectCloudRuntime).toHaveBeenCalledTimes(1);
  });
});
