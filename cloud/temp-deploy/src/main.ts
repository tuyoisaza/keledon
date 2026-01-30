import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';
import { FileLogger } from './logger/file-logger';

async function bootstrap() {
  const logger = new FileLogger('Bootstrap');
  const app = await NestFactory.create(AppModule, {
    logger,
  });

  process.on('unhandledRejection', (reason) => {
    const trace = reason instanceof Error ? reason.stack : String(reason);
    logger.error('Unhandled Promise Rejection', trace);
  });

  process.on('uncaughtException', (error) => {
    const trace = error instanceof Error ? error.stack : String(error);
    logger.error('Uncaught Exception', trace);
  });

  const port = process.env.PORT || 8080;
  
  // Production CORS origins for Cloud Run
  const defaultOrigins = process.env.NODE_ENV === 'production' 
    ? ['chrome-extension://*']  // Production: Only allow Chrome extensions
    : [  // Development: Allow local origins
        'http://localhost:5173',
        'http://localhost:5174',
        'http://localhost:5175',
        'http://localhost:5176',
        'http://localhost:5177',
        'http://127.0.0.1:5173',
        'http://127.0.0.1:5174',
        'http://127.0.0.1:5175',
        'http://127.0.0.1:5176',
      ];
  const corsOrigins = process.env.CORS_ORIGINS?.split(',') || defaultOrigins;

  app.enableCors({
    origin: corsOrigins,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    credentials: true,
  });

  await app.listen(port);
  Logger.log(`KELDON Cloud running on port ${port}`, 'Bootstrap');
  Logger.log(`CORS enabled for: ${corsOrigins.join(', ')}`, 'Bootstrap');
}

bootstrap().catch(err => {
  Logger.error('Failed to start KELDON Cloud:', err);
  process.exit(1);
});
