# KELEDON — CRUD Canonical Specification

## Status
**CANONICAL LAW — CRUD OPERATIONS**

This document defines the standards for all CRUD operations in KELEDON.

---

## 1. Architecture Overview

### 1.1 Data Model Hierarchy
```
Company (1) ──< Brand (N) ──< Team (N) ──< User (N)
                                     └──< Agent (N)
```

### 1.2 Entity Relationships

| Entity | Parent | Children | Direct FKs |
|--------|--------|----------|------------|
| Company | - | Brand, User | - |
| Brand | Company | Team | `companyId` |
| Team | Brand | User, Agent | `brandId` |
| User | Company, Team | Agent (as owner) | `companyId`, `teamId` |
| Agent | Team | - | `teamId`, `userId` (owner) |

### 1.3 Derived Fields

Fields that are NOT stored but DERIVED from relationships:

| Entity | Derived Field | Source |
|--------|--------------|--------|
| User | `brandId` | `team.brandId` |
| Agent | `companyId` | `team.brand.companyId` |
| Agent | `brandId` | `team.brandId` |
| Team | `companyId` | `brand.companyId` |

---

## 2. Prisma Query Standards

### 2.1 Golden Rules

1. **Use `select` for relations** - Only fetch fields you need
2. **Never mix `include` + `select` on same level** - Prisma's `include` overrides `select`
3. **Use `where` for database filtering** - NOT JavaScript `.filter()`
4. **Derive fields in JavaScript after query** - Explicit, readable

### 2.2 Correct Pattern

```typescript
// CORRECT - Using select for relations
async getUsers(companyId?: string) {
  return this.prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      companyId: true,
      teamId: true,
      company: { select: { id: true, name: true } },
      team: {
        select: {
          id: true,
          name: true,
          brandId: true,
          brand: { select: { id: true, name: true } }
        }
      }
    },
    where: companyId ? { companyId } : undefined,
    orderBy: { name: 'asc' }
  });
}
```

### 2.3 Deriving Fields After Query

```typescript
return users.map(u => ({
  ...u,
  brandId: u.team?.brandId || undefined
}));
```

---

## 3. API Response Contracts

### 3.1 User Response
```typescript
interface User {
  id: string;
  email: string;
  name?: string;
  role: string;
  companyId?: string;
  teamId?: string;
  brandId?: string;        // DERIVED from team.brandId
  isOnline?: boolean;
  createdAt?: string;
  updatedAt?: string;
  company?: { id: string; name: string };
  team?: { id: string; name: string; brandId?: string; brand?: { id: string; name: string } };
}
```

### 3.2 Team Response
```typescript
interface Team {
  id: string;
  name: string;
  brandId?: string;
  country?: string;
  sttProvider?: string;
  ttsProvider?: string;
  createdAt?: string;
  updatedAt?: string;
  company?: { id: string; name: string };  // DERIVED from brand.company
  brand?: { id: string; name: string; color?: string; companyId?: string };
}
```

### 3.3 Agent Response
```typescript
interface Agent {
  id: string;
  name: string;
  email?: string;
  role?: string;
  isActive?: boolean;
  callsHandled?: number;
  fcrRate?: number;
  avgHandleTime?: number;
  autonomyLevel?: number;
  teamId: string;
  userId?: string;
  team?: {
    id: string;
    name: string;
    brandId?: string;
    brand?: { id: string; name: true; companyId: string }
  };
  user?: { id: string; name: string; email: string };
}
```

---

## 4. Frontend API Client Standards

### 4.1 Single Source of Truth

**Only use:** `landing/src/lib/crud-api.ts`

**DELETE:** `landing/src/lib/supabase.ts` (deprecated, duplicate)

### 4.2 Field Naming Convention

| Layer | Convention | Example |
|-------|------------|---------|
| Database | snake_case | `company_id` |
| Prisma | camelCase | `companyId` |
| API Response | camelCase | `companyId` |
| Frontend Types | camelCase | `companyId` |
| Form State | camelCase | `companyId` |

### 4.3 TypeScript Interfaces

All interfaces must match API responses exactly:

```typescript
// landing/src/lib/crud-api.ts

export interface User {
  id: string;
  email: string;
  name?: string;
  role: string;
  companyId?: string;
  teamId?: string;
  brandId?: string;  // DERIVED
  isOnline?: boolean;
  createdAt?: string;
  updatedAt?: string;
  company?: { id: string; name: string };
  team?: { id: string; name: string; brandId?: string; brand?: { id: string; name: string } };
}
```

---

## 5. Auth User Object

### 5.1 Backend Returns (auth-local.controller.ts)

Auth endpoints (`/api/auth/me`, `/api/auth/login`) return:

```typescript
interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
  companyId?: string;      // camelCase
  teamId?: string;          // camelCase
  companyName?: string;
  brandName?: string;
  teamName?: string;
  createdAt?: string;
  lastSession?: string;
}
```

### 5.2 Frontend AuthContext

```typescript
// landing/src/context/AuthContext.tsx

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  companyId?: string;   // camelCase
  teamId?: string;     // camelCase
  // ...
}
```

---

## 6. Role Canonical List

All roles used in KELEDON:

```
guest      - Not authenticated
user       - Basic user
agent      - AI agent
coordinator - Team coordinator
supervisor  - Team supervisor
admin      - Company admin
superadmin  - System admin
```

---

## 7. Management Pages Standards

### 7.1 Form State

Always use camelCase for form state:

```typescript
const [formData, setFormData] = useState({
  name: '',
  email: '',
  companyId: '',   // camelCase
  brandId: '',     // camelCase
  teamId: '',      // camelCase
  role: 'user',
});
```

### 7.2 Dropdown Hierarchies

Company → Brand → Team filtering:

```typescript
const filteredBrands = brands.filter(b => b.companyId === selectedCompanyId);
const filteredTeams = teams.filter(t => t.brandId === selectedBrandId);
```

### 7.3 Brand Derivation

User/Agent forms collect `brandId` for UI dropdown cascade, but:
- **DO NOT** send `brandId` to backend for User creation
- **Backend derives** `brandId` from `team.brandId`

---

## 8. Validation Checklist

Before any PR, verify:

- [ ] All Prisma queries use `select` (not `include`) for relations
- [ ] No `include` + `select` mix on same relation level
- [ ] Filtering uses `where` clause (not JavaScript `.filter()`)
- [ ] All API client imports from `@/lib/crud-api.ts`
- [ ] TypeScript interfaces match API response shapes
- [ ] Form state uses camelCase
- [ ] User object uses `companyId`/`teamId` (not `company_id`/`team_id`)
- [ ] Derived fields calculated after query, not in Prisma

---

## 9. Anti-Patterns (Forbidden)

### 9.1 Mixed Include/Select
```typescript
// BAD - include overrides select
team: {
  select: { id: true },
  include: { brand: true }  // brand fully fetched!
}

// GOOD
team: {
  select: {
    id: true,
    brand: { select: { id: true, name: true } }
  }
}
```

### 9.2 JavaScript Filtering
```typescript
// BAD - fetches ALL records
const users = await prisma.user.findMany();
return users.filter(u => u.companyId === companyId);

// GOOD - database does the work
return prisma.user.findMany({
  where: { companyId }
});
```

### 9.3 Snake_case in Frontend
```typescript
// BAD
const [formData, setFormData] = useState({
  company_id: '',
  team_id: '',
});

// GOOD
const [formData, setFormData] = useState({
  companyId: '',
  teamId: '',
});
```

---

## 10. Version Alignment

### 10.1 Single Source of Truth

Version is defined ONCE in `docs/specs/KELEDON_CRUD_CANONICAL.md`:
```
*Version: 0.0.41*
```

### 10.2 Version Display Locations

The following 3 files MUST have the SAME version number:

| File | Constant | Line |
|------|----------|------|
| `landing/src/pages/LoginPage.tsx` | `APP_VERSION` | 7 |
| `landing/src/components/layout/Sidebar.tsx` | Hardcoded | 86 |
| `landing/src/lib/debug-report.ts` | `version` | 90 |

### 10.3 Version Bump Checklist

When incrementing version, update ALL THREE:

```bash
# LoginPage.tsx
const APP_VERSION = '0.0.42';
const BUILD_TIME = 'YYYY-MM-DDTHH:00:00Z';

# Sidebar.tsx (line ~86)
<span className="text-[10px] text-muted-foreground">v0.0.42</span>

# debug-report.ts (line ~90)
const version = 'v0.0.42';

# KELEDON_CRUD_CANONICAL.md (at bottom)
*Version: 0.0.42*
```

---

## 11. Session Management

### 11.1 Session Lifecycle

Sessions must follow this lifecycle:

```
created → active → ended
              ↓
           paused (optional)
```

### 11.2 Session End Rules

**MANDATORY**: Sessions MUST be marked as `ended` when:
- Agent disconnects from WebSocket
- Session is explicitly terminated
- Session is stale (>24 hours with no activity)

### 11.3 Session Cleanup

| Trigger | Action |
|---------|--------|
| Agent disconnect | End session immediately |
| Startup (PrismaService) | Clean orphaned sessions (>24h active) |
| Periodic (hourly) | Clean orphaned sessions (>24h active) |

### 11.4 Anti-Seed Rules

**FORBIDDEN** in production data:
- No demo, mock, or sample sessions
- No hardcoded fake data in API responses
- No random number generators for real metrics
- No "test" prefixes in production data

All session data must come from actual agent interactions.

---

## 12. File Reference

| Purpose | File Path |
|---------|-----------|
| Backend CRUD Service | `cloud/src/crud/crud.service.ts` |
| Backend CRUD Controller | `cloud/src/crud/crud.controller.ts` |
| Prisma Schema | `cloud/prisma/schema.prisma` |
| Prisma Service | `cloud/src/prisma/prisma.service.ts` |
| Session Service | `cloud/src/services/session.service.ts` |
| Agent Gateway | `cloud/src/gateways/agent.gateway.ts` |
| Frontend API Client | `landing/src/lib/crud-api.ts` |
| Auth Context | `landing/src/context/AuthContext.tsx` |
| Auth Controller | `cloud/src/auth-local/auth-local.controller.ts` |

---

*Last Updated: 2026-03-22*
*Version: 0.0.42*
