# KELEDON — CANONICAL MASTER SPEC V2 (MVP)

## Status
**IMMUTABLE LAW — V2**

Este documento es la **única fuente de verdad** para KELEDON MVP.
Reemplaza todos los specs anteriores de V1.

Versión: 2.0
Fecha: 2026-03-22

---

## 1. IDENTIDAD

KELEDON es un **agente de voz autónomo inbound** que opera a través de una extensión de Chrome.

Su único propósito es:

1. Recibir llamadas WebRTC entrantes
2. Procesar audio en tiempo real (STT → Cloud → TTS)
3. Ejecutar automatización RPA determinística en el navegador
4. Producir traces auditables completos

**Si no es real, no cuenta.**

---

## 2. LEY PRIMERA

> **"Cloud decides. Agent executes."**

**Solo existe un agente real: el Cloud Brain.**

La extensión del navegador es:
- Superficie de ejecución + I/O
- Nunca un sistema de razonamiento
- Nunca dueña de policy/intent

La decisión nunca ocurre en el browser.

---

## 3. RUNTIME LOOP (CANÓNICO)

```
USER SPEAK → STT (VOSK) → CLOUD BRAIN → DECISION → RPA/TTS → USER HEARS
     ↓            ↓            ↓              ↓          ↓           ↓
  Browser      WebSocket    Vector       Deterministic  Agent     Browser
               VOSK:9091    Grounding    Commands       Exec      Audio Out
```

### 3.1 Secuencia Completa

1. **LISTEN**: Browser captura audio del micrófono
2. **TRANSCRIBE**: Audio enviado via WebSocket a VOSK server (puerto 9091)
3. **THINK**: Cloud recibe texto, hace retrieval en Qdrant, razona con LLM
4. **DECIDE**: Cloud selecciona flow y genera comandos
5. **ACT**: Si hay RPA steps, agent los ejecuta en el DOM
6. **RESPOND**: Cloud envía comando TTS
7. **SPEAK**: Browser sintetiza audio y lo reproduce
8. **LOOP**: Vuelve al paso 1

---

## 4. STACK TECNOLÓGICO CANÓNICO

### 4.1 Servicios (Monodocker en Railway)

| Servicio | Tech | Puerto interno | Props |
|----------|------|----------------|-------|
| **Backend** | NestJS | 3001 | Cloud Brain |
| **Frontend** | React + Vite | 8080 (nginx) | Admin UI |
| **Database** | Prisma + PostgreSQL | 5432 | Railway Postgres |
| **Vector Store** | Qdrant | 6333 | Semantic search |
| **Cache** | Redis | 6379 | Session state |
| **VOSK STT** | Node.js server | 9090 (HTTP) / 9091 (WS) | Speech recognition |
| **OTel** | Collector | 4318 | Tracing |
| **Grafana** | Dashboards | 3000 | Metrics |

### 4.2 VOSK como STT Primary

**Arquitectura**: VOSK corre como servidor HTTP/WS dentro del mismo contenedor.

```
Agent Extension → WebSocket → VOSK Server (:9091)
                                      ↓
                              Modelos en disco
                              - vosk-model-small-en-us-0.15
                              - vosk-model-small-es-0.42
```

**Configuración**:
- `VOSK_PORT=9090`
- `VOSK_WS_PORT=9091`
- `VOSK_MODEL_PATH=/app/models`
- `VOSK_SAMPLE_RATE=16000`

**Selección de modelo por idioma**:
- Inglés (default): `vosk-model-small-en-us-0.15`
- Español: `vosk-model-small-es-0.42`
- Otros idiomas: agregar modelo según necesidad

### 4.3 Feature Flags (TODOS TRUE para MVP)

```
ENABLE_REAL_STT=true          # VOSK server activo
ENABLE_REAL_TTS=true          # ElevenLabs o Web Speech API
ENABLE_RPA=true               # Playwright DOM automation
ENABLE_VECTOR_STORE=true      # Qdrant retrieval
ENABLE_REAL_AUTH=true         # JWT/Google OAuth
ENABLE_OTEL=true             # OpenTelemetry tracing
```

**No hay fallbacks a "mock" en producción. Si algo no funciona, se arregla.**

### 4.4 Providers STT/TTS

| Provider | Tipo | Prioridad | Costo |
|----------|------|-----------|-------|
| **VOSK Server** | Local (HTTP/WS) | **PRIMARY** | Gratis |
| Web Speech API | Browser built-in | Fallback | Gratis |
| Deepgram | Cloud | Opcional | Pagado |

| Provider | Tipo | Prioridad | Costo |
|----------|------|-----------|-------|
| ElevenLabs | Cloud | **PRIMARY** | Pagado |
| Web Speech API | Browser built-in | Fallback | Gratis |

---

## 5. DATA LAYER

### 5.1 Regla Absoluta

> **Supabase está DEPRECATED. No existe en el canon.**

### 5.2 Configuración Canónica

```
DATABASE_URL=postgresql://user:pass@host:5432/keledon
PROVIDER=postgresql
VECTOR_STORE_PROVIDER=qdrant
```

### 5.3 Schema

Prisma schema en `cloud/prisma/schema.prisma`:
- provider: `postgresql` (NO sqlite)
- url: `env("DATABASE_URL")`

### 5.4 Tablas Requeridas (MVP)

```
- Company
- Brand
- Team (con stt_provider, vosk_config, tts_config)
- User
- Session
- Event
- Agent
- ManagedInterface
- TeamInterface
- Workflow
- FlowDefinition
- FlowRun
- FlowRunEvidence
- KnowledgeBase
- KnowledgeDocument
- AuditLog
- ProviderCatalog
- TenantProviderConfig
- TenantVoiceProfile
```

---

## 6. CONTRATOS DE COMUNICACIÓN

### 6.1 Agent → Cloud (Eventos)

**WebSocket endpoint**: `ws://host:3001/agent`

```json
{
  "session_id": "string",
  "event_type": "text_input | ui_result | system",
  "payload": {}
}
```

**Event type: text_input** (STT output)
```json
{
  "text": "string",
  "confidence": 0.0,
  "is_final": true
}
```

**Event type: ui_result** (RPA execution)
```json
{
  "step_id": "string",
  "status": "success | failure",
  "evidence": "string"
}
```

**Event type: system**
```json
{
  "type": "call_started | call_ended | error",
  "details": "string"
}
```

### 6.2 Cloud → Agent (Comandos)

**WebSocket endpoint**: `ws://host:3001/agent`

```json
{
  "say": {
    "text": "string",
    "interruptible": true
  },
  "ui_steps": ["step_id_1", "step_id_2"],
  "confidence": 0.0,
  "mode": "normal | safe",
  "decision_id": "string",
  "trace_id": "string"
}
```

### 6.3 VOSK STT Contract

**WebSocket endpoint**: `ws://host:9091`

```json
// Cliente → Servidor
{ "type": "config", "language": "en" }
{ "type": "reset" }

// Binario: audio PCM 16kHz mono

// Servidor → Cliente
{ "type": "ready", "sampleRate": 16000 }
{ "type": "partial", "text": "partial transcript" }
{ "type": "result", "text": "final transcript", "confidence": 0.95 }
{ "type": "error", "error": "message" }
```

### 6.4 RPA Step Definition

```json
{
  "step_id": "string",
  "action": "click | type | select | wait | scroll | hover",
  "selector": "css_selector",
  "value": "optional_value",
  "timeout": 5000
}
```

---

## 7. DEPLOYMENT (RAILWAY)

### 7.1 Monodocker

Todo corre en **un solo contenedor Docker** deployado en Railway.

### 7.2 Dockerfile Structure

```dockerfile
FROM node:20-bookworm AS builder
# Build frontend (landing)
# Build backend (cloud)

FROM node:20-bookworm-slim
# Copy frontend dist (nginx)
# Copy backend dist + node_modules
# Copy Prisma schema
# Copy VOSK models
# Copy Qdrant binary
# Entrypoint: start.sh
```

### 7.3 start.sh Sequence

```
1. Start Qdrant on 127.0.0.1:6333
2. Wait for Qdrant ready
3. Run prisma db push
4. Seed Qdrant collection
5. Start VOSK server on 127.0.0.1:9090/9091
6. Wait for VOSK ready
7. Start backend on 127.0.0.1:3001
8. Wait for backend ready
9. Start nginx on 8080
```

### 7.4 Environment Variables (Railway)

```bash
NODE_ENV=production
PORT=8080
BACKEND_PORT=3001
DATABASE_URL=postgresql://...
KELEDON_ENV_TIER=PRODUCTION_MANAGED
KELEDON_QDRANT_URL=http://127.0.0.1:6333
VOSK_PORT=9090
VOSK_WS_PORT=9091
VOSK_MODEL_PATH=/app/models
ELEVENLABS_API_KEY=...
OPENAI_API_KEY=...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
```

### 7.5 Health Check

```bash
curl http://127.0.0.1:8080/health
```

Debe responder con status de todos los servicios.

---

## 8. AGENT EXTENSION (BROWSER)

### 8.1 Ubicación

```
agent/
├── manifest/           # MV3
├── src/
│   ├── audio/
│   │   ├── stt/
│   │   │   └── vosk.adapter.ts    # WebSocket client for VOSK
│   │   ├── tts/
│   │   │   └── elevenlabs.adapter.ts
│   │   └── vad/
│   ├── core/
│   │   ├── session.manager.ts
│   │   ├── websocket.client.ts
│   │   └── routing/
│   ├── rpa/
│   │   ├── executor.ts
│   │   └── adapters/
│   ├── background/
│   └── ui/
└── extension/          # Production build
```

### 8.2 STT Adapter (VOSK)

```typescript
class VoskSttAdapter {
  private ws: WebSocket;
  
  connect(url: string): Promise<void>;
  sendAudioChunk(audioData: ArrayBuffer): void;
  onTranscript(callback: (text: string, confidence: number) => void): void;
  disconnect(): void;
}
```

### 8.3 Session Manager

```typescript
class SessionManager {
  createSession(teamId: string): Promise<Session>;
  endSession(sessionId: string): void;
  sendEvent(event: AgentEvent): void;
  receiveCommand(): Promise<AgentCommand>;
}
```

---

## 9. CLOUD BRAIN (BACKEND)

### 9.1 Estructura

```
cloud/src/
├── main.ts                    # Entry point
├── app.module.ts              # Root module
├── config/
│   └── config.service.ts      # Environment config
├── prisma/
│   └── prisma.service.ts      # Database access
├── gateways/
│   └── agent.gateway.ts       # WebSocket agent handler
├── listening-sessions/
│   ├── listening.gateway.ts   # VOSK session gateway
│   ├── listening-session.service.ts
│   └── vosk.worker.js         # DEPRECATED - usar server externo
├── rag/
│   ├── rag.service.ts         # Vector retrieval
│   └── rag.controller.ts
├── services/
│   ├── decision-engine.service.ts
│   ├── tts.service.ts
│   └── ui-automation.service.ts
└── observability/
    └── otel.ts
```

### 9.2 Decision Engine

```typescript
class DecisionEngineService {
  async decide(input: TextInput, context: SessionContext): Promise<Decision> {
    // 1. Retrieve from Qdrant
    const context = await this.ragService.retrieve(input.text);
    
    // 2. Generate response with LLM
    const response = await this.openaiService.generate(prompt);
    
    // 3. Select flow (if RPA needed)
    const flow = await this.selectFlow(response);
    
    // 4. Return command
    return {
      say: response.text,
      ui_steps: flow?.steps || [],
      confidence: response.confidence,
      decision_id: uuid(),
      trace_id: trace.currentSpanId()
    };
  }
}
```

---

## 10. OBSERVABILIDAD

### 10.1 OpenTelemetry (Obligatorio)

```typescript
// Spans requeridos
keledon.vector.retrieve   // Qdrant search
keledon.policy.check      // Policy validation  
keledon.decide            // Decision made
keledon.command.emit      // Command sent to agent
keledon.agent.exec        // Agent execution
keledon.stt.transcribe    // VOSK transcription
keledon.tts.speak         // TTS synthesis
```

### 10.2 Evidence Requerida

Cada decisión debe producir:
- `decision_id` - UUID de la decisión
- `trace_id` - Span ID del trace
- Timestamps en todos los eventos
- Correlation entre Cloud decision y Agent execution

---

## 11. RBAC (Role-Based Access Control)

### 11.1 Roles

| Rol | Permisos |
|-----|----------|
| **superadmin** | Full access, todas las empresas |
| **admin** | Full access a su empresa |
| **team_lead** | Modificar settings de su team |
| **user** | Solo uso del agent |

### 11.2 Permisos de Equipos

Cada Team puede configurar:
- `stt_provider`: vosk | deepgram | webspeech
- `tts_provider`: elevenlabs | webspeech
- `vosk_server_url`: URL del servidor VOSK
- `vosk_model`: Modelo a usar por idioma

---

## 12. DIRECTORIO DE PUERTOS

| Puerto | Servicio | Uso |
|--------|----------|-----|
| 3001 | Backend NestJS | Cloud Brain API |
| 5432 | PostgreSQL | Database (Docker local) |
| 6333 | Qdrant | Vector Store HTTP |
| 6334 | Qdrant | Vector Store gRPC |
| 6379 | Redis | Session Cache |
| 8080 | Nginx | Frontend + Reverse Proxy |
| 9090 | VOSK HTTP | STT HTTP endpoint |
| 9091 | VOSK WS | STT WebSocket |
| 16686 | Jaeger | Trace UI |
| 3000 | Grafana | Metrics |
| 4318 | OTEL | Trace export |

---

## 13. DEPRECATED / FORBIDDEN

### 13.1 Deprecated

- `supabase` (código en `supabase-clean/`, `temp-deploy/`)
- SQLite como database provider
- Feature flags en `false`
- Worker threads para VOSK (usar servidor HTTP)

### 13.2 Forbidden

- Browser-side intent/policy decisions
- Cloud-side UI manipulation
- Simulated success paths
- Silent fallbacks
- Optional vector usage
- localhost/loopback en producción

### 13.3 Limpieza Requerida

```
cloud/src/supabase-clean/     → DELETE
cloud/src/temp-deploy/        → DELETE
cloud/src/auth-old/           → DELETE
cloud/src/phase3/             → DELETE (legacy)
```

---

## 14. GOVERNANCE

### 14.1 Roles

**Human**:
- Pull `main`
- Run system
- Report works/broken

**Execution Agent**:
- Branch from `main`
- Implement features
- Open PRs
- NO merge to main

**PR Master**:
- Merge PRs to `main`
- Build and test
- Declare READY/NOT READY

### 14.2 Branch Law

- `main` = última versión integrada y testeable
- Feature branches = trabajo en progreso
- NO commits directos a `main`

### 14.3 Readiness Gate

**READY** si y solo si:
1. `main` builds sin fixes manuales
2. `main` starts sin crashes
3. Input real produce output real
4. Cloud-side vector-grounded decisioning
5. VOSK server funcional
6. TTS produce audio real
7. RPA ejecuta acciones reales
8. `npm run proof:c12:local` PASSES

---

## 15. PROOF OF LIFE

### 15.1 Test Script

```bash
npm run proof:c12:local
```

Debe verificar:
- VOSK server responde en :9091
- Qdrant tiene collection `keledon`
- Database Prisma connecta
- WebSocket agent connecta
- Trace completo de decisión

### 15.2 Runtime Evidence

```
[STT] Connected to VOSK ws://localhost:9091
[STT] Model loaded: vosk-model-small-en-us-0.15
[VOSK] Transcription: "Hello"
[Cloud] Retrieved 3 context chunks
[Cloud] Decision ID: abc-123
[Cloud] Trace ID: xyz-789
[Cloud] Command: say{text: "Hello! How can I help?"}
[TTS] Speaking: "Hello! How can I help?"
[Agent] UI Steps: []
[Trace] keledon.decide: abc-123
[Trace] keledon.command.emit: abc-123
[Trace] keledon.agent.exec: abc-123
```

---

## 16. CHECKLIST DE IMPLEMENTACIÓN

### Fase 1: Core Infrastructure ✅
- [x] Limpiar código Supabase
- [x] Configurar Prisma para PostgreSQL
- [x] Verificar Qdrant en start.sh
- [x] seed-qdrant.ts script creado

### Fase 2: VOSK Server ✅
- [x] Integrar vosk-server en Dockerfile
- [x] Incluir modelos en-v y es
- [x] Configurar ports 9090/9091
- [x] Health check de VOSK

### Fase 3: Agent Extension ✅
- [x] VoskSttAdapter (WebSocket client)
- [x] CloudConnection actualizado para usar eventos correctos
- [ ] TTS adapter (ElevenLabs) - necesita integración en extensión
- [ ] RPA executor - código existe pero necesita integración

### Fase 4: Cloud Brain ✅
- [x] Decision engine con RAG (requiere Qdrant con datos)
- [x] TTS service (Endpoint POST /tts/speak)
- [ ] UI automation service - código existe en browser, no cloud
- [x] OpenTelemetry spans

### Fase 5: Integration
- [x] Dashboard: usuario en Recent Live Activity ✅
- [ ] End-to-end test
- [ ] npm run proof:c12:local
- [ ] Railway deployment (auto-deploy en push)
- [ ] Smoke test en producción

---

**End of KELEDON Canonical Master Spec V2 (MVP)**
