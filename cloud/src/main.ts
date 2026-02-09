import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { trace } from '@opentelemetry/api';
import { startTelemetry } from './telemetry/otel';
import {
  assertManagedRuntimeDependencies,
  getRuntimeTier,
  isManagedProductionTier,
  resolveCorsOrigins,
} from './config/runtime-tier';

async function bootstrap() {
  // Span attachment map (cloud-side):
  // - HTTP ingress: auto HTTP instrumentation + x-trace-id response header
  // - WebSocket ingress/command flow: AgentGateway
  // - Decisioning: DecisionEngineService
  // - Vector retrieval: RAGService
  const runtimeTier = getRuntimeTier();
  const isCloudRun = Boolean(process.env.K_SERVICE);
  if (isCloudRun && !isManagedProductionTier(runtimeTier)) {
    throw new Error(
      `[Bootstrap] Cloud Run runtime (${process.env.K_SERVICE}) must use PRODUCTION_MANAGED tier. Current tier: ${runtimeTier}.`,
    );
  }

  if (isManagedProductionTier(runtimeTier) && !process.env.PORT) {
    throw new Error('[Bootstrap] PRODUCTION_MANAGED requires PORT (Cloud Run contract).');
  }

  await assertManagedRuntimeDependencies();

  await startTelemetry();

  const app = await NestFactory.create(AppModule);

  app.use((req, res, next) => {
    const activeSpan = trace.getActiveSpan();
    if (activeSpan) {
      res.setHeader('x-trace-id', activeSpan.spanContext().traceId);
    }
    next();
  });
  
  const corsOrigins = resolveCorsOrigins(runtimeTier);
  app.enableCors({
    origin: corsOrigins,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true,
  });
  
  const port = process.env.PORT || 9999;
  
  try {
    await app.listen(port);
    
    console.log(`🚀 KELEDON Cloud Backend running on port ${port}`);
    console.log(`🌐 Runtime tier: ${runtimeTier}`);
    console.log(`🌐 Cloud Run service: ${process.env.K_SERVICE || 'not-detected'}`);
    console.log(`🌐 CORS enabled for: ${corsOrigins.join(', ')}`);
    console.log('⚙️ Cloud Run compatibility: stateless process; no local persistence assumptions');
    console.log(`💾 DATABASE-READY: All sessions, agents, and events are persisted to Supabase`);
    console.log(`⚡ DATABASE-READY: No in-memory fallbacks - Cloud fails fast without Supabase`);
    console.log(`✅ PHASE 2 DATABASE-READY: Complete`);
  } catch (error) {
    console.error('❌ DATABASE-READY: Failed to start server:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  bootstrap();
}
