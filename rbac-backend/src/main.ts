import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app/app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Enable CORS for development
  app.enableCors({
    origin: true,
    credentials: true,
  });
  
  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  
  // API prefix
  app.setGlobalPrefix('api');
  
  const port = process.env.PORT || 3000;
  await app.listen(port);
  
  console.log(`🎉 KELEDON RBAC API running on http://localhost:${port}`);
  console.log(`🔍 Ready to test RBAC endpoints:`);
  console.log(`   POST /api/rbac-analysis/analyze - Perform RBAC analysis`);
  console.log(`   GET /api/rbac-analysis/dashboard - Get dashboard data`);
  console.log(`   GET /api/rbac-analysis/insights - Get AI insights`);
  console.log(`   GET /api/rbac-analysis/recommendations - Get recommendations`);
  console.log(`   GET /api/rbac-analysis/gaps - Get identified gaps`);
  console.log(`   GET /api/rbac-analysis/implementation-plan - Get implementation plan`);
}

bootstrap().catch((error) => {
  console.error('❌ Failed to start application:', error);
  process.exit(1);
});

bootstrap().catch((error) => {
  console.error('❌ Failed to start application:', error);
  process.exit(1);
});