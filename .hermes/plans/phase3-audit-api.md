# Phase 3: Audit API — Auth, Versioning, Documentation

> Goal: Fix critical auth gaps, implement proper API versioning, activate Swagger docs, connect audit logging.
> Stack: NestJS + Prisma + Railway
> Constraint: Additive-only (Hard Rule #1)

## Current State (from deep research)

### Auth — 8 critical gaps
- No endpoint auth enforcement — `AuthGuard` is a no-op stub (allows all)
- Custom base64 "JWT" with zero signature verification (anyone can forge)
- Password hashing is **not actually applied** during register/login
- User data stored in flat JSON file, not Prisma DB
- RBAC infrastructure exists (RolesGuard, role field on User) but zero endpoints use it
- Device auth headers (`x-user-id`, `x-organization-id`) are trust-based
- No Passport.js or standard auth library
- Two analytics controllers (`AnalyticsController`, `RBACAnalysisController`) exist but are **not registered** in AppModule

### Audit System — disconnected
- `AuditLog` model exists with proper fields (userId, action, entity, entityId, changes, ipAddress, userAgent)
- Only `DebugModeService` and `CrudService.createAuditLog()` write to it
- No CRUD interceptor/middleware auto-logs operations
- `ipAddress` and `userAgent` fields **never populated**
- Two parallel systems: `AuditLog` (DB) + `Event` model (event sourcing) — no cross-linking
- `SecurityService` logs only in-memory

### Versioning — none
- No global prefix, no version prefix on any endpoint
- Static OpenAPI YAML exists at `contracts/v1/openapi/admin.openapi.yaml` but is stale/different from code

### Documentation — nearly absent
- `@nestjs/swagger` in package.json but Swagger UI not activated
- Only RBACAnalysisController has Swagger decorators (dead code — not registered)
- Zero DTOs use `@ApiProperty()`

---

## Task Breakdown

### 1. API Versioning — set up global prefix
**Change:** Add `app.setGlobalPrefix('api/v1')` in `main.ts`

This adds `/api/v1/` prefix to all routes. However, this is a BREAKING CHANGE for all existing clients (browser extension, frontend, etc.). 

**Alternative:** Use header-based versioning instead (no URL change) or set up version migration.

**Files to modify:**
- `services/api/src/main.ts` — add global prefix or header middleware

**Deployment:** The Railway web nginx proxies `/api/` to upstream. If URL prefix changes to `v1`, update nginx to proxy `/api/v1/` → upstream `/`.

---

### 2. Swagger Documentation — activate & annotate
**Step 1: Activate Swagger UI in main.ts**
```typescript
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

const config = new DocumentBuilder()
  .setTitle('KELEDON API')
  .setDescription('Agentic browser automation backend')
  .setVersion('1.0')
  .addBearerAuth()
  .build();
const document = SwaggerModule.createDocument(app, config);
SwaggerModule.setup('api/docs', app, document);
```

**Step 2: Add swagger decorators to active controllers** (at minimum: route summaries, tags)
- Add `@ApiTags()` to each controller class
- Add `@ApiOperation({ summary })` to each handler method
- Focus on: Health, Auth, CRUD, SubAgents, Devices, Flows

**Step 3: Convert key DTOs from interfaces → classes with `@ApiProperty()`**
- Focus on DTOs that are request bodies or response shapes

**Files to modify:**
- `services/api/src/main.ts` — SwaggerModule.setup
- All controller files — `@ApiTags()`, `@ApiOperation()`
- DTO files — `@ApiProperty()`

---

### 3. Auth — fix core auth pipeline
This is the most critical change. Current auth is completely broken (no enforcement, forgeable tokens).

**Approach:** Don't try to retrofit Passport.js everywhere at once. Fix the base64 token to have proper verification, then add a global guard.

**Step 1: Fix token generation + validation**
- Replace `Buffer.from(JSON.stringify({...})).toString('base64')` with HMAC-signed tokens using `crypto.createHmac`
- Secret from env var `KELEDON_AUTH_SECRET`
- Keep same API surface (`authorization: Bearer <token>`) — existing clients won't break
- Add `validateToken(token)` method that verifies HMAC + expiry

**Step 2: Enable AuthGuard**
- Update `guards/auth.guard.ts` to actually validate the Bearer token
- For now, return `403 Forbidden` for invalid/missing tokens
- Whitelist public endpoints: `/health`, `/auth/login`, `/auth/register`, `/auth/google*`

**Step 3: Add `@Public()` decorator**
- `@SetMetadata('isPublic', true)` helper
- AuthGuard checks for `isPublic` metadata before rejecting

**Files to create:**
- `services/api/src/guards/public.decorator.ts`

**Files to modify:**
- `services/api/src/guards/auth.guard.ts` — real validation
- `services/api/src/auth-local/auth-local.service.ts` — HMAC signing
- `services/api/src/main.ts` — register AuthGuard as global guard
- Public endpoints — add `@Public()` decorator

---

### 4. Audit — connect AuditLog to CRUD operations
**Step 1: Create audit interceptor**
- NestJS interceptor that auto-logs `POST`/`PUT`/`DELETE` operations
- Captures: userId (from request), action (create/update/delete), entity (from route), entityId (from route params), changes (req.body diff), ipAddress, userAgent

**Step 2: Register interceptor globally in AppModule**
- Or apply selectively to CrudController

**Step 3: Enhance GET /audit-logs with filtering**
- Add filters: action, entity, date range, pagination

**Files to create:**
- `services/api/src/audit/audit.interceptor.ts`
- `services/api/src/audit/audit.module.ts`

**Files to modify:**
- `services/api/src/app.module.ts` — register audit interceptor
- `services/api/src/crud/crud.controller.ts` — enhance audit-logs endpoint

---

### 5. Register dead controllers
`AnalyticsController` and `RBACAnalysisController` are defined with routes but **not imported in AppModule**. Either register them or document why they're dormant.

**Files to modify:**
- `services/api/src/app.module.ts` — add AnalyticsModule, RbacModule imports

---

## Execution Order

1. `main.ts` — Swagger UI setup (5 min, high visibility)
2. AuthGuard fix + `@Public()` decorator (30 min)
3. Token signing fix (20 min)
4. Audit interceptor + module (30 min)
5. Swagger decorators on controllers (15 min per controller)
6. Register dead controllers (5 min)
7. Versioning prefix (optional — assess client impact first)

## Testing
- `/health` remains public (whitelisted)
- All existing routes accessible with valid token
- Auth returns 403 for missing/invalid tokens
- CRUD operations create audit log entries
- Swagger UI at `/api/docs` returns HTML
- `/health/detailed` includes audit log count or status

## Rollback
If auth enforcement breaks clients, deploy without the global AuthGuard and keep only the token signing fix (non-breaking). Versioning prefix can be rolled back by reverting main.ts.

## Open Questions
1. URL-prefix versioning (`/api/v1/`) — will break existing browser extension. Accept header-based versioning instead?
2. AuthGuard enforcement — aggressive (all endpoints locked) or staged (CRUD only first)?
3. `AnalyticsController` — register or document as intentionally dormant?
