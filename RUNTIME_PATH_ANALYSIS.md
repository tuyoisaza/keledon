# KELEDON Runtime Path Analysis

## Current State

### Contracts Layer ✅
- **Event Schema**: Agent→Cloud events (text_input, ui_result, system)
- **Command Schema**: Cloud→Agent commands (say, ui_steps, mode, stop)
- **RPA Step Schema**: UI automation step definitions
- **Audio Schemas**: TTS and STT event contracts

### Agent Layer (Chrome Extension)
- **Package**: socket.io-client dependency present
- **Structure**: Raw JS (no build step required)
- **Status**: Extension files exist, but connection implementation unknown

### Cloud Layer (NestJS Backend)
- **Package**: @nestjs/platform-socket.io for WebSocket support
- **Database**: Supabase + TypeORM for persistence
- **Scripts**: build/start commands available
- **Status**: Backend structure exists, gateway implementation unknown

## Critical Runtime Path (What Must Work)

1. **WebRTC Call Detection** → Agent detects inbound call
2. **Session Creation** → Cloud creates real session_id (UUID)
3. **Audio Capture** → Agent captures audio, STT produces text_input event
4. **Event Ingress** → Agent→Cloud via WebSocket (event schema)
5. **Decision Engine** → Cloud processes event, returns command
6. **Command Egress** → Cloud→Agent via WebSocket (command schema)
7. **Action Execution** → Agent executes ui_steps or say commands
8. **Result Reporting** → Agent→Cloud ui_result events
9. **Persistence** → All events stored in database

## Implementation Gaps

### Missing Core Paths
- [ ] WebSocket connection between agent extension and cloud gateway
- [ ] Session lifecycle management (real UUID generation)
- [ ] STT integration producing valid text_input events
- [ ] Cloud decision engine responding with valid commands
- [ ] TTS integration for "say" commands
- [ ] RPA executor for "ui_steps" commands

### Required but Missing Components
- Agent connection service
- Cloud WebSocket gateway  
- Session persistence layer
- Command/event validation
- Real audio processing pipeline

## Next Execution Targets

1. **Wire Agent↔Cloud WebSocket** - Establish real connection
2. **Implement Session Persistence** - Create real sessions table
3. **Add Text Input Event Flow** - STT→Event→Cloud processing
4. **Add Command Response Flow** - Cloud→Agent command execution
5. **Add Result Reporting** - Agent→Cloud result events

## Success Metrics
- WebSocket connection established without errors
- Real session_id persisted in database
- Text input events validate against schema
- Commands validate against schema
- Observable behavior in logs/UI