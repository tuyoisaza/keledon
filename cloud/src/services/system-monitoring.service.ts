import { Injectable } from '@nestjs/common';
import * as os from 'os';
import * as process from 'process';
import { randomUUID } from 'crypto';

export interface SystemMetrics {
  cpu: {
    usage: number;
    cores: number;
    model: string;
  };
  memory: {
    total: number;
    used: number;
    free: number;
    usage: number;
  };
  network: {
    bytesReceived: number;
    bytesSent: number;
    packetsReceived: number;
    packetsSent: number;
  };
  disk: {
    total: number;
    used: number;
    free: number;
    usage: number;
  };
  uptime: number;
  loadAverage: number[];
  timestamp: Date;
}

export interface ProcessMetrics {
  pid: number;
  name: string;
  cpu: number;
  memory: number;
  uptime: number;
  status: 'running' | 'sleeping' | 'zombie';
}

@Injectable()
export class SystemMonitoringService {
  private metricsHistory: SystemMetrics[] = [];
  private maxHistorySize = 1000;
  private lastNetworkStats = { bytesReceived: 0, bytesSent: 0 };

  constructor() {
    console.log('SystemMonitoringService: Initialized');
    this.initializeBaselineMetrics();
  }

  // Get current system metrics
  getCurrentMetrics(): SystemMetrics {
    const cpuInfo = this.getCpuMetrics();
    const memoryInfo = this.getMemoryMetrics();
    const networkInfo = this.getNetworkMetrics();
    const diskInfo = this.getDiskMetrics();

    const metrics: SystemMetrics = {
      cpu: cpuInfo,
      memory: memoryInfo,
      network: networkInfo,
      disk: diskInfo,
      uptime: os.uptime(),
      loadAverage: os.loadavg(),
      timestamp: new Date()
    };

    // Store in history
    this.addToHistory(metrics);
    
    return metrics;
  }

  // Get metrics history
  getMetricsHistory(durationMinutes: number = 60): SystemMetrics[] {
    const cutoffTime = new Date(Date.now() - durationMinutes * 60 * 1000);
    return this.metricsHistory.filter(metric => metric.timestamp >= cutoffTime);
  }

  // Get process-specific metrics
  getProcessMetrics(pid?: number): ProcessMetrics[] {
    // In a real implementation, this would use system APIs like psutil
    // For now, return mock process data based on current Node.js process
    const currentProcess = {
      pid: process.pid,
      name: 'keledon-backend',
      cpu: this.getCurrentProcessCpuUsage(),
      memory: this.getCurrentProcessMemoryUsage(),
      uptime: process.uptime(),
      status: 'running' as const
    };

    const processes: ProcessMetrics[] = [currentProcess];

    // Add some common system processes (mock data for demonstration)
    const commonProcesses = [
      { name: 'chrome', cpu: 0, memory: 0 },
      { name: 'node', cpu: 0, memory: 0 },
      { name: 'systemd', cpu: 0, memory: 0 },
      { name: 'docker', cpu: 0, memory: 0 }
    ];

    commonProcesses.forEach((proc, index) => {
      processes.push({
        pid: 1000 + index,
        name: proc.name,
        cpu: proc.cpu,
        memory: proc.memory,
        uptime: 0,
        status: 'running' as const
      });
    });

    return processes.sort((a, b) => b.cpu - a.cpu);
  }

  // Get performance alerts
  getPerformanceAlerts(): Array<{
    type: 'cpu' | 'memory' | 'disk' | 'network';
    level: 'warning' | 'critical';
    message: string;
    timestamp: Date;
  }> {
    const alerts = [];
    const metrics = this.getCurrentMetrics();

    // CPU alerts
    if (metrics.cpu.usage > 90) {
      alerts.push({
        type: 'cpu',
        level: 'critical',
        message: `CPU usage is critically high: ${metrics.cpu.usage.toFixed(1)}%`,
        timestamp: new Date()
      });
    } else if (metrics.cpu.usage > 75) {
      alerts.push({
        type: 'cpu',
        level: 'warning',
        message: `CPU usage is high: ${metrics.cpu.usage.toFixed(1)}%`,
        timestamp: new Date()
      });
    }

    // Memory alerts
    if (metrics.memory.usage > 90) {
      alerts.push({
        type: 'memory',
        level: 'critical',
        message: `Memory usage is critically high: ${metrics.memory.usage.toFixed(1)}%`,
        timestamp: new Date()
      });
    } else if (metrics.memory.usage > 80) {
      alerts.push({
        type: 'memory',
        level: 'warning',
        message: `Memory usage is high: ${metrics.memory.usage.toFixed(1)}%`,
        timestamp: new Date()
      });
    }

    // Disk alerts
    if (metrics.disk.usage > 95) {
      alerts.push({
        type: 'disk',
        level: 'critical',
        message: `Disk usage is critically high: ${metrics.disk.usage.toFixed(1)}%`,
        timestamp: new Date()
      });
    } else if (metrics.disk.usage > 85) {
      alerts.push({
        type: 'disk',
        level: 'warning',
        message: `Disk usage is high: ${metrics.disk.usage.toFixed(1)}%`,
        timestamp: new Date()
      });
    }

    return alerts;
  }

  // Get system health score
  getHealthScore(): {
    overall: number;
    cpu: number;
    memory: number;
    disk: number;
    network: number;
  } {
    const metrics = this.getCurrentMetrics();

    const cpuScore = Math.max(0, 100 - metrics.cpu.usage);
    const memoryScore = Math.max(0, 100 - metrics.memory.usage);
    const diskScore = Math.max(0, 100 - metrics.disk.usage);
    const networkScore = 100; // Network is assumed healthy unless we have specific metrics

    const overall = (cpuScore + memoryScore + diskScore + networkScore) / 4;

    return {
      overall: Math.round(overall),
      cpu: Math.round(cpuScore),
      memory: Math.round(memoryScore),
      disk: Math.round(diskScore),
      network: Math.round(networkScore)
    };
  }

  // Private helper methods
  private getCpuMetrics(): SystemMetrics['cpu'] {
    const cpus = os.cpus();
    const model = cpus[0]?.model || 'Unknown';
    const cores = cpus.length;

    // Calculate CPU usage (simplified)
    const startUsage = process.cpuUsage();
    setTimeout(() => {
      const endUsage = process.cpuUsage(startUsage);
      const userUsage = endUsage.user;
      const systemUsage = endUsage.system;
      const totalUsage = userUsage + systemUsage;
      
      // This is a simplified calculation
      return Math.min(100, (totalUsage / 1000000) * 100); // Convert to percentage
    }, 100);

    // For now, return 0 as deterministic value
    const usage = 0;

    return { usage, cores, model };
  }

  private getMemoryMetrics(): SystemMetrics['memory'] {
    const total = os.totalmem();
    const free = os.freemem();
    const used = total - free;
    const usage = (used / total) * 100;

    return {
      total: Math.round(total / 1024 / 1024), // MB
      used: Math.round(used / 1024 / 1024), // MB
      free: Math.round(free / 1024 / 1024), // MB
      usage: Math.round(usage * 100) / 100
    };
  }

  private getNetworkMetrics(): SystemMetrics['network'] {
    // Deterministic values - real metrics would come from OS APIs
    return {
      bytesReceived: 0,
      bytesSent: 0,
      packetsReceived: 0,
      packetsSent: 0
    };
  }

  private getDiskMetrics(): SystemMetrics['disk'] {
    // Deterministic values - real metrics would come from fs.statSync()
    const total = 1000000; // 1TB in MB
    const usagePercent = 0;
    const used = 0;
    const free = total;

    return {
      total,
      used,
      free,
      usage: usagePercent
    };
  }

  private getCurrentProcessCpuUsage(): number {
    const usage = process.cpuUsage();
    return Math.min(100, (usage.user + usage.system) / 1000000);
  }

  private getCurrentProcessMemoryUsage(): number {
    const usage = process.memoryUsage();
    return Math.round(usage.rss / 1024 / 1024); // MB
  }

  private addToHistory(metrics: SystemMetrics): void {
    this.metricsHistory.push(metrics);
    
    // Keep only recent metrics
    if (this.metricsHistory.length > this.maxHistorySize) {
      this.metricsHistory = this.metricsHistory.slice(-this.maxHistorySize);
    }
  }

  private initializeBaselineMetrics(): void {
    console.log('SystemMonitoringService: Initializing baseline metrics');
    
    // Create initial metrics
    const initialMetrics = this.getCurrentMetrics();
    console.log('System baseline:', {
      cpu: `${initialMetrics.cpu.usage.toFixed(1)}% (${initialMetrics.cpu.cores} cores)`,
      memory: `${initialMetrics.memory.usage.toFixed(1)}% (${initialMetrics.memory.used}MB/${initialMetrics.memory.total}MB)`,
      disk: `${initialMetrics.disk.usage.toFixed(1)}% (${initialMetrics.disk.used}MB/${initialMetrics.disk.total}MB)`,
      uptime: `${Math.round(initialMetrics.uptime / 3600)}h`
    });
  }

  // Cleanup old metrics
  cleanup(): void {
    const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000); // Keep 24 hours
    const beforeCount = this.metricsHistory.length;
    
    this.metricsHistory = this.metricsHistory.filter(metric => metric.timestamp >= cutoffTime);
    
    const cleanedCount = beforeCount - this.metricsHistory.length;
    if (cleanedCount > 0) {
      console.log(`SystemMonitoringService: Cleaned up ${cleanedCount} old metric records`);
    }
  }

  // Export metrics for monitoring systems
  exportMetrics(): string {
    const metrics = this.getCurrentMetrics();
    return JSON.stringify({
      timestamp: metrics.timestamp.toISOString(),
      system: {
        cpu: metrics.cpu.usage,
        memory: metrics.memory.usage,
        disk: metrics.disk.usage,
        uptime: metrics.uptime,
        loadAverage: metrics.loadAverage
      },
      network: {
        bytesReceived: metrics.network.bytesReceived,
        bytesSent: metrics.network.bytesSent,
        packetsReceived: metrics.network.packetsReceived,
        packetsSent: metrics.network.packetsSent
      }
    }, null, 2);
  }
}