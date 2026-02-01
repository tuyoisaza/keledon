# 🔧 Phase 5 AI Systems - Developer Guide

## 📋 **Table of Contents**
1. [Quick Start](#quick-start)
2. [Architecture Overview](#architecture-overview)
3. [Development Setup](#development-setup)
4. [Code Organization](#code-organization)
5. [AI Service Integration](#ai-service-integration)
6. [Testing Guidelines](#testing-guidelines)
7. [Performance Optimization](#performance-optimization)
8. [Troubleshooting](#troubleshooting)

---

## 🚀 **Quick Start**

### **Prerequisites**
- Node.js 18+
- TypeScript 5.0+
- Docker & Docker Compose
- PostgreSQL 14+
- Redis 7+

### **Installation**
```bash
# Clone the repository
git clone https://github.com/your-org/keledon.git
cd keledon

# Install dependencies
npm install

# Setup environment
cp .env.example .env
# Edit .env with your configuration

# Start development environment
npm run dev

# Run tests
npm test
```

### **Verify Installation**
```bash
# Check API health
curl http://localhost:3000/api/health

# Test AI services
curl http://localhost:3000/api/enhanced-ai/status
```

---

## 🏗️ **Architecture Overview**

### **System Components**
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   API Gateway   │    │   AI Services   │
│   (React/Vue)   │◄──►│   (NestJS)      │◄──►│   (AI Models)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Browser      │    │   Database      │    │   Cache Layer   │
│   Automation   │    │   (PostgreSQL)  │    │   (Redis)       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### **AI Service Architecture**
```
Phase 5 AI Platform
├── 🤖 Conversation Orchestration
│   ├── Multi-Agent Coordination
│   ├── Contextual Memory Management
│   └── Intent Recognition
├── 🌊 Multimodal Processing
│   ├── Voice + Vision + Text
│   ├── Screen Understanding
│   └ OCR Processing
├── 🤖 Intelligent Automation
│   ├── AI Workflow Creation
│   ├── Dynamic Element Detection
│   └── Error Recovery
├── 👥 Agent Coordination
│   ├── Task Distribution
│   ├── Load Balancing
│   └── Conflict Resolution
└── 📊 Predictive Analytics
    ├── Behavioral Analytics
    ├── Performance Monitoring
    └── A/B Testing
```

---

## 💻 **Development Setup**

### **Environment Configuration**
```bash
# .env file
NODE_ENV=development
PORT=3000

# AI Services
OPENAI_API_KEY=your_openai_key
ANTHROPIC_API_KEY=your_anthropic_key
GOOGLE_AI_API_KEY=your_google_key

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/keledon_dev
REDIS_URL=redis://localhost:6379

# External Services
AWS_ACCESS_KEY_ID=your_aws_key
AWS_SECRET_ACCESS_KEY=your_aws_secret
AWS_REGION=us-east-1

# Monitoring
SENTRY_DSN=your_sentry_dsn
LOG_LEVEL=debug
```

### **Docker Development Setup**
```yaml
# docker-compose.dev.yml
version: '3.8'
services:
  app:
    build:
      context: .
      dockerfile: Dockerfile.dev
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=development
    volumes:
      - .:/app
      - /app/node_modules
    depends_on:
      - postgres
      - redis

  postgres:
    image: postgres:14
    environment:
      POSTGRES_DB: keledon_dev
      POSTGRES_USER: dev
      POSTGRES_PASSWORD: dev
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

---

## 📁 **Code Organization**

### **Project Structure**
```
src/
├── ai/                          # AI Services
│   ├── orchestration/           # Conversation orchestration
│   │   ├── conversation-orchestrator.service.ts
│   │   ├── orchestration.controller.ts
│   │   └── types/
│   ├── multimodal/              # Multimodal processing
│   │   ├── multimodal-processor.service.ts
│   │   ├── screen-understanding.service.ts
│   │   └── types/
│   ├── automation/              # Intelligent automation
│   │   ├── intelligent-rpa.service.ts
│   │   ├── workflow-designer.service.ts
│   │   └── types/
│   ├── coordination/           # Agent coordination
│   │   ├── agent-orchestrator.service.ts
│   │   ├── task-distributor.service.ts
│   │   └── types/
│   └── analytics/              # Predictive analytics
│       ├── behavioral-analytics.service.ts
│       ├── performance-monitor.service.ts
│       └── types/
├── config/                     # Configuration
│   ├── config.service.ts
│   ├── config.module.ts
│   └── database.config.ts
├── common/                     # Shared utilities
│   ├── decorators/
│   ├── interceptors/
│   ├── guards/
│   └── utils/
├── test/                       # Testing
│   ├── integration/
│   ├── unit/
│   └── e2e/
└── types/                      # Global types
    ├── api.types.ts
    ├── ai.types.ts
    └── common.types.ts
```

### **Naming Conventions**
- **Files:** kebab-case for files, PascalCase for classes
- **Services:** `.service.ts` suffix, descriptive names
- **Controllers:** `.controller.ts` suffix, RESTful endpoints
- **Types:** `.types.ts` suffix, grouped by domain
- **Constants:** UPPER_SNAKE_CASE
- **Variables:** camelCase, descriptive names

---

## 🤖 **AI Service Integration**

### **Creating a New AI Service**

#### **1. Define Service Interface**
```typescript
// src/ai/services/types/new-service.types.ts
export interface NewServiceRequest {
  input: string;
  options?: NewServiceOptions;
}

export interface NewServiceResponse {
  result: string;
  confidence: number;
  metadata?: Record<string, any>;
}

export interface NewServiceOptions {
  temperature?: number;
  maxTokens?: number;
  model?: string;
}
```

#### **2. Implement Service**
```typescript
// src/ai/services/new-service.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { NewServiceRequest, NewServiceResponse } from './types/new-service.types';

@Injectable()
export class NewServiceService {
  private readonly logger = new Logger(NewServiceService.name);

  async processRequest(request: NewServiceRequest): Promise<NewServiceResponse> {
    this.logger.log(`Processing request: ${request.input}`);
    
    try {
      // AI service logic here
      const result = await this.callAIService(request);
      
      return {
        result: result.output,
        confidence: result.confidence,
        metadata: {
          processingTime: result.time,
          modelUsed: result.model
        }
      };
    } catch (error) {
      this.logger.error('Service processing failed', error);
      throw new Error('Failed to process request');
    }
  }

  private async callAIService(request: NewServiceRequest) {
    // Implementation for calling external AI service
    // OpenAI, Anthropic, Google AI, etc.
  }
}
```

#### **3. Create Controller**
```typescript
// src/ai/services/new-service.controller.ts
import { Controller, Post, Body } from '@nestjs/common';
import { NewServiceService } from './new-service.service';
import { NewServiceRequest } from './types/new-service.types';

@Controller('ai/services/new-service')
export class NewServiceController {
  constructor(private readonly newServiceService: NewServiceService) {}

  @Post('process')
  async process(@Body() request: NewServiceRequest) {
    return this.newServiceService.processRequest(request);
  }
}
```

#### **4. Register Module**
```typescript
// src/ai/services/new-service.module.ts
import { Module } from '@nestjs/common';
import { NewServiceController } from './new-service.controller';
import { NewServiceService } from './new-service.service';

@Module({
  controllers: [NewServiceController],
  providers: [NewServiceService],
  exports: [NewServiceService],
})
export class NewServiceModule {}
```

### **AI Model Integration Patterns**

#### **OpenAI Integration**
```typescript
import { OpenAI } from 'openai';

@Injectable()
export class OpenAIService {
  private readonly openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  async generateCompletion(prompt: string) {
    const response = await this.openai.chat.completions.create({
      model: 'gpt-4-turbo',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 2000,
    });

    return {
      content: response.choices[0].message.content,
      usage: response.usage,
    };
  }
}
```

#### **Anthropic Integration**
```typescript
import Anthropic from '@anthropic-ai/sdk';

@Injectable()
export class AnthropicService {
  private readonly anthropic: Anthropic;

  constructor() {
    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }

  async generateCompletion(prompt: string) {
    const response = await this.anthropic.messages.create({
      model: 'claude-3-opus-20240229',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }],
    });

    return {
      content: response.content[0].type === 'text' ? response.content[0].text : '',
      usage: response.usage,
    };
  }
}
```

---

## 🧪 **Testing Guidelines**

### **Unit Testing**
```typescript
// src/test/unit/new-service.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { NewServiceService } from '../../ai/services/new-service.service';

describe('NewServiceService', () => {
  let service: NewServiceService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [NewServiceService],
    }).compile();

    service = module.get<NewServiceService>(NewServiceService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should process request successfully', async () => {
    const request = { input: 'test input' };
    const result = await service.processRequest(request);
    
    expect(result.result).toBeDefined();
    expect(result.confidence).toBeGreaterThan(0);
  });

  it('should handle errors gracefully', async () => {
    const request = { input: '' };
    
    await expect(service.processRequest(request)).rejects.toThrow();
  });
});
```

### **Integration Testing**
```typescript
// src/test/integration/new-service.integration.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../app.module';

describe('NewService (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/ai/services/new-service/process (POST)', () => {
    return request(app.getHttpServer())
      .post('/ai/services/new-service/process')
      .send({ input: 'test input' })
      .expect(200)
      .expect((res) => {
        expect(res.body.result).toBeDefined();
        expect(res.body.confidence).toBeGreaterThan(0);
      });
  });
});
```

### **Performance Testing**
```typescript
// src/test/performance/new-service.performance.spec.ts
import { PerformanceTester } from '../utils/performance-tester';

describe('NewService Performance', () => {
  it('should handle 100 requests per second', async () => {
    const tester = new PerformanceTester({
      targetUrl: 'http://localhost:3000/ai/services/new-service/process',
      method: 'POST',
      body: { input: 'performance test' },
      requestsPerSecond: 100,
      duration: 10, // 10 seconds
    });

    const results = await tester.run();
    
    expect(results.averageResponseTime).toBeLessThan(200);
    expect(results.errorRate).toBeLessThan(0.01);
    expect(results.requestsCompleted).toBeGreaterThanOrEqual(900);
  });
});
```

---

## ⚡ **Performance Optimization**

### **Caching Strategy**
```typescript
import { Cache } from 'cache-manager';

@Injectable()
export class OptimizedService {
  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  async getCachedResult(key: string): Promise<any> {
    const cached = await this.cacheManager.get(key);
    if (cached) {
      return cached;
    }

    const result = await this.computeExpensiveOperation(key);
    await this.cacheManager.set(key, result, { ttl: 3600 }); // 1 hour
    
    return result;
  }
}
```

### **Connection Pooling**
```typescript
// config/database.config.ts
import { TypeOrmModule } from '@nestjs/typeorm';

export const databaseConfig = TypeOrmModule.forRoot({
  type: 'postgres',
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  entities: [__dirname + '/**/*.entity{.ts,.js}'],
  synchronize: process.env.NODE_ENV === 'development',
  logging: process.env.NODE_ENV === 'development',
  // Performance optimizations
  extra: {
    connectionLimit: 20,
    acquireTimeoutMillis: 60000,
    createTimeoutMillis: 30000,
    destroyTimeoutMillis: 5000,
    idleTimeoutMillis: 600000,
    reapIntervalMillis: 1000,
    createRetryIntervalMillis: 200,
  },
});
```

### **Async Processing**
```typescript
import { Queue, Worker } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';

@Injectable()
export class AsyncProcessor {
  constructor(@InjectQueue('ai-processing') private queue: Queue) {}

  async processAsync(data: any): Promise<string> {
    const job = await this.queue.add('process-ai-request', data, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
    });

    return job.id;
  }
}

@Processor('ai-processing')
export class AiProcessor {
  async process(job: Job<any>) {
    // Process AI request asynchronously
    const result = await this.performAIProcessing(job.data);
    return result;
  }
}
```

---

## 🔧 **Troubleshooting**

### **Common Issues**

#### **High Memory Usage**
```bash
# Check memory usage
node --inspect app.js

# Profile memory
node --prof app.js
node --prof-process isolate-*.log > processed.txt

# Heap dump
node --heap-prof app.js
```

#### **Database Connection Issues**
```typescript
// Enhanced error handling
@Injectable()
export class DatabaseService {
  async query(sql: string, params?: any[]) {
    try {
      return await this.connection.query(sql, params);
    } catch (error) {
      if (error.code === 'ECONNREFUSED') {
        throw new Error('Database connection failed. Check database server.');
      }
      if (error.code === 'ETIMEDOUT') {
        throw new Error('Database query timeout. Consider optimizing query.');
      }
      throw error;
    }
  }
}
```

#### **AI Service Rate Limiting**
```typescript
import { RateLimiterMemory } from 'rate-limiter-flexible';

@Injectable()
export class RateLimitedAIService {
  private rateLimiter = new RateLimiterMemory({
    keyPrefix: 'ai_service',
    points: 100, // Number of requests
    duration: 60, // Per 60 seconds
  });

  async callAIService(input: string) {
    await this.rateLimiter.consume('global');
    
    // Make API call
    return this.makeAPICall(input);
  }
}
```

### **Debugging Tools**

#### **Logging Configuration**
```typescript
import { Logger } from '@nestjs/common';

@Injectable()
export class DebugService {
  private readonly logger = new Logger(DebugServiceService.name);

  async debugMethod(input: any) {
    this.logger.debug(`Input: ${JSON.stringify(input)}`);
    
    try {
      const result = await this.process(input);
      this.logger.debug(`Output: ${JSON.stringify(result)}`);
      return result;
    } catch (error) {
      this.logger.error(`Error: ${error.message}`, error.stack);
      throw error;
    }
  }
}
```

#### **Health Check Endpoints**
```typescript
@Controller('health')
export class HealthController {
  @Get()
  async health() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      version: process.env.npm_package_version,
    };
  }

  @Get('detailed')
  async detailedHealth() {
    const health = {
      status: 'ok',
      checks: {
        database: await this.checkDatabase(),
        redis: await this.checkRedis(),
        aiServices: await this.checkAIServices(),
      },
      timestamp: new Date().toISOString(),
    };

    const allHealthy = Object.values(health.checks).every(check => check.status === 'ok');
    health.status = allHealthy ? 'ok' : 'degraded';

    return health;
  }
}
```

---

## 📚 **Additional Resources**

### **Documentation**
- [API Reference](./phase5-api-documentation.md)
- [Integration Test Results](./phase5-integration-test-summary.md)
- [Deployment Guide](./deployment-guide.md)

### **Tools & Libraries**
- **Testing:** Jest, Supertest, Artillery
- **Performance:** New Relic, DataDog, Grafana
- **Monitoring:** Prometheus, Sentry, ELK Stack
- **CI/CD:** GitHub Actions, Jenkins, Docker

### **Best Practices**
- Follow SOLID principles
- Implement proper error handling
- Use TypeScript strictly
- Write comprehensive tests
- Monitor performance metrics
- Keep dependencies updated

---

## 🎯 **Conclusion**

This developer guide provides comprehensive documentation for working with the Phase 5 AI platform. Follow these guidelines to ensure high-quality, maintainable code that leverages the full power of our AI ecosystem.

### **Key Takeaways:**
1. **Architecture-First Design:** Understand the system before coding
2. **Type Safety:** Use TypeScript for all new code
3. **Test-Driven:** Write tests before implementation
4. **Performance-Conscious:** Consider scalability from the start
5. **Security-Minded:** Implement proper security measures

---

**🚀 Happy Coding with Phase 5 AI Platform!**