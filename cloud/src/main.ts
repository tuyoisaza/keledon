import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { EnvironmentService } from './services/environment.service';

const logger = new Logger('Bootstrap');

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Get environment service for validation and logging
  const environmentService = app.get(EnvironmentService);
  
  // Validate current phase and log environment info
  environmentService.validateCurrentPhase();
  environmentService.logEnvironmentInfo();
  
  // Enable CORS using environment-specific origins
  const corsOrigins = process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'];
  app.enableCors({
    origin: corsOrigins,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true,
  });
  
  // Global validation pipe
  app.useGlobalPipes(new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
  }));
  
  const port = process.env.CLOUD_PORT || 3001;
  await app.listen(port);
  
  logger.log(`🚀 KELEDON backend running on http://localhost:${port}`);
  logger.log(`🌐 CORS enabled for: ${corsOrigins.join(', ')}`);
  
  // Log final phase status
  const phase = environmentService.getPhase();
  logger.log(`✅ Bootstrap complete: ${phase}`);
}

if (require.main === module) {
  bootstrap();
}