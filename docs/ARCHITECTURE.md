# Architecture Overview

## KELEDON System Architecture

### Core Principle: "Cloud Decides, Agent Executes"

The KELEDON system follows a strict separation of concerns where the cloud backend makes all intelligent decisions and the browser agent executes deterministic automation flows.

---

## 🏗️ High-Level Architecture

```
┌─────────────────┐     WebSocket      ┌─────────────────┐
│                 │◄──────────────────►│                 │
│   Agent (React) │                    │   Cloud (Nest)  │
│   Chrome Ext    │                    │                 │
└────────┬────────┘                    └────────┬────────┘
         │                                      │
         │                              ┌───────┴───────┐
         │                              │               │
    ┌────▼────┐                    ┌────▼────┐    ┌────▼────┐
    │ Browser │                    │   STT   │    │   LLM   │
    │ Mic/    │                    │Deepgram │    │ OpenAI  │
    │ Speaker │                    └─────────┘    └────┬────┘
    └─────────┘                                        │
                                                       │
                                                   ┌────▼────┐
                                                   │   TTS   │
                                                   │ElevenLabs│
                                                   └─────────┘
```

---

## 📁 Repository Structure

### Monorepo Organization
```
keledon/
├── agent/                 # Browser extension (runtime + modules)
├── cloud/                 # Backend + brain + APIs + workers
├── contracts/             # Canonical schemas (JSON Schema / OpenAPI)
├── infra/                 # IaC/containers/terraform/helm
├── docs/                  # Architecture, diagrams, runbooks, ADRs
└── tools/                 # Scripts, generators, fixtures
```

### Agent Structure (Browser Extension)
```
agent/
├── manifest/              # MV3 manifest + permissions
├── src/
│   ├── core/            # Runtime: session manager, websocket client, routing
│   ├── config/          # Feature flags, provider config
│   ├── audio/           # STT/TTS adapters, VAD
│   ├── rpa/             # Executor, adapters, selectors
│   ├── tabs/            # Registry, messaging for multi-tab
│   ├── content_scripts/ # Genesys, Salesforce, shared utilities
│   ├── background/      # Service worker: lifecycle, auth, keepalive
│   ├── ui/              # Extension UI: popup, sidepanel
│   └── logging/         # Local logs, event buffering
└── tests/
```

### Cloud Structure (Backend & Brain)
```
cloud/src/
├── api/               # REST endpoints (admin, config, auth, projects)
├── realtime/          # WebSocket gateway for sessions and streaming
├── brain/             # Orchestrator, intents, policies, prompts, routing
├── rag/               # Ingestion, retrieval, embeddings
├── vectorstore/       # Qdrant client wrapper, collections, migrations
├── storage/           # Documents, transcripts file storage
├── audit/             # Event log pipeline, replay tools
├── auth/              # JWT/OAuth2, roles, tenant isolation
├── workers/            # Async jobs: ingestion, summarization, compaction
└── observability/      # OpenTelemetry, structured logging
```

---

## 🔄 Communication Flow

### Touchpoint A: Agent → Cloud (Single Ingress)
```
Agent Event → WebSocket → Cloud Brain
├── text_input (STT results)
├── ui_result (RPA execution results)  
└── system (lifecycle events)
```

### Touchpoint B: Cloud → Agent (Commands)
```
Cloud Brain → WebSocket → Agent
├── say {text, interruptible} (TTS commands)
├── ui_steps [] (RPA automation flows)
├── confidence (decision confidence)
└── mode (normal/safe/silent)
```

### Touchpoint C: Cloud Internal (RAG)
```
Brain → RAG → Vector Store (Qdrant)
```

### Touchpoint D: Admin/Config (REST)
```
Extension → Cloud REST API
├── Configuration management
├── Feature flags
└── Tenant settings
```

---

## 🧩 Component Interactions

### Agent Runtime Flow
1. **Session Manager** creates conversation session
2. **WebSocket Client** establishes connection to cloud
3. **STT Adapter** processes speech → text
4. **Event Router** routes text to cloud
5. **Cloud Brain** processes → returns commands
6. **TTS Adapter** synthesizes speech response
7. **RPA Executor** executes automation flows if commanded

### Cloud Brain Flow
1. **Orchestrator** manages conversation state
2. **Intent Normalizer** processes user intent
3. **RAG Retrieval** fetches relevant knowledge
4. **Policy Engine** enforces safety rules
5. **Flow Selection** chooses appropriate automation
6. **Command Generation** creates agent commands

---

## 📊 Data Flow

### Voice Conversation Flow
```
User Speech → STT → Cloud Brain → LLM + RAG → TTS → User Audio
     ↓              ↓              ↓           ↓
  Agent         WebSocket      Cloud       Agent
```

### Automation Flow
```
Cloud Decision → RPA Flow → DOM Actions → Results → Cloud
        ↓              ↓           ↓          ↓
     Brain         Agent      Browser     WebSocket
```

---

## 🔒 Security & Safety

### Agent Safety
- **Deterministic Execution**: No improvisation, only executes defined flows
- **Explicit Failure**: Stops immediately on selector errors
- **No Business Logic**: Agent never makes decisions
- **Contract Validation**: All payloads validated against schemas

### Cloud Security
- **Tenant Isolation**: Multi-tenant with role-based access
- **Policy Enforcement**: Safety modes and confidence thresholds
- **Audit Logging**: Complete event trail for compliance
- **Input Validation**: All inputs validated against contracts

---

## 📈 Scalability & Performance

### Horizontal Scaling
- **Cloud**: Stateless services can be scaled horizontally
- **Agent**: Each browser instance is independent
- **WebSocket**: Connection pooling and load balancing

### Performance Optimizations
- **Streaming**: Real-time audio processing
- **Caching**: Voice models and knowledge caching
- **Async Processing**: Background workers for heavy tasks
- **Local Fallbacks**: Offline capabilities when cloud unavailable

---

## 🧪 Testing Strategy

### Unit Testing
- **Agent**: Component-level testing with mocks
- **Cloud**: Service testing with test databases
- **Contracts**: Schema validation testing

### Integration Testing
- **WebSocket**: End-to-end communication testing
- **Audio**: STT/TTS pipeline testing
- **RPA**: Browser automation testing

### E2E Testing
- **Full Conversations**: Complete user journey testing
- **Multi-tab**: Tab coordination testing
- **Error Scenarios**: Failure and recovery testing

---

## 📚 Documentation

### Architecture Documentation
- **ADRs**: Architecture Decision Records
- **Diagrams**: System and component diagrams
- **Runbooks**: Operational procedures
- **API Docs**: Complete API specifications

### Developer Documentation
- **Contracts**: All communication schemas
- **Code Examples**: Usage patterns and examples
- **Setup Guides**: Development environment setup
- **Contributing**: Development guidelines

---

## 🚀 Deployment Architecture

### Cloud Deployment
- **Containers**: Docker containerization
- **Orchestration**: Kubernetes with Helm charts
- **Infrastructure**: Terraform IaC
- **Monitoring**: OpenTelemetry + structured logging

### Agent Distribution
- **Chrome Store**: Public extension distribution
- **Enterprise**: Private extension deployment
- **Updates**: Automatic extension updates
- **Configuration**: Remote configuration management

---

## 🎯 Future Architecture

### Phase 2: Core Intelligence
- **RPA Executor**: Deterministic browser automation
- **Cloud Brain**: Conversation state machine
- **RAG Integration**: Knowledge retrieval capabilities

### Phase 3: Enhanced Features
- **Multi-tab Coordination**: Advanced tab management
- **Domain Adapters**: Specialized automation for specific platforms
- **Advanced Analytics**: Usage insights and optimization

### Phase 4: Production Readiness
- **Observability**: Complete monitoring and alerting
- **Infrastructure**: Production deployment automation
- **Documentation**: Complete operational documentation

---

*This architecture document is maintained as part of the ADR process. All changes should be documented with appropriate decision records.*