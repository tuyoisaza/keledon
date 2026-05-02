import { Injectable } from '@nestjs/common';
import { ConfigService } from '../config/config.service';
import * as os from 'os';

const errorBuffer: string[] = [];
const MAX_ERRORS = 100;

function captureError(msg: string) {
  const entry = `${new Date().toISOString()} | ${msg}`;
  errorBuffer.push(entry);
  if (errorBuffer.length > MAX_ERRORS) {
    errorBuffer.shift();
  }
}

const originalConsoleError = console.error;
console.error = (...args: any[]): void => {
  const msg = args.map((a: any) => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ');
  captureError(msg);
  originalConsoleError.apply(console, args);
};

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

  constructor(private readonly configService: ConfigService) {}

  async getSystemHealth(): Promise<SystemHealth> {
    const services = await Promise.allSettled([
      this.checkDatabase(),
      this.checkVOSK(),
      this.checkQdrant(),
      this.checkServices(),
    ]);

    const healthChecks: HealthCheck[] = services.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      }
      return {
        service: ['database', 'vosk', 'qdrant', 'services'][index],
        status: 'unhealthy',
        message: result.reason,
      };
    });

    const allHealthy = healthChecks.every(check => check.status === 'healthy');
    const someDegraded = healthChecks.some(check => check.status === 'degraded');

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
      return {
        service: 'database',
        status: 'healthy',
        message: 'Prisma PostgreSQL',
        responseTime: Date.now() - startTime,
      };
    } catch (error) {
      return {
        service: 'database',
        status: 'unhealthy',
        message: error.message,
        responseTime: Date.now() - startTime,
      };
    }
  }

  private async checkVOSK(): Promise<HealthCheck> {
    const startTime = Date.now();
    const sttConfig = this.configService.getSttConfig();
    const voskUrl = `http://127.0.0.1:${sttConfig.voskPort}/health`;

    try {
      const response = await fetch(voskUrl, { signal: AbortSignal.timeout(3000) });
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
    } catch (error) {
      return {
        service: 'vosk',
        status: 'degraded',
        message: 'VOSK server not reachable - starting',
        responseTime: Date.now() - startTime,
      };
    }
  }

  private async checkQdrant(): Promise<HealthCheck> {
    const startTime = Date.now();
    const vsConfig = this.configService.getVectorStoreConfig();

    try {
      const response = await fetch(`${vsConfig.qdrantUrl}/collections`, { signal: AbortSignal.timeout(3000) });
      if (response.ok) {
        return {
          service: 'qdrant',
          status: 'healthy',
          message: vsConfig.qdrantUrl,
          responseTime: Date.now() - startTime,
        };
      }
      return {
        service: 'qdrant',
        status: 'unhealthy',
        message: `Qdrant returned ${response.status}`,
        responseTime: Date.now() - startTime,
      };
    } catch (error) {
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

  async checkBrowserDownloadUrl(): Promise<{ url: string; reachable: boolean }> {
    const url = process.env.KELEDON_BROWSER_DOWNLOAD_URL ||
      'https://github.com/tuyoisaza/keledon/releases/download/v0.2.0/KELEDON.Browser.Setup.0.2.0.exe';
    try {
      const response = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(5000) });
      return { url, reachable: response.ok || response.status === 302 || response.status === 301 };
    } catch {
      return { url, reachable: false };
    }
  }

  async getBasicHealth() {
    const memUsage = process.memoryUsage();
    const flags = this.configService.getFeatureFlags();
    const sttConfig = this.configService.getSttConfig();
    const vsConfig = this.configService.getVectorStoreConfig();
    const ttsConfig = this.configService.getTtsConfig();
    const browserDownload = await this.checkBrowserDownloadUrl();

    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: Date.now() - this.startTime,
      versions: {
        cloud: process.env.npm_package_version || '0.1.0',
        protocol: 'V3'
      },
      environment: {
        NODE_ENV: process.env.NODE_ENV || 'development',
        CLOUD_URL: process.env.CLOUD_URL || 'https://keledon.tuyoisaza.com',
        KELEDON_LAUNCH_SECRET: process.env.KELEDON_LAUNCH_SECRET ? 'set' : 'not set',
        RAILWAY_SERVICE_NAME: process.env.RAILWAY_SERVICE_NAME || 'local',
      },
      services: {
        rag: { enabled: flags.vectorStore, status: flags.vectorStore ? 'active' : 'disabled' },
        stt: {
          provider: sttConfig.provider,
          status: flags.realStt ? 'active' : 'web-speech',
          voskPort: sttConfig.voskPort
        },
        tts: {
          provider: ttsConfig?.provider || 'web-speech',
          status: flags.realTts ? 'active' : 'web-speech'
        },
        rpa: { enabled: flags.rpa, status: flags.rpa ? 'active' : 'disabled' },
        otel: { enabled: flags.otel, status: flags.otel ? 'active' : 'disabled' }
      },
      vectorStore: {
        provider: 'qdrant',
        url: vsConfig?.qdrantUrl || 'http://localhost:6333',
        enabled: flags.vectorStore
      },
      capabilities: {
        voice: flags.realStt || true,
        escalation: true,
        tabs: true,
        vendorAutoLogin: true
      },
      memory: {
        heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024) + 'MB',
        heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024) + 'MB',
        rss: Math.round(memUsage.rss / 1024 / 1024) + 'MB',
        external: Math.round(memUsage.external / 1024 / 1024) + 'MB'
      },
      browser_download_url: browserDownload.url,
      browser_download_reachable: browserDownload.reachable,
      logs: errorBuffer.slice(-MAX_ERRORS)
    };
  }
}
