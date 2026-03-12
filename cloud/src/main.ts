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

// Global error handlers - must be first
process.on('uncaughtException', (err) => {
  console.error('[FATAL] Uncaught exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error('[FATAL] Unhandled rejection:', reason);
});

async function bootstrap() {
  console.log('[Bootstrap] Starting KELEDON Cloud...');
  
  try {
    // Span attachment map (cloud-side):
    // - HTTP ingress: auto HTTP instrumentation + x-trace-id response header
    // - WebSocket ingress/command flow: AgentGateway
    // - Decisioning: DecisionEngineService
    // - Vector retrieval: RAGService
    const runtimeTier = getRuntimeTier();
    console.log(`[Bootstrap] Runtime tier: ${runtimeTier}`);
    
    const isCloudRun = Boolean(process.env.K_SERVICE);
    if (isCloudRun && !isManagedProductionTier(runtimeTier)) {
      throw new Error(
        `[Bootstrap] Cloud Run runtime (${process.env.K_SERVICE}) must use PRODUCTION_MANAGED tier. Current tier: ${runtimeTier}.`,
      );
    }

    if (isManagedProductionTier(runtimeTier) && !process.env.PORT) {
      throw new Error('[Bootstrap] PRODUCTION_MANAGED requires PORT (Cloud Run contract).');
    }

    console.log('[Bootstrap] Checking managed dependencies...');
    await assertManagedRuntimeDependencies();
    console.log('[Bootstrap] Dependencies OK, starting telemetry...');

    await startTelemetry();
    console.log('[Bootstrap] Creating NestJS application...');

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
    const host = process.env.HOST || '0.0.0.0';

    if (isManagedProductionTier(runtimeTier) && !process.env.DATABASE_URL) {
      throw new Error('[Bootstrap] DATABASE_URL is required in PRODUCTION_MANAGED (Railway + Prisma contract).');
    }

    await app.listen(port, host);

    console.log(`🚀 KELEDON Cloud Backend running on ${host}:${port}`);
    console.log(`🌐 Runtime tier: ${runtimeTier}`);
    console.log(`🌐 Cloud Run service: ${process.env.K_SERVICE || 'not-detected'}`);
    console.log(`🌐 CORS enabled for: ${corsOrigins.join(', ')}`);
    console.log('⚙️ Managed runtime compatibility: stateless process; no local persistence assumptions');
    console.log(`💾 DATABASE-READY: Persistence via PostgreSQL (DATABASE_URL / Prisma canonical contract)`);
    console.log(`⚡ DATABASE-READY: No in-memory fallbacks - Cloud fails fast without database`);
    console.log(`✅ PHASE 2 DATABASE-READY: Complete`);
  } catch (error) {
    console.error('❌ DATABASE-READY: Failed to start server:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  console.log('[Bootstrap] main.ts executed, calling bootstrap()...');
  bootstrap().catch((err) => {
    console.error('[FATAL] Bootstrap failed:', err);
    process.exit(1);
  });
}
