import { Injectable } from '@nestjs/common';
import { errorBuffer } from './crud.helpers';

@Injectable()
export class CrudHealthService {
  getHealth() {
    const memUsage = process.memoryUsage();
    return {
      status: 'ok',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      errors: errorBuffer.slice(-50),
      memory: {
        heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024) + 'MB',
        heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024) + 'MB',
        rss: Math.round(memUsage.rss / 1024 / 1024) + 'MB',
        external: Math.round(memUsage.external / 1024 / 1024) + 'MB',
      },
      env: {
        NODE_ENV: process.env.NODE_ENV || 'development',
        CLOUD_URL: process.env.CLOUD_URL || 'https://keledon.tuyoisaza.com',
        KELEDON_LAUNCH_SECRET: process.env.KELEDON_LAUNCH_SECRET
          ? 'set'
          : 'not set',
      },
      versions: {
        cloud: process.env.npm_package_version || '0.0.92',
      },
    };
  }
}
