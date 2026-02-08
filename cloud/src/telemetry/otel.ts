import { diag, DiagConsoleLogger, DiagLogLevel } from '@opentelemetry/api';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { resourceFromAttributes } from '@opentelemetry/resources';
import {
  SEMRESATTRS_DEPLOYMENT_ENVIRONMENT,
  SEMRESATTRS_SERVICE_NAME,
} from '@opentelemetry/semantic-conventions';

const serviceName = 'keledon-cloud';
const deploymentEnvironment = process.env.NODE_ENV || 'development';

// Local-dev backend selection: Jaeger all-in-one with OTLP/HTTP receiver.
// Default endpoint targets Jaeger OTLP ingest at localhost:4318.
const traceExporter = new OTLPTraceExporter({
  url: process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT || 'http://localhost:4318/v1/traces',
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
      `[OTEL] Tracing started for ${serviceName} -> ${process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT || 'http://localhost:4318/v1/traces'} (Jaeger OTLP)`,
    );
  } catch (error) {
    telemetryStarted = false;
    console.error('[OTEL] Failed to start telemetry SDK:', error);
    throw error;
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
