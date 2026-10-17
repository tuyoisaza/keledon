export interface IntegrationHealthSnapshot {
  errorRate: number;
  lastCheck?: Date | string;
  responseTime: number;
  totalRequests?: number;
}

export function hasMeasuredIntegrationHealth(
  health: IntegrationHealthSnapshot | undefined,
): boolean;

export function getIntegrationHealthIndicator(
  health: IntegrationHealthSnapshot | undefined,
): 'unknown' | 'error' | 'warning' | 'healthy';
