# Session Persistence to PostgreSQL

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Store session data persistently in PostgreSQL instead of in-memory, enabling session history, analytics, and session resumption

**Architecture:**
- Add Session model to Prisma schema
- Update SessionService to use Prisma
- Add session lifecycle methods (create, update, end)
- Add session event logging

**Tech Stack:** NestJS, Prisma, PostgreSQL

---

## Task 1: Add Session Model to Prisma Schema

**Files:**
- Modify: `cloud/prisma/schema.prisma`

- [ ] **Step 1: Add Session model to schema**

Find existing models and add:

```prisma
model Session {
  id                String   @id @default(uuid())
  sessionId         String   @unique
  keledonId         String?
  teamId            String?
  userId            String?
  deviceId          String?
  status            SessionStatus @default(PENDING)
  startedAt         DateTime?
  endedAt           DateTime?
  metadata          Json?
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  events            SessionEvent[]
}

model SessionEvent {
  id          String   @id @default(uuid())
  sessionId   String
  session     Session  @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  type        String
  direction   String?
  content     String?
  confidence  Float?
  metadata    Json?
  timestamp  DateTime @default(now())
}

enum SessionStatus {
  PENDING
  ACTIVE
  PAUSED
  ENDED
  ABORTED
}
```

- [ ] **Step 2: Run Prisma migration**

Run: `cd cloud && npx prisma generate`

- [ ] **Step 3: Commit**

```bash
git add cloud/prisma/schema.prisma
git commit -m "feat(db): add Session and SessionEvent models to Prisma schema"
```

---

## Task 2: Update SessionService for Persistent Storage

**Files:**
- Modify: `cloud/src/services/session.service.ts`

- [ ] **Step 1: Update SessionService constructor and methods**

Update constructor to include Prisma:
```typescript
constructor(private prisma: PrismaService) {}
```

Replace `createSession` method:
```typescript
async createSession(sessionId: string, data: {
  keledonId?: string;
  teamId?: string;
  userId?: string;
  deviceId?: string;
}): Promise<Session> {
  return this.prisma.session.create({
    data: {
      sessionId,
      keledonId: data.keledonId,
      teamId: data.teamId,
      userId: data.userId,
      deviceId: data.deviceId,
      status: 'ACTIVE',
      startedAt: new Date()
    }
  });
}
```

Replace `getSession` method:
```typescript
async getSession(sessionId: string): Promise<Session | null> {
  return this.prisma.session.findUnique({
    where: { sessionId }
  });
}
```

Add `updateSessionStatus` method:
```typescript
async updateSessionStatus(sessionId: string, status: 'ACTIVE' | 'PAUSED' | 'ENDED' | 'ABORTED'): Promise<Session> {
  const updateData: any = { status };
  if (status === 'ENDED' || status === 'ABORTED') {
    updateData.endedAt = new Date();
  }
  
  return this.prisma.session.update({
    where: { sessionId },
    data: updateData
  });
}
```

- [ ] **Step 2: Add session event logging**

Add `logSessionEvent` method:
```typescript
async logSessionEvent(sessionId: string, event: {
  type: string;
  direction?: string;
  content?: string;
  confidence?: number;
  metadata?: Record<string, any>;
}): Promise<SessionEvent> {
  const session = await this.prisma.session.findUnique({ where: { sessionId } });
  if (!session) throw new Error('Session not found');
  
  return this.prisma.sessionEvent.create({
    data: {
      sessionId: session.id,
      type: event.type,
      direction: event.direction,
      content: event.content,
      confidence: event.confidence,
      metadata: event.metadata
    }
  });
}
```

- [ ] **Step 3: Commit**

```bash
git add cloud/src/services/session.service.ts
git commit -m "feat(session): add persistent session storage with Prisma"
```

---

## Task 3: Wire Session Events in Device Gateway

**Files:**
- Modify: `cloud/src/gateways/device.gateway.ts`

- [ ] **Step 1: Log voice transcripts to session**

In `handleVoiceTranscript` method, add:
```typescript
if (sessionId && this.sessionService) {
  await this.sessionService.logSessionEvent(sessionId, {
    type: 'transcript',
    direction: 'inbound',
    content: data.text,
    metadata: { isFinal: data.isFinal }
  });
}
```

- [ ] **Step 2: Log commands sent to device**

Add logging for outgoing commands in decision engine response:
```typescript
// After sending command to device
if (sessionId && this.sessionService) {
  await this.sessionService.logSessionEvent(sessionId, {
    type: 'command',
    direction: 'outbound',
    content: JSON.stringify(command),
    metadata: { decisionId: decisionId }
  });
}
```

- [ ] **Step 3: Commit**

```bash
git add cloud/src/gateways/device.gateway.ts
git commit -m "feat(session): log session events for analytics"
```

---

## Verification

```bash
# Check database has new tables
curl -s https://keledon.tuyoisaza.com/health/detailed | grep -i database

# Test session creation via API
# (requires existing endpoint or create test)
```

---

**End of Session Persistence Plan**