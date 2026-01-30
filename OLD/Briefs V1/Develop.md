KELEDON is a voice AI assistant system with these key components:

Architecture: "Cloud Decides, Agent Executes" - Cloud handles intelligence, Chrome Extension handles execution

Main Parts:

Agent: Chrome extension (React) for voice I/O and browser automation

Cloud: NestJS backend with STT (Deepgram), LLM (OpenAI), TTS (ElevenLabs)

Landing: React frontend for admin/settings

Core Features:

Real-time voice-to-voice conversations

Browser automation via deterministic "Flows" (JSON action sequences)

RAG knowledge base (Qdrant)

WebSocket communication

Project Structure:

agent/ - Chrome extension source

cloud/ - NestJS backend services

landing/ - React admin frontend

Various deployment and documentation files

The system follows strict separation: Cloud makes all decisions, Agent just executes predefined automation flows.



## Estructura de repo recomendada (monorepo)

```
keledon/
  agent/                 # Browser extension (runtime + módulos locales)
  cloud/                 # Backend + brain + APIs + workers
  infra/                 # IaC/containers/terraform/helm (deploy)
  contracts/             # Esquemas versionados (JSON Schema / OpenAPI) — CANÓNICO
  docs/                  # Arquitectura, diagramas, runbooks, ADRs
  tools/                 # scripts de dev, generators, fixtures
```

### Por qué así

* **`contracts/` es el “punto de verdad”**: todos codegen/validan desde ahí.
* `agent/` y `cloud/` se pueden desarrollar en paralelo con mocks.

---

# 1) `/agent` — El plugin (Browser Extension)

> Contiene **todo lo que corre local**: runtime, STT/TTS adapters, UI executor, multi-tab.

```
agent/
  manifest/              # MV3 manifest + permissions, host_permissions
  src/
    core/                # Runtime: session manager, websocket client, routing
    config/              # Feature flags, provider config (local vs cloud), env
    audio/
      stt/               # STT adapter interface + implementations (local/cloud)
      tts/               # TTS adapter interface + implementations (local/cloud)
      vad/               # Voice Activity Detection (opcional pero útil)
    rpa/
      executor/          # Step runner (deterministic), post-condition checks
      adapters/          # Per-domain logic (Genesys, Salesforce, etc.)
      selectors/         # Selector maps + fallbacks + resilience utilities
    tabs/
      registry/          # Tab discovery, role assignment (audio+ui vs ui-only)
      messaging/         # runtime <-> content scripts messaging
    content_scripts/
      genesys/           # DOM hooks & capabilities for Genesys pages
      salesforce/        # DOM hooks & capabilities for Salesforce pages
      shared/            # Common DOM utilities
    background/          # Service worker: lifecycle, auth refresh, ws keepalive
    ui/                  # Extension UI: popup/options (config + permissions UX)
    logging/             # Local logs, redaction, event buffering
  tests/
  package.json
```

### Qué “vive” aquí (en tus palabras)

* **TTS, STT y RPA**: sí, *como módulos del runtime del agente*.
* El RPA puede correr en **Genesys** y en **Salesforce** porque en realidad corre **en cada tab**, con el runtime coordinando.

### Qué NO vive aquí

* Lógica de negocio (qué hacer).
* RAG / Qdrant.
* Máquina de estados.

---

# 2) `/cloud` — Backend + Brain + Vector Store access

> Aquí vive el “cerebro”: orquesta, decide, consulta memoria, audita.
> Qdrant está “cerca”, pero no mezclado con lógica de app en el mismo folder.

```
cloud/
  api/                   # REST endpoints (admin, config, auth, projects)
  realtime/              # WebSocket gateway (sessions, streaming events)
  brain/
    orchestrator/        # State machine / LangGraph (si aplica)
    intents/             # Intent normalization, schemas
    policies/            # Guardrails, confidence, safe-mode rules
    prompts/             # Prompt templates (si se usan) + versions
    routing/             # Config decides which internal modules run
  rag/
    ingestion/           # Chunking, cleaning, metadata enforcement
    retrieval/           # Query embedding + Qdrant search + rerank (si aplica)
    embeddings/          # Embedding provider abstraction
  vectorstore/
    qdrant/              # Qdrant client wrapper, collections, migrations
  storage/
    documents/           # S3-compatible docs store access
    transcripts/         # Session artifacts store (not Qdrant)
  audit/
    events/              # Event log pipeline (append-only)
    replay/              # Tools to replay sessions
  auth/                  # JWT/OAuth2, roles, tenant isolation
  workers/               # Async jobs: ingestion, summarization, compaction
  observability/         # OpenTelemetry, structured logging
  tests/
  package.json
```

### Qdrant “vive en cloud”, pero **aislado**

* El **cliente de Qdrant** y sus colecciones/migraciones deberían estar en `cloud/vectorstore/qdrant/`.
* La lógica de RAG (cómo se trocean docs, qué filtros, qué query) en `cloud/rag/`.

Así no terminas con “Qdrant por todos lados”.

---

# 3) `/contracts` — Donde se “tocan” (CANÓNICO)

> Si solo haces una cosa bien: **esto**.

```
contracts/
  v1/
    brain/
      event.schema.json          # Agent->Cloud canonical ingress
      command.schema.json        # Cloud->Agent canonical command
    audio/
      text_input.schema.json     # STT output
      speak.schema.json          # TTS input
    rpa/
      step.schema.json           # UI step definition
      result.schema.json         # UI step execution result
    openapi/
      admin.openapi.yaml         # Admin REST APIs
    ws/
      realtime.schema.json       # WS event envelope
```

**Regla:** `agent/` y `cloud/` importan estos schemas y validan en runtime/test.

---

# 4) Touchpoints exactos (dónde se conectan)

## Touchpoint A — Ingreso único al cerebro (Agent → Cloud)

* **WS o HTTP**, pero contractualmente es “Brain Event”.
* Ruta conceptual: `POST /brain/event` (aunque en realtime sea WS).

Eventos típicos:

* `text_input` (del STT local)
* `ui_state` / `ui_result` (del RPA)
* `system` (call_started, call_ended, errors)

## Touchpoint B — Comando del cerebro (Cloud → Agent)

El Cloud responde con:

* `say { text, interruptible }`
* `ui_steps []`
* `confidence`
* `mode` (normal/safe)

## Touchpoint C — RAG/Qdrant (solo interno Cloud)

* `brain` → `rag/retrieval` → `vectorstore/qdrant`
  El agente **no existe** para Qdrant.

## Touchpoint D — Admin/Config (Cloud REST)

* La extensión puede pedir:

  * config por tenant
  * feature flags (STT local vs cloud, TTS local vs cloud)
  * allowed domains / permissions manifests
    Eso es REST estable.

---

# 5) “RPA donde escucha” vs “RPA donde está Salesforce”

Esto se resuelve en `/agent/tabs/registry` + `/agent/rpa/adapters`.

* Una tab puede tener rol `audio+ui` (Genesys)
* Otra tab `ui-only` (Salesforce)
* Ambas reportan eventos por el mismo WebSocket/session.

El Cloud solo ve “executor_id/tab_role” como metadata si lo quieres, pero no depende de eso.

---

## Reglas prácticas para que nadie se dispare en el pie

* **Nada cruza directo de `agent/` a `cloud/` sin pasar por `contracts/`.**
* **`cloud/brain` no importa código de `cloud/rag`** (solo interfaces), para mantener testabilidad.
* **`agent/rpa` jamás decide el flujo**. Solo ejecuta pasos declarados.
* **STT/TTS son adapters** con interface estable + implementations intercambiables.




# Keledón — Development Folder Structure & Execution Brief

## Purpose

This brief defines **how the Keledón codebase is structured**, what **lives in each folder**, how the different parts **connect to each other**, and **where the official touchpoints are**.

The goal is to allow **parallel development** without chaos:

* Multiple developers or teams working at the same time
* Clear ownership of folders
* Stable contracts between components
* No implicit coupling or hidden dependencies

This document is meant to be used as a **hands-on development guide**, not a conceptual overview.

---

## Repository Strategy

Keledón should be developed as a **monorepo** with strict internal boundaries.

```
keledon/
  agent/
  cloud/
  contracts/
  infra/
  docs/
  tools/
```

The **contracts folder is canonical**. Nothing talks to anything else without going through it.

---

## 1. /agent — Browser Agent (Extension Runtime)

The `agent` folder contains **everything that runs inside the browser**.

This is the execution layer. It does not decide business logic.

```
agent/
  manifest/
  src/
    core/
    config/
    audio/
      stt/
      tts/
      vad/
    rpa/
      executor/
      adapters/
      selectors/
    tabs/
      registry/
      messaging/
    content_scripts/
      genesys/
      salesforce/
      shared/
    background/
    ui/
    logging/
  tests/
```

### Responsibilities

* Browser extension lifecycle (Manifest V3)
* Session management per call
* WebSocket connection to Cloud
* Routing events between local modules
* Configuration (local vs cloud STT/TTS)
* Coordinating multiple tabs (audio + UI, UI-only)

### What Lives Here

* STT adapters (local and cloud)
* TTS adapters (local and cloud)
* RPA executors for web UIs
* Multi-tab coordination logic

### What Must NOT Live Here

* Conversational logic
* Intent detection
* Business rules
* Knowledge retrieval

---

## 2. /cloud — Backend & Brain

The `cloud` folder contains **all decision-making logic**.

This is the brain of Keledón.

```
cloud/
  api/
  realtime/
  brain/
    orchestrator/
    intents/
    policies/
    prompts/
    routing/
  rag/
    ingestion/
    retrieval/
    embeddings/
  vectorstore/
    qdrant/
  storage/
    documents/
    transcripts/
  audit/
    events/
    replay/
  auth/
  workers/
  observability/
  tests/
```

### Responsibilities

* Single ingress for all agent events
* Conversational state machine
* Intent normalization
* Flow orchestration
* Policy enforcement and safety modes
* Retrieval-Augmented Generation (RAG)
* Auditing, replay, and traceability

### Qdrant Placement

* Qdrant access lives in `cloud/vectorstore/qdrant`
* RAG logic lives in `cloud/rag`
* No other folder talks directly to Qdrant

---

## 3. /contracts — Canonical Interfaces (Critical)

The `contracts` folder defines **how all parts of the system talk to each other**.

This folder is the **source of truth**.

```
contracts/
  v1/
    brain/
      event.schema.json
      command.schema.json
    audio/
      text_input.schema.json
      speak.schema.json
    rpa/
      step.schema.json
      result.schema.json
    ws/
      realtime.schema.json
    openapi/
      admin.openapi.yaml
```

### Rules

* Both `agent` and `cloud` must validate against these schemas
* No ad-hoc payloads
* Any change requires a version bump

---

## 4. /infra — Infrastructure & Deployment

```
infra/
  docker/
  terraform/
  helm/
```

Contains:

* Container definitions
* Cloud infrastructure
* Qdrant deployment
* Networking and secrets

No application logic lives here.

---

## 5. /docs — Architecture & Decisions

```
docs/
  architecture/
  diagrams/
  adr/
  runbooks/
```

Used for:

* Architecture Decision Records (ADRs)
* Diagrams
* Operational documentation

---

## 6. Touchpoints (Where Systems Meet)

### Touchpoint A — Agent → Cloud (Single Ingress)

* Conceptual endpoint: `POST /brain/event`
* Used for:

  * Text input (from STT)
  * UI execution results (from RPA)
  * System events

### Touchpoint B — Cloud → Agent (Commands)

* Conversational output (`say`)
* UI steps to execute
* Confidence and mode

### Touchpoint C — Cloud Internal (RAG)

* Brain → RAG → Vector Store (Qdrant)
* Never exposed to agent

### Touchpoint D — Admin & Configuration

* REST APIs from Cloud
* Feature flags
* Tenant configuration

---

## 7. Development Philosophy

* Everything is modular
* Everything is replaceable
* Contracts come before code
* Local-first execution
* Cloud-first decision-making

---

## Final Instruction

The next step is **not to code everything at once**.

Take this document and:

1. Break it down into **concrete development tasks**
2. Order those tasks by **dependency and priority**
3. Execute them **one by one**, not in parallel chaos

The system will only stay clean if it is built deliberately.
