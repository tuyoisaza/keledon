# Agent Module

## Overview
The Chrome extension agent module provides the client-side functionality for the KELEDON voice AI assistant. Built with Manifest V3, it handles audio processing, RPA automation, multi-tab coordination, and real-time communication with the cloud backend.

## Architecture
```
agent/
├── manifest/           # Chrome extension manifest and permissions
├── src/
│   ├── core/           # Core runtime functionality (session manager, websocket client, routing)
│   ├── config/         # Feature flags and provider configuration
│   ├── audio/          # Audio processing (STT/TTS adapters, VAD)
│   ├── rpa/            # Robotic Process Automation (executor, adapters, selectors)
│   ├── tabs/           # Multi-tab coordination (registry, messaging)
│   ├── background/     # Service worker implementation
│   ├── ui/             # Extension UI components (side panel, popup, offscreen)
│   ├── logging/        # Local logs and event buffering
│   └── content_scripts/ # DOM interaction capabilities
├── node_modules/       # Dependencies
└── README.md           # This file
```

## Key Features
- ✅ **Real-time Voice I/O**: Audio capture, PCM processing, and voice activity detection
- ✅ **RPA Automation**: Deterministic step execution with domain-specific adapters
- ✅ **Multi-tab Coordination**: Tab discovery, role assignment, and cross-tab messaging
- ✅ **WebSocket Communication**: Real-time connection with cloud backend
- ✅ **Modular Architecture**: Adapter pattern for STT/TTS/LLM providers

## Implementation Status
| Component | Status | Notes |
|-----------|--------|-------|
| Audio Processing | ✅ 95% | VAD implemented and verified |
| RPA System | ✅ 85% | Executor and selectors implemented |
| Multi-tab Coordination | ✅ 100% | Registry and messaging fully implemented |
| WebSocket Client | ✅ 85% | Real-time communication functional |
| Extension UI | ✅ 70% | Side panel works, needs UX improvements |

## Quick Start
1. Load extension in Chrome: `chrome://extensions` → "Load unpacked" → `agent/`
2. Configure API endpoints in `src/config/`
3. Test voice automation on supported websites

## Development
- **Build**: `npm run build` (for production packaging)
- **Test**: Jest + JSDOM with Chrome API mocking
- **Debug**: Use Chrome DevTools console and background page inspection

## Dependencies
- Chrome Extensions API (Manifest V3)
- TypeScript for type safety
- Socket.io client for real-time communication
- AJV for contract validation

## Next Steps
- [ ] Complete Salesforce adapter implementation
- [ ] Add comprehensive test suite for tab coordination
- [ ] Optimize extension load time (<500ms target)

## Documentation
- Architecture: `docs/architecture/tab-discovery.md`, `docs/architecture/tab-messaging.md`
- Runbooks: `docs/runbooks/extension-deployment-guide.md`
- Diagrams: `docs/diagrams/agent-architecture.svg`