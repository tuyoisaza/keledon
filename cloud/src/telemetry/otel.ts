import { diag, DiagConsoleLogger, DiagLogLevel } from '@opentelemetry/api';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { resourceFromAttributes } from '@opentelemetry/resources';
import {
  SEMRESATTRS_DEPLOYMENT_ENVIRONMENT,
  SEMRESATTRS_SERVICE_NAME,
} from '@opentelemetry/semantic-conventions';
import { getRuntimeTier, resolveServiceEndpoints } from '../config/runtime-tier';

const serviceName = 'keledon-cloud';
const deploymentEnvironment = getRuntimeTier();
const resolvedEndpoints = resolveServiceEndpoints();

const traceExporter = new OTLPTraceExporter({
  url: resolvedEndpoints.otelExporterUrl,
});

const sdk = new NodeSDK({
  resource: resourceFromAttributes({
    [SEMRESATTRS_SERVICE_NAME]: serviceName,
    [SEMRESATTRS_DEPLOYMENT_ENVIRONMENT]: deploymentEnvironment,
  }),
  traceExporter,
  instrumentations: [
    getNodeAutoInstrumentations({
      '@opentelemetry/instrumentation-http': { enabled: true },
    }),
  ],
});

let telemetryStarted = false;

export async function startTelemetry(): Promise<void> {
  if (telemetryStarted) {
    return;
  }

  telemetryStarted = true;

  if (process.env.OTEL_DIAGNOSTIC_LOGS === 'true') {
    diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.INFO);
  }

  try {
    await sdk.start();
    console.log(
      `[OTEL] Tracing started for ${serviceName} -> ${resolvedEndpoints.otelExporterUrl}`,
    );
  } catch (error) {
    telemetryStarted = false;
    console.warn('[OTEL] Failed to start telemetry SDK (non-fatal):', error);
  }
}

async function shutdownTelemetry(signal: string): Promise<void> {
  try {
    await sdk.shutdown();
    console.log(`[OTEL] Telemetry shutdown complete after ${signal}`);
  } catch (error) {
    console.error(`[OTEL] Telemetry shutdown failed after ${signal}:`, error);
  }
}

process.on('SIGTERM', () => {
  void shutdownTelemetry('SIGTERM');
});

process.on('SIGINT', () => {
  void shutdownTelemetry('SIGINT');
});
