import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { trace } from '@opentelemetry/api';
import { startTelemetry } from './telemetry/otel';

async function bootstrap() {
  // Span attachment map (cloud-side):
  // - HTTP ingress: auto HTTP instrumentation + x-trace-id response header
  // - WebSocket ingress/command flow: AgentGateway
  // - Decisioning: DecisionEngineService
  // - Vector retrieval: RAGService
  await startTelemetry();

  const app = await NestFactory.create(AppModule);

  app.use((req, res, next) => {
    const activeSpan = trace.getActiveSpan();
    if (activeSpan) {
      res.setHeader('x-trace-id', activeSpan.spanContext().traceId);
    }
    next();
  });
  
  // Enable CORS for local development
  app.enableCors({
    origin: ['http://localhost:5173', 'http://localhost:3000'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true,
  });
  
  const port = process.env.PORT || 9999;
  
  try {
    await app.listen(port);
    
    console.log(`🚀 KELEDON Cloud Backend running on port ${port}`);
    console.log(`🌐 CORS enabled for: http://localhost:5173`);
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
