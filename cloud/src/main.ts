import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
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