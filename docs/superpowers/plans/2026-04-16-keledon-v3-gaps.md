# KELEDON V3 Gap Implementation Plans

> **For agentic workers:** Implementation plans for key missing features

**This document contains 3 sub-plans:**

---

# Plan A: OpenAI LLM Integration to Decision Engine

**Location:** `docs/superpowers/plans/2026-04-16-llm-integration.md`

---

# Plan B: Session Persistence to PostgreSQL

**Location:** `docs/superpowers/plans/2026-04-16-session-persistence.md`

---

# Plan C: Escalation Logging to Database

**Location:** `docs/superpowers/plans/2026-04-16-escalation-logging.md`

---

## Summary

| Plan | Priority | Files to Create/Modify |
|------|----------|------------------------|
| A: LLM Integration | P0 | `cloud/src/llm/`, update `decision-engine.service.ts` |
| B: Session Persistence | P0 | `cloud/prisma/schema.prisma`, update services |
| C: Escalation Logging | P1 | New model, update device.gateway.ts |

---

## Execution Strategy

Use **subagent-driven-development** with fresh subagents for each task:
- Task 1: LLM Service creation
- Task 2: Wire LLM to decision engine
- Task 3: Add Session model to Prisma
- Task 4: Implement session persistence
- Task 5: Add escalation logging

Each task should be testable independently before proceeding.