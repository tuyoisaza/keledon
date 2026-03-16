import { Injectable } from '@nestjs/common';
import * as os from 'os';

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

  async getSystemHealth(): Promise<SystemHealth> {
    const services = await Promise.allSettled([
      this.checkDatabase(),
      this.checkSupabase(),
      this.checkServices(),
    ]);

    const healthChecks: HealthCheck[] = services.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      }
      return {
        service: ['database', 'supabase', 'services'][index],
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
        used: Math.round(memUsage.heapUsed / 1024 / 1024), // MB
        total: Math.round(totalMemory / 1024 / 1024), // MB
        percentage: Math.round((usedMemory / totalMemory) * 100),
      },
    };
  }

  private async checkDatabase(): Promise<HealthCheck> {
    const startTime = Date.now();
    try {
      // For now, check if we can access basic Node.js modules
      // Later we'll add actual database connection
      await Promise.resolve();
      
      return {
        service: 'database',
        status: 'healthy',
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

  private async checkSupabase(): Promise<HealthCheck> {
    const startTime = Date.now();
    try {
      // We'll implement Supabase connection check in Phase 2
      await Promise.resolve();
      
      return {
        service: 'supabase',
        status: 'healthy',
        message: 'Not configured yet - Phase 2',
        responseTime: Date.now() - startTime,
      };
    } catch (error) {
      return {
        service: 'supabase',
        status: 'unhealthy',
        message: error.message,
        responseTime: Date.now() - startTime,
      };
    }
  }

  private async checkServices(): Promise<HealthCheck> {
    const startTime = Date.now();
    try {
      // Check if all service modules are available
      const services = ['TTS', 'STT', 'RAG', 'RPA'];
      const availableServices = services.filter(service => {
        // We'll implement actual service checks in later phases
        return true; // For now, assume all are planned
      });
      
      const allAvailable = availableServices.length === services.length;
      
      return {
        service: 'services',
        status: allAvailable ? 'healthy' : 'degraded',
        message: `Available: ${availableServices.join(', ')}`,
        responseTime: Date.now() - startTime,
      };
    } catch (error) {
      return {
        service: 'services',
        status: 'unhealthy',
        message: error.message,
        responseTime: Date.now() - startTime,
      };
    }
  }

  getBasicHealth() {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: Date.now() - this.startTime,
      version: '0.0.6',
      environment: process.env.NODE_ENV || 'development',
    };
  }
}