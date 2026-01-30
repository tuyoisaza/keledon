# Cloud Service Architecture

## Overview
The Cloud service is a NestJS-based backend that provides AI-powered voice assistant capabilities, RPA automation, and knowledge management for the KELEDON ecosystem.

## Core Components

### 1. API Layer (`cloud/api/`)
- REST endpoints for admin, brain, workflow, and knowledge services
- Health checks and monitoring endpoints
- Authentication and authorization middleware

### 2. Real-time Communication (`cloud/realtime/`)
- WebSocket gateway for real-time audio streaming
- Event handling for agent↔cloud communication
- Connection management and reconnection logic

### 3. Brain Orchestration (`cloud/brain/`)
- **Orchestrator**: Conversation state machine and flow coordination
- **Intents**: User intent normalization and classification
- **Policies**: Safety rules, guardrails, and content moderation
- **Prompts**: Context-aware prompt templates and management
- **Routing**: Config-based request routing to appropriate handlers

### 4. RAG System (`cloud/rag/`)
- **Ingestion**: Document processing pipeline for various formats
- **Embeddings**: Provider abstraction for embedding generation
- **Retrieval**: Vector search and result ranking with Qdrant
- **Vector Store**: Qdrant client wrapper for vector database operations

### 5. Storage & Audit (`cloud/storage/`, `cloud/audit/`)
- Session artifacts and transcript storage
- Event logging and replay capabilities
- Operational monitoring and debugging

### 6. Infrastructure (`cloud/observability/`, `cloud/workers/`)
- Structured logging and metrics collection
- Async job processing for background tasks
- Distributed tracing and error tracking

## Key Features

| Feature | Status | Description |
|---------|--------|-------------|
| **WebSocket Communication** | ✅ 85% | Real-time gateway functional with validation |
| **RAG Knowledge Base** | ✅ 75% | Qdrant integration working with retrieval optimization needed |
| **Authentication** | ✅ 65% | JWT implementation exists, needs refresh flow |
| **Multi-tab Coordination** | ✅ 90% | Tab registry and messaging fully implemented |
| **STT/TTS Integration** | ✅ 70% | Deepgram and ElevenLabs providers implemented |

## Development Setup

### Prerequisites
- Node.js v20+
- npm/yarn
- PostgreSQL, MongoDB, or Supabase for database
- Qdrant vector database

### Installation
```bash
cd cloud
npm install
```

### Development
```bash
# Start in development mode
npm run start:dev

# Build production version
npm run build

# Start production server
npm run start:prod
```

## Environment Variables
Required configuration:
```env
NODE_ENV=production
PORT=3000
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
DEFAULT_STT_PROVIDER=deepgram
DEFAULT_TTS_PROVIDER=elevenlabs
DEFAULT_LLM_PROVIDER=openai
DEEPGRAM_API_KEY=your-deepgram-key
ELEVENLABS_API_KEY=your-elevenlabs-key
OPENAI_API_KEY=your-openai-key
```

## Testing
```bash
# Run unit tests
npm test

# Run E2E tests
npm run test:e2e
```

## Deployment
- Docker multi-stage build available
- Cloud Run deployment scripts provided
- Kubernetes Helm charts in infra/helm/

## Architecture Diagram
![Cloud Architecture](diagrams/cloud-architecture.png)

## Contributing
See CONTRIBUTING.md for contribution guidelines and code standards.