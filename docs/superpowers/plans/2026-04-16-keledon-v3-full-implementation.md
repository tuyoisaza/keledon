# KELEDON V3 Full Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the full V3 roadmap: Voice/WebRTC (STT/TTS), Vector Store Integration (Qdrant), and Transcript Monitoring for escalation triggers

**Architecture:** Three independent but interconnected subsystems:
1. Voice/WebRTC: Desktop agent captures audio → STT → Cloud Brain → TTS → Audio output
2. Vector Store: Cloud queries Qdrant for context-grounded decisions
3. Transcript Monitoring: Real-time STT output checked against escalation keywords

**Tech Stack:**
- Desktop: Electron, WebRTC, Web Speech API, VOSK (future)
- Cloud: NestJS, Qdrant, OpenAI (for LLM)
- Deployment: Railway (PostgreSQL, auto-deploy)

**Sub-plans:**
1. `2026-04-16-keledon-voice-webrtc.md` - Voice/WebRTC implementation
2. `2026-04-16-keledon-vector-store.md` - Qdrant vector store integration
3. `2026-04-16-keledon-transcript-monitoring.md` - Real-time escalation detection

---

## Plan 1: Voice/WebRTC Implementation

**Location:** `docs/superpowers/plans/2026-04-16-keledon-voice-webrtc.md`

### Scope
- STT: Web Speech API (browser native) as primary, VOSK as future upgrade
- TTS: Web Speech API as primary, ElevenLabs as future upgrade
- WebRTC: Basic incoming call handling stub → real implementation
- Media Layer: Full implementation replacing stubbed version

### Files to Create/Modify
- `browser/src/media/` - New media layer module
- `browser/src/main.ts` - Integrate media layer
- `browser/src/preload.ts` - Expose media APIs
- `browser/renderer/index.html` - UI for call controls

---

## Plan 2: Vector Store Integration

**Location:** `docs/superpowers/plans/2026-04-16-keledon-vector-store.md`

### Scope
- Qdrant setup and connection
- RAG service in cloud for context grounding
- Knowledge base seeding endpoint
- Cloud brain uses vector retrieval for decisions

### Files to Create/Modify
- `cloud/src/rag/rag.service.ts` - Vector retrieval service
- `cloud/src/rag/rag.module.ts` - RAG module
- `cloud/prisma/schema.prisma` - Add KnowledgeBase models (if not exist)
- `cloud/src/decision/decision.service.ts` - Integrate vector grounding

---

## Plan 3: Transcript Monitoring

**Location:** `docs/superpowers/plans/2026-04-16-keledon-transcript-monitoring.md`

### Scope
- Real-time transcript monitoring from STT output
- Check against team.escalationTriggers
- Trigger escalation modal on keyword match
- Broadcast to cloud via WebSocket

### Files to Create/Modify
- `browser/src/media/transcript-monitor.ts` - New module
- `browser/src/main.ts` - Integrate transcript monitoring
- `cloud/src/gateways/device.gateway.ts` - Handle escalation events

---

## Execution Order

**Recommended sequence:**
1. Plan 1 (Voice/WebRTC) - Core functionality
2. Plan 3 (Transcript Monitoring) - Depends on Plan 1's STT
3. Plan 2 (Vector Store) - Independent, can run parallel after Plan 1

Each plan produces working, testable software independently.