import { Injectable } from '@nestjs/common';
import { ConfigService } from '../config/config.service';
import * as os from 'os';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { EndpointDiagnosticsRegistry } from './endpoint-diagnostics.registry';
import { getApiVersion } from '../version';

export type DiagnosticProbeMode =
  'safe_read' | 'validation_only' | 'dry_run' | 'manual_only';

export interface EndpointDiagnostic {
  id: string;
  method: string;
  path: string;
  purpose: string;
  authRequired: boolean;
  requiredRoles: string[];
  probeMode: DiagnosticProbeMode;
  expectedStatuses: number[];
  sanitizedRequestExample: Record<string, unknown> | null;
  sanitizedSuccessExample: Record<string, unknown>;
  sanitizedErrorExamples: Array<Record<string, unknown>>;
}

export interface ProbeEvidence {
  id: string;
  status: 'pass' | 'fail';
  method: string;
  path: string;
  httpStatus: number;
  latencyMs: number;
  correlationId: string;
}

export interface HealthCheck {
  service: string;
  status: 'healthy' | 'unhealthy' | 'degraded';
  message?: string;
  responseTime?: number;
}

export interface SystemHealth {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  uptime: number;
  services: HealthCheck[];
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
}

@Injectable()
export class HealthService {
  private startTime = Date.now();
  private readonly probeHistory: ProbeEvidence[] = [];

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly endpointRegistry: EndpointDiagnosticsRegistry,
  ) {}

  getLivenessHealth() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptimeMs: Math.max(0, Date.now() - this.startTime),
      version: getApiVersion(),
    };
  }

  async getDeepHealth() {
    const packageVersion = getApiVersion();
    let databaseStatus: 'healthy' | 'unavailable' = 'healthy';
    let migrationStatus: 'present' | 'unavailable' = 'present';
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      const migrations = await this.prisma.$queryRaw<
        Array<{ migration_name: string }>
      >`
        SELECT migration_name FROM "_prisma_migrations"
        WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL
        ORDER BY finished_at DESC LIMIT 1
      `;
      if (!migrations.length) migrationStatus = 'unavailable';
    } catch {
      databaseStatus = 'unavailable';
      migrationStatus = 'unavailable';
    }
    return {
      status:
        databaseStatus === 'healthy' && migrationStatus === 'present'
          ? 'healthy'
          : 'degraded',
      timestamp: new Date().toISOString(),
      uptimeMs: Math.max(0, Date.now() - this.startTime),
      environment: process.env.NODE_ENV || 'development',
      version: packageVersion,
      gitSha:
        process.env.GIT_SHA || process.env.SOURCE_VERSION || 'unavailable',
      buildTimestamp: process.env.BUILD_TIMESTAMP || 'unavailable',
      requiredEnvironment: {
        DATABASE_URL: process.env.DATABASE_URL ? 'set' : 'missing',
        KELEDON_AUTH_SECRET: process.env.KELEDON_AUTH_SECRET
          ? 'set'
          : 'missing',
      },
      database: { status: databaseStatus, migrations: migrationStatus },
      meteredProviders: {
        scope: 'process_environment_only',
        deepgram: process.env.DEEPGRAM_API_KEY
          ? 'configured'
          : 'not_configured',
        openai: process.env.OPENAI_API_KEY ? 'configured' : 'not_configured',
        anthropic: process.env.ANTHROPIC_API_KEY
          ? 'configured'
          : 'not_configured',
        probeCallsMade: 0,
        tenantProviderCredentials: 'not_enumerated',
      },
      latestSafeProbes: this.probeHistory.map((probe) => ({ ...probe })),
      endpointDiagnostics: this.endpointRegistry.list(),
    };
  }

  async runDiagnosticProbe(id: string): Promise<ProbeEvidence> {
    const endpoint = this.endpointRegistry
      .list()
      .find((candidate) => candidate.id === id);
    if (!endpoint) throw new Error('Diagnostic probe not found');
    if (endpoint.probeMode === 'manual_only')
      throw new Error('Diagnostic probe is manual only');
    if (
      endpoint.probeMode !== 'safe_read' &&
      endpoint.probeMode !== 'validation_only' &&
      endpoint.probeMode !== 'dry_run'
    ) {
      throw new Error('Diagnostic probe mode is not executable');
    }

    const startedAt = Date.now();
    // Each allowed ID maps to an explicit handler. The liveness probe is local;
    // the deep-health probe reads only the database and safe runtime metadata.
    let passed = false;
    if (id === 'health.deep') {
      const evidence = await this.getDeepHealth();
      passed =
        evidence.status === 'healthy' &&
        evidence.endpointDiagnostics.some((item) => item.id === id);
    } else if (id === 'health.basic') {
      passed = this.getLivenessHealth().status === 'ok';
    }
    const result: ProbeEvidence = {
      id,
      status: passed ? 'pass' : 'fail',
      method: endpoint.method,
      path: endpoint.path,
      httpStatus: passed ? 200 : 503,
      latencyMs: Math.max(0, Date.now() - startedAt),
      correlationId: `diag_${randomUUID().replace(/-/g, '')}`,
    };
    this.probeHistory.push(result);
    if (this.probeHistory.length > 50) this.probeHistory.shift();
    return { ...result };
  }

  async getSystemHealth(): Promise<SystemHealth> {
    const services = await Promise.allSettled([
      this.checkDatabase(),
      this.checkVOSK(),
      this.checkDeepgram(),
      this.checkQdrant(),
      this.checkServices(),
    ]);

    const healthChecks: HealthCheck[] = services.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      }
      return {
        service: ['database', 'vosk', 'deepgram', 'qdrant', 'services'][index],
        status: 'unhealthy',
        message: 'Dependency check failed',
      };
    });

    const allHealthy = healthChecks.every(
      (check) => check.status === 'healthy',
    );
    const someDegraded = healthChecks.some(
      (check) => check.status === 'degraded',
    );

    const memUsage = process.memoryUsage();
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;

    return {
      status: allHealthy ? 'healthy' : someDegraded ? 'degraded' : 'unhealthy',
      timestamp: new Date().toISOString(),
      uptime: Date.now() - this.startTime,
      services: healthChecks,
      memory: {
        used: Math.round(memUsage.heapUsed / 1024 / 1024),
        total: Math.round(totalMemory / 1024 / 1024),
        percentage: Math.round((usedMemory / totalMemory) * 100),
      },
    };
  }

  private async checkDatabase(): Promise<HealthCheck> {
    const startTime = Date.now();
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return {
        service: 'database',
        status: 'healthy',
        message: 'Prisma PostgreSQL',
        responseTime: Date.now() - startTime,
      };
    } catch {
      return {
        service: 'database',
        status: 'unhealthy',
        message: 'Database is unavailable',
        responseTime: Date.now() - startTime,
      };
    }
  }

  private async checkVOSK(): Promise<HealthCheck> {
    const startTime = Date.now();
    const sttConfig = this.configService.getSttConfig();
    const voskUrl = `http://127.0.0.1:${sttConfig.voskPort}/health`;

    try {
      const response = await fetch(voskUrl, {
        signal: AbortSignal.timeout(3000),
      });
      if (response.ok) {
        return {
          service: 'vosk',
          status: 'healthy',
          message: `VOSK server on port ${sttConfig.voskPort}`,
          responseTime: Date.now() - startTime,
        };
      }
      return {
        service: 'vosk',
        status: 'unhealthy',
        message: `VOSK returned ${response.status}`,
        responseTime: Date.now() - startTime,
      };
    } catch {
      return {
        service: 'vosk',
        status: 'degraded',
        message: 'VOSK server not reachable - starting',
        responseTime: Date.now() - startTime,
      };
    }
  }

  private async checkDeepgram(): Promise<HealthCheck> {
    const startTime = Date.now();
    const sttConfig = this.configService.getSttConfig();

    if (!sttConfig.deepgramApiKey) {
      return {
        service: 'deepgram',
        status: 'degraded',
        message: 'Deepgram API key not configured',
        responseTime: Date.now() - startTime,
      };
    }

    return {
      service: 'deepgram',
      status: 'healthy',
      message: `Deepgram STT available (model: ${sttConfig.deepgramModel || 'nova-2'})`,
      responseTime: Date.now() - startTime,
    };
  }

  private async checkQdrant(): Promise<HealthCheck> {
    const startTime = Date.now();
    const vsConfig = this.configService.getVectorStoreConfig();

    try {
      const headers: Record<string, string> = {};
      const apiKey = this.configService.getVectorStoreConfig().qdrantApiKey;
      if (apiKey) {
        headers['api-key'] = apiKey;
      }
      const response = await fetch(`${vsConfig.qdrantUrl}/collections`, {
        signal: AbortSignal.timeout(3000),
        headers,
      });
      if (response.ok) {
        return {
          service: 'qdrant',
          status: 'healthy',
          message: 'Qdrant responded successfully',
          responseTime: Date.now() - startTime,
        };
      }
      return {
        service: 'qdrant',
        status: 'unhealthy',
        message: `Qdrant returned ${response.status}`,
        responseTime: Date.now() - startTime,
      };
    } catch {
      return {
        service: 'qdrant',
        status: 'unhealthy',
        message: 'Qdrant not reachable',
        responseTime: Date.now() - startTime,
      };
    }
  }

  private async checkServices(): Promise<HealthCheck> {
    const startTime = Date.now();
    const flags = this.configService.getFeatureFlags();

    const availableServices: string[] = [];
    if (flags.vectorStore) availableServices.push('RAG');
    if (flags.realStt) availableServices.push('STT');
    if (flags.realTts) availableServices.push('TTS');
    if (flags.rpa) availableServices.push('RPA');
    if (flags.otel) availableServices.push('OTEL');

    return {
      service: 'services',
      status: 'healthy',
      message: `Available: ${availableServices.join(', ')}`,
      responseTime: Date.now() - startTime,
    };
  }
}
