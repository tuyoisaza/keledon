# Escalation Logging to Database

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Store escalation events persistently in PostgreSQL for audit trail, analytics, and human notification workflows

**Architecture:**
- Add EscalationLog model to Prisma schema
- Create EscalationService for logging
- Wire device gateway to log escalations
- Add escalation analytics endpoint

**Tech Stack:** NestJS, Prisma, PostgreSQL

---

## Task 1: Add Escalation Model to Prisma

**Files:**
- Modify: `cloud/prisma/schema.prisma`

- [ ] **Step 1: Add EscalationLog model**

```prisma
model EscalationLog {
  id            String   @id @default(uuid())
  deviceId      String
  keledonId     String?
  teamId        String?
  sessionId     String?
  type          EscalationType
  triggerWord   String?
  transcript    String?
  message       String?
  action        String?  // continue, fix, abort
  notified      Boolean  @default(false)
  metadata      Json?
  createdAt     DateTime @default(now())

  device        Device   @relation(fields: [deviceId], references: [id])
  keledon       Keledon? @relation(fields: [keledonId], references: [id])
  team          Team?    @relation(fields: [teamId], references: [id])
}

enum EscalationType {
  KEYWORD_TRIGGER
  RPA_FAILURE
  MANUAL_ABORT
  SYSTEM_ERROR
}
```

- [ ] **Step 2: Commit**

```bash
git add cloud/prisma/schema.prisma
git commit -m "feat(db: add EscalationLog model to Prisma schema"
```

---

## Task 2: Create EscalationService

**Files:**
- Create: `cloud/src/services/escalation.service.ts`
- Modify: `cloud/src/services/services.module.ts`

- [ ] **Step 1: Create EscalationService**

```typescript
// cloud/src/services/escalation.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface EscalationInput {
  deviceId: string;
  keledonId?: string;
  teamId?: string;
  sessionId?: string;
  type: 'KEYWORD_TRIGGER' | 'RPA_FAILURE' | 'MANUAL_ABORT' | 'SYSTEM_ERROR';
  triggerWord?: string;
  transcript?: string;
  message?: string;
  metadata?: Record<string, any>;
}

@Injectable()
export class EscalationService {
  private readonly logger = new Logger(EscalationService.name);

  constructor(private prisma: PrismaService) {}

  async logEscalation(input: EscalationInput): Promise<any> {
    this.logger.warn(`[Escalation] ${input.type}: ${input.triggerWord || input.message}`);
    
    const escalation = await this.prisma.escalationLog.create({
      data: {
        deviceId: input.deviceId,
        keledonId: input.keledonId,
        teamId: input.teamId,
        sessionId: input.sessionId,
        type: input.type,
        triggerWord: input.triggerWord,
        transcript: input.transcript,
        message: input.message,
        metadata: input.metadata
      }
    });

    // TODO: Trigger human notification (email, Slack, etc.)
    await this.notifyHuman(escalation);

    return escalation;
  }

  private async notifyHuman(escalation: any): Promise<void> {
    // Placeholder for notification logic
    // Could integrate with email service, Slack webhook, etc.
    this.logger.log(`[Escalation] Would notify human for escalation: ${escalation.id}`);
  }

  async getEscalations(filter: {
    teamId?: string;
    deviceId?: string;
    since?: Date;
    limit?: number;
  }): Promise<any[]> {
    const where: any = {};
    
    if (filter.teamId) where.teamId = filter.teamId;
    if (filter.deviceId) where.deviceId = filter.deviceId;
    if (filter.since) where.createdAt = { gte: filter.since };

    return this.prisma.escalationLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: filter.limit || 100
    });
  }

  async getEscalationStats(teamId: string, days: number = 30): Promise<any> {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const escalations = await this.prisma.escalationLog.findMany({
      where: {
        teamId,
        createdAt: { gte: since }
      }
    });

    const byType = escalations.reduce((acc, e) => {
      acc[e.type] = (acc[e.type] || 0) + 1;
      return acc;
    }, {});

    const byAction = escalations.reduce((acc, e) => {
      if (e.action) {
        acc[e.action] = (acc[e.action] || 0) + 1;
      }
      return acc;
    }, {});

    return {
      total: escalations.length,
      byType,
      byAction,
      period: `${days} days`
    };
  }
}
```

- [ ] **Step 2: Register in module**

Add to ServicesModule providers: `EscalationService`

- [ ] **Step 3: Commit**

```bash
git add cloud/src/services/escalation.service.ts cloud/src/services/services.module.ts
git commit -m "feat(escalation): add EscalationService for persistent logging"
```

---

## Task 3: Wire Device Gateway to EscalationService

**Files:**
- Modify: `cloud/src/gateways/device.gateway.ts`

- [ ] **Step 1: Import and inject EscalationService**

In device.gateway.ts imports:
```typescript
import { EscalationService } from '../services/escalation.service';
```

In constructor:
```typescript
constructor(
  private deviceService: DeviceService,
  private prisma: PrismaService,
  @Optional() private decisionEngine?: DecisionEngineService,
  @Optional() private escalationService?: EscalationService,
) {}
```

- [ ] **Step 2: Update escalation handlers**

Replace `handleEscalationTrigger`:
```typescript
@SubscribeMessage('escalation:trigger')
async handleEscalationTrigger(
  @ConnectedSocket() client: Socket,
  @MessageBody() data: { trigger: string; transcript: string; timestamp: string }
) {
  this.logger.warn(`Escalation trigger from ${client.data.deviceId}:`, data.trigger);
  
  if (this.escalationService && client.data.deviceId) {
    await this.escalationService.logEscalation({
      deviceId: client.data.deviceId,
      keledonId: client.data.keledonId,
      teamId: client.data.teamId,
      sessionId: client.data.sessionId,
      type: 'KEYWORD_TRIGGER',
      triggerWord: data.trigger,
      transcript: data.transcript,
      message: `Escalation keyword detected: ${data.trigger}`
    });
  }
  
  return { received: true };
}
```

- [ ] **Step 3: Update abort handler**

Replace `handleEscalationAbort`:
```typescript
@SubscribeMessage('escalation:abort')
async handleEscalationAbort(
  @ConnectedSocket() client: Socket,
  @MessageBody() data: { reason: string; timestamp: string }
) {
  this.logger.warn(`Escalation abort from ${client.data.deviceId}:`, data.reason);
  
  if (this.escalationService && client.data.deviceId) {
    await this.escalationService.logEscalation({
      deviceId: client.data.deviceId,
      keledonId: client.data.keledonId,
      teamId: client.data.teamId,
      sessionId: client.data.sessionId,
      type: 'MANUAL_ABORT',
      message: data.reason,
      action: 'abort'
    });
  }
  
  return { received: true };
}
```

- [ ] **Step 4: Commit**

```bash
git add cloud/src/gateways/device.gateway.ts
git commit -m "feat(escalation): wire device gateway to EscalationService"
```

---

## Task 4: Add Escalation Stats Endpoint

**Files:**
- Create: `cloud/src/escalations/escalations.controller.ts`
- Create: `cloud/src/escalations/escalations.module.ts`

- [ ] **Step 1: Create escalations controller**

```typescript
// cloud/src/escalations/escalations.controller.ts
import { Controller, Get, Query } from '@nestjs/common';
import { EscalationService } from '../services/escalation.service';

@Controller('api/escalations')
export class EscalationsController {
  constructor(private escalationService: EscalationService) {}

  @Get('stats')
  async getStats(
    @Query('teamId') teamId: string,
    @Query('days') days: string = '30'
  ) {
    return this.escalationService.getEscalationStats(teamId, parseInt(days, 10));
  }

  @Get()
  async getEscalations(
    @Query('teamId') teamId?: string,
    @Query('deviceId') deviceId?: string,
    @Query('limit') limit?: string
  ) {
    return this.escalationService.getEscalations({
      teamId,
      deviceId,
      limit: limit ? parseInt(limit, 10) : 100
    });
  }
}
```

- [ ] **Step 2: Create module and register controller**

```typescript
// cloud/src/escalations/escalations.module.ts
import { Module } from '@nestjs/common';
import { EscalationsController } from './escalations.controller';

@Module({
  controllers: [EscalationsController]
})
export class EscalationsModule {}
```

Add to app.module.ts: `EscalationsModule`

- [ ] **Step 3: Commit**

```bash
git add cloud/src/escalations/
git commit -m "feat(api: add escalation stats endpoints"
```

---

## Verification

```bash
# Test escalation stats endpoint
curl -s "https://keledon.tuyoisaza.com/api/escalations/stats?teamId=test-team&days=7"

# Expected: { total: 0, byType: {}, byAction: {}, period: "7 days" }
```

---

**End of Escalation Logging Plan**