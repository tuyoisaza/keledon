export function hasMeasuredIntegrationHealth(health) {
  const checkedAt =
    health?.lastCheck instanceof Date
      ? health.lastCheck.getTime()
      : Date.parse(health?.lastCheck ?? '');
  return Boolean(
    health &&
      Number.isFinite(checkedAt) &&
      Number.isFinite(health.totalRequests) &&
      health.totalRequests > 0 &&
      Number.isFinite(health.responseTime) &&
      Number.isFinite(health.errorRate),
  );
}

export function getIntegrationHealthIndicator(health) {
  if (!hasMeasuredIntegrationHealth(health)) return 'unknown';
  if (health.errorRate > 10) return 'error';
  if (health.responseTime > 1000) return 'warning';
  return 'healthy';
}
