# STAGE 1 DEVELOPMENT LIST (V1 ALIGNED)

## 1. Architectural Compliance (The "Auto-Dev" Baseline)
- [x] **Artifact Creation**: `ARCHITECTURE.md`, `CONTRACTS.md`, `FLOWS.md`, `FEATURES.md`.
- [x] **Contract Validation**: Verify current `cloud` <-> `agent` WebSocket implementation matches `CONTRACTS.md`.
    - [x] Update `agent` to send strictly typed `AUDIO_CHUNK` events.
    - [x] Update `cloud` to send strictly typed `EXECUTE_FLOW` events.

## 2. Core Infrastructure Stabilisation
- [x] **Dependency Audit**: Ensure no "magic" libraries. Use standard `socket.io`.
- [x] **Environment Check**: Validate `.env` against V1 requirements (Qdrant added).
- [x] **Build Pipeline**: Ensure `npm run build` passes for all 3 workspaces with strict type checking.

## 3. The "Hands": Agent DOM Automation (V1 Critical)
- [x] **Action Block Implementation**: Implement `click`, `fill`, `read`, `wait` in `agent`.
- [x] **Flow Executor**: Create the deterministic runner in `agent` that parses JSON flows.
- [ ] **RPA Testing**: Create a local "playground" HTML file to verify the agent's DOM blocks.

## 4. The "Brain": Cloud Orchestration
- [ ] **State Machine Refactor**: Ensure `conversation.orchestrator.ts` uses a strict state machine (Listening -> Thinking -> Speaking -> Executing).
- [ ] **RAG Integration**: Connect Qdrant for "Policy" retrieval (Mock or Real).
- [ ] **Flow Dispatch**: Implement logic to select and send a Flow ID based on intent.

## 5. End-to-End Verification
- [ ] **Voice Loop**: Speak -> STT -> LLM -> TTS -> Audio Playback (Verify Latency).
- [ ] **Action Loop**: Speak "Open Settings" -> STT -> Intent -> Cloud sends Flow -> Agent Clicks Settings.
- [ ] **Audit**: Verify `session` table records the Flow ID and Result.
