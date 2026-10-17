import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getIntegrationHealthIndicator,
  hasMeasuredIntegrationHealth,
} from './integration-health.mjs';

test('default integration metrics stay unknown until a check records a request', () => {
  const defaults = {
    responseTime: 0,
    uptime: 0,
    errorRate: 0,
    totalRequests: 0,
  };
  assert.equal(hasMeasuredIntegrationHealth(defaults), false);
  assert.equal(getIntegrationHealthIndicator(defaults), 'unknown');
  assert.equal(getIntegrationHealthIndicator(undefined), 'unknown');
});

test('measured integration health maps to healthy, warning, and error states', () => {
  const measured = {
    totalRequests: 10,
    lastCheck: '2026-10-17T00:00:00.000Z',
    responseTime: 100,
    errorRate: 0,
  };
  assert.equal(hasMeasuredIntegrationHealth(measured), true);
  assert.equal(getIntegrationHealthIndicator(measured), 'healthy');
  assert.equal(
    getIntegrationHealthIndicator({ ...measured, responseTime: 1200 }),
    'warning',
  );
  assert.equal(
    getIntegrationHealthIndicator({ ...measured, errorRate: 11 }),
    'error',
  );
  assert.equal(
    getIntegrationHealthIndicator({ ...measured, lastCheck: undefined }),
    'unknown',
  );
  assert.equal(
    getIntegrationHealthIndicator({ ...measured, errorRate: Number.NaN }),
    'unknown',
  );
  assert.equal(
    getIntegrationHealthIndicator({ ...measured, lastCheck: 'invalid' }),
    'unknown',
  );
});
