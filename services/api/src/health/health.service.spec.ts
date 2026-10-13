import { HealthService } from './health.service';
import { HealthController } from './health.controller';
import { EndpointDiagnosticsRegistry } from './endpoint-diagnostics.registry';

describe('HealthService diagnostics', () => {
  const prisma = {
    $queryRaw: jest
      .fn()
      .mockResolvedValueOnce([{ '?column?': 1 }])
      .mockResolvedValue([{ migration_name: 'initial' }]),
  };
  const registry = new EndpointDiagnosticsRegistry({
    getControllers: () => [{ metatype: HealthController }],
  } as any);
  const service = new HealthService(
    { getFeatureFlags: () => ({}) } as any,
    prisma as any,
    registry,
  );

  it('publishes endpoint metadata without exposing configured environment values', async () => {
    const previousDatabaseUrl = process.env.DATABASE_URL;
    process.env.DATABASE_URL =
      'postgres://private-user:private-password@db.example/customer';
    try {
      const health = await service.getDeepHealth();
      const serialized = JSON.stringify(health);
      expect(
        health.endpointDiagnostics.map((endpoint) => endpoint.id),
      ).toContain('health.deep');
      expect(serialized).not.toContain('private-user');
      expect(serialized).not.toContain('private-password');
      expect(serialized).not.toContain('db.example');
      expect(health.requiredEnvironment.DATABASE_URL).toBe('set');
      expect(health.meteredProviders.probeCallsMade).toBe(0);
    } finally {
      if (previousDatabaseUrl === undefined) delete process.env.DATABASE_URL;
      else process.env.DATABASE_URL = previousDatabaseUrl;
    }
  });

  it('restricts process-wide metered usage to an actor whose current DB role is superadmin', async () => {
    let role = 'admin';
    const guardedPrisma = {
      $queryRaw: jest.fn().mockResolvedValue([{ migration_name: 'initial' }]),
      user: {
        findUnique: jest.fn().mockImplementation(async () => ({ role })),
      },
    };
    const guardedService = new HealthService(
      { getFeatureFlags: () => ({ realAuth: true }) } as any,
      guardedPrisma as any,
      registry,
    );

    const adminHealth = await guardedService.getDeepHealth('actor-admin');
    expect(adminHealth.meteredUsage).toEqual({ status: 'protected' });
    role = 'superadmin';
    const superadminHealth = await guardedService.getDeepHealth('actor-root');
    expect(superadminHealth.meteredUsage.status).toBe('measured');
    expect(superadminHealth.featureFlags).toEqual({ realAuth: true });
    expect(guardedPrisma.user.findUnique).toHaveBeenNthCalledWith(2, {
      where: { id: 'actor-root' },
      select: { role: true },
    });
  });

  it('reports degraded health when the migration ledger is empty', async () => {
    const unavailableDatabase = {
      $queryRaw: jest
        .fn()
        .mockResolvedValueOnce([{ '?column?': 1 }])
        .mockResolvedValueOnce([]),
    };
    const serviceWithoutMigrations = new HealthService(
      { getFeatureFlags: () => ({}) } as any,
      unavailableDatabase as any,
      registry,
    );
    const health = await serviceWithoutMigrations.getDeepHealth();
    expect(health.database).toEqual({
      status: 'healthy',
      migrations: 'unavailable',
    });
    expect(health.status).toBe('degraded');
  });

  it('returns defensive copies of the registry', () => {
    const first = registry.list();
    first[0].requiredRoles.push('user');
    first[0].expectedStatuses.push(418);
    const deep = registry
      .list()
      .find((endpoint) => endpoint.id === 'health.deep');
    expect(deep.requiredRoles).not.toContain('user');
    expect(deep.expectedStatuses).not.toContain(418);
  });

  it('discovers route path, auth roles, safety mode and public status from route declarations', () => {
    const endpoints = registry.list();
    expect(
      endpoints.find((endpoint) => endpoint.id === 'health.deep'),
    ).toMatchObject({
      method: 'GET',
      path: '/health/deep',
      authRequired: true,
      requiredRoles: ['admin', 'developer', 'superadmin'],
      probeMode: 'safe_read',
    });
    expect(
      endpoints.find((endpoint) => endpoint.id === 'health.basic'),
    ).toMatchObject({
      method: 'GET',
      path: '/health',
      authRequired: false,
      probeMode: 'safe_read',
    });
    expect(
      endpoints.find((endpoint) => endpoint.id === 'health.detailed')
        ?.probeMode,
    ).toBe('manual_only');
  });

  it('runs only the registered safe read and produces bounded evidence', async () => {
    const evidence = await service.runDiagnosticProbe('health.deep');
    expect(evidence).toMatchObject({
      id: 'health.deep',
      status: 'pass',
      method: 'GET',
      path: '/health/deep',
      httpStatus: 200,
    });
    expect(evidence.latencyMs).toBeGreaterThanOrEqual(0);
    expect(evidence.correlationId).toMatch(/^diag_[a-f0-9]{32}$/);
  });

  it('rejects unknown and manual-only probes', async () => {
    await expect(service.runDiagnosticProbe('missing')).rejects.toThrow(
      'Diagnostic probe not found',
    );
    await expect(service.runDiagnosticProbe('health.detailed')).rejects.toThrow(
      'Diagnostic probe is manual only',
    );
    await expect(service.runDiagnosticProbe('health.root')).rejects.toThrow(
      'Diagnostic probe is manual only',
    );
    await expect(service.runDiagnosticProbe('health.probes')).rejects.toThrow(
      'Diagnostic probe is manual only',
    );
  });
});
