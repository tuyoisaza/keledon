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
  
  const port = process.env.PORT || 3001;
  await app.listen(port);
  
  console.log(`KELEDON backend running on http://localhost:${port}`);
  console.log(`CORS enabled for: http://localhost:5173`);
}

if (require.main === module) {
  bootstrap();
}