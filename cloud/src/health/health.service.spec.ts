import { HealthService } from './health.service';
import type { ConfigService } from '../config/config.service';
import type { PrismaService } from '../prisma/prisma.service';

describe('HealthService database health', () => {
  const originalFetch = global.fetch;
  const config = {
    getSttConfig: () => ({ voskPort: 2700 }),
    getVectorStoreConfig: () => ({ qdrantUrl: 'http://qdrant.test' }),
    getFeatureFlags: () => ({
      vectorStore: false,
      realStt: false,
      realTts: false,
      rpa: false,
      otel: false,
    }),
  } as unknown as ConfigService;

  beforeEach(() => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200 });
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('reports the database healthy only after a successful Prisma query', async () => {
    const queryRaw = jest.fn().mockResolvedValue([{ ready: 1 }]);
    const prisma = {
      $queryRaw: queryRaw,
    } as unknown as PrismaService;
    const health = await new HealthService(config, prisma).getSystemHealth();

    expect(queryRaw).toHaveBeenCalledTimes(1);
    expect(
      health.services.find((service) => service.service === 'database'),
    ).toMatchObject({ status: 'healthy', message: 'Prisma PostgreSQL' });
  });

  it('reports a generic unhealthy state when the database query fails', async () => {
    const queryRaw = jest
      .fn()
      .mockRejectedValue(new Error('sensitive query detail'));
    const prisma = {
      $queryRaw: queryRaw,
    } as unknown as PrismaService;
    const health = await new HealthService(config, prisma).getSystemHealth();

    expect(
      health.services.find((service) => service.service === 'database'),
    ).toMatchObject({ status: 'unhealthy', message: 'Database unavailable' });
  });
});
