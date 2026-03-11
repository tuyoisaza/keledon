# KELEDON — CANONICAL MASTER SPEC (Unified)

## Status
**IMMUTABLE MASTER CANON — V1**

This document consolidates and unifies the canonical truths of KELEDON V1 into a single source of operational doctrine.

When there is conflict, this file is authoritative for interpretation and execution.

---

## 1) KELEDON Identity (What it is)

KELEDON is a **cloud-first autonomous inbound voice agent system** operating through a browser runtime.

Its V1 purpose is strict and narrow:
- answer real inbound WebRTC interactions
- process real audio/text runtime events
- decide in cloud using vector-grounded context
- execute deterministic UI/RPA actions in browser
- produce auditable runtime evidence

If it is simulated, inferred, or mocked, it is out of scope.

---

## 2) Prime Law

> **Cloud decides. Agent executes.**

There is exactly one real agent:
- **Cloud Conversation Orchestrator (Brain)**

Browser runtime is:
- execution + I/O surface only
- never a reasoning system
- never policy/intent owner

---

## 3) Canonical Runtime Domains

Exactly three runtime domains exist in V1:
1. Cloud Brain
2. Browser Runtime (Chrome extension / sidepanel runtime)
3. Vector Store (required for grounding)

No parallel decision engines are valid.

---

## 4) Canonical Technology Stack

### 4.1 Required Services

| Service | Technology | Purpose | Port |
|---------|-----------|---------|------|
| **Database** | Prisma + PostgreSQL (Railway) | Persistent data, sessions, events | 5432 |
| **Vector Store** | Qdrant (Docker) | Semantic search, context grounding | 6333 |
| **Cache** | Redis (Docker) | Session state, real-time coordination | 6379 |
| **Backend** | NestJS (Node.js) | Cloud Brain, Decision Engine | 3001 |
| **Frontend** | React + Vite | Admin UI | 5173 |
| **Observability** | Jaeger + OTEL Collector | Tracing, debugging | 16686/4318 |
| **Grafana** | Grafana | Dashboards | 3000 |

### 4.2 Extension STT Providers (Priority Order)

| Provider | Type | Cost | Use Case |
|----------|------|------|----------|
| **VOSK** | Local (server) | Free | Primary STT - runs on Railway |
| Web Speech API | Browser built-in | Free | Fallback |
| Deepgram | Cloud | Paid | Optional fallback |

### 4.3 Extension TTS Providers

| Provider | Type | Cost |
|----------|------|------|
| **ElevenLabs** | Cloud | Paid (recommended) |
| Web Speech API | Browser built-in | Free (fallback) |

### 4.4 RPA (Browser Automation)

- **UI Automation Service** - Real DOM execution
- Actions: click, type, select, hover, scroll, wait
- Per-URL deterministic execution

---

## 5) Mandatory Runtime Loop

`LISTEN -> TRANSCRIBE -> THINK (Cloud + Vector) -> DECIDE -> ACT (RPA) -> RESPOND -> SPEAK -> LOOP`

Interpretation:
- Listen/Transcribe/Speak happen at runtime edge (browser execution surface)
- Think/Decide/Policy/Flow happen in Cloud only
- Act executes deterministic commands issued by Cloud

---

## 6) Data Layer Canon

- Canonical data access layer is **Prisma**.
- Production database: **Railway PostgreSQL** via Prisma.
- Local development: Docker PostgreSQL (pgvector).
- **Supabase is NOT canonical** - deprecated.

---

## 7) Contract Canon (How parts talk)

Only these contract families are valid:
1. Agent -> Cloud (events)
2. Cloud -> Agent (commands)
3. Agent -> Cloud execution evidence

### 7.1 Agent -> Cloud event envelope (canonical)
```json
{
  "session_id": "string",
  "event_type": "text_input | ui_result | system",
  "payload": {}
}
```

### 7.2 Cloud -> Agent command envelope (canonical)
```json
{
  "say": { "text": "string", "interruptible": true },
  "ui_steps": ["step_id_1"],
  "confidence": 0.0,
  "mode": "normal | safe"
}
```

Rules:
- Agent reports observations, not decisions.
- Cloud sends intent/flow commands, not browser-side logic.
- Missing required fields or silent fallbacks are invalid.

---

## 8) Vector Law

Vector retrieval is mandatory for cloud decisioning.

Each material cloud decision must:
1. retrieve grounded context from Qdrant
2. reason against that context
3. emit deterministic command(s)

If vector retrieval is bypassed, system is **NOT READY**.

---

## 9) Observability Canon (OpenTelemetry)

OpenTelemetry is **mandatory** for V1.

### 9.1 Required Components
- **Jaeger** - Trace visualization (port 16686)
- **OTEL Collector** - Span collection (port 4318)
- **Grafana** - Dashboards (port 3000)

### 9.2 Required Traces
- `keledon.vector.retrieve` - Vector search
- `keledon.policy.check` - Policy validation
- `keledon.decide` - Decision made
- `keledon.command.emit` - Command sent to extension
- `keledon.agent.exec` - Extension execution

### 9.3 C12 Proof
`npm run proof:c12:local` is the canonical runtime proof.
Must output: session_id, decision_id, trace_id

---

## 10) WebRTC Participation Law

A KELEDON agent is a valid WebRTC participant only if remote participants hear it through the meeting's own media pipeline.

Canonical model:
- pre-connection audio injection
- deterministic media track injection via browser runtime
- explicit user consent and visible runtime state

Local playback alone is not participation.

---

## 11) Team Configuration

Teams can configure their STT/TTS providers via Admin UI.

### 11.1 Configurable Per Team
- STT Provider (vosk, deepgram, webspeech)
- TTS Provider (elevenlabs, webspeech)

### 11.2 Roles
- **Admin** - Full access
- **Team Lead** - Can modify team settings

---

## 12) Startup Entrypoint (Canonical)

The canonical startup script is `start-keledon.bat` (Windows) / `dev.sh` (Linux).

### 12.1 What it starts
1. Docker: Qdrant, Redis (docker-compose.dev.v2.yml)
2. Docker: Jaeger, OTEL Collector, Grafana (docker-compose.observability.yml)
3. Backend: Cloud Brain (port 3001)
4. Frontend: Admin UI (port 5173)

### 12.2 Required Environment
- `cloud/.env.cloud.local` - Railway DATABASE_URL
- Docker Desktop running

---

## 13) Governance & Agent Roles

### Execution Agents
May:
- scan/claim issues
- plan, branch from `main`, execute scoped work
- commit, push, open PR

May not:
- work directly on `main`
- merge PRs
- declare readiness

### PR Master / Release Engineer (single)
May:
- operate on `main`
- merge selected PRs
- run integration build/start checks
- emit verdict READY/NOT READY

### Human role
- pulls `main`
- runs/tests behavior
- reports working/broken

---

## 14) Repository & Branch Law

- Canon repo: `https://github.com/tuyoisaza/keledon`
- Canon branch: `main`
- Direct commits to `main` by execution agents forbidden.
- Work is real only when: **commit + push + PR** exist.

No PR = no completion claim.

---

## 15) Readiness Gate (Binary)

Only valid verdicts:
- `VERDICT: READY`
- `VERDICT: NOT READY`

READY requires all of:
1. `main` builds without manual fixes
2. `main` starts without crashes
3. real input and real output observed
4. cloud-side vector-grounded decisioning
5. production-compatible managed posture (Prisma + Railway Postgres, Qdrant, OTel, Cloud URL)
6. no localhost/loopback dependency in production posture
7. `npm run proof:c12:local` PASSES

Any violation -> NOT READY.

---

## 16) Evidence Law

Claims do not count. Runtime evidence does.

Required evidence (minimum):
- live logs with timestamps
- command/response traceability
- auditable execution artifacts
- proof chain for cloud decision -> agent execution

Canonical runtime proof target:
- `npm run proof:c12:local`

---

## 17) Forbidden Patterns

Forbidden in V1:
- browser-side intent/policy decisions
- cloud-side UI manipulation
- simulated success paths and hidden fallbacks
- optional vector usage
- ambiguous ownership between cloud and browser
- Supabase (deprecated)

If found: fail loud, stop, fix architecture.

---

## 18) Scope Discipline

In V1, delete/simplify beats expansion.

Anything not explicitly required by this canon is out of scope until governance approves otherwise.

---

## 19) Change Policy

Changes to this master canon require:
- explicit governance issue
- human approval
- clear migration note if behavior changes

Agents may not silently alter canonical meaning.

---

## 20) Operational Self-Check

Before any major action, verify:
1. Who decides? -> Cloud only
2. Is vector grounding present? -> Must be yes
3. Is data layer canonical? -> Prisma + Railway Postgres
4. Is observability present? -> Jaeger + OTEL
5. Is branch law respected? -> yes
6. Is C12 proof passing? -> yes
7. Is claim backed by runtime evidence? -> yes

If any answer is no, do not proceed.

---

**End of KELEDON Canonical Master Spec (Unified V1)**
