# Browser UI Enhancement - KELEDON Desktop Agent

**Date:** 2026-04-12
**Status:** Approved

## Overview

Enhance the KELEDON Desktop Agent browser UI with call controls, transcript display, brain status display, and device management.

## Features

### 1. Call Controls Panel
- **Mute/Unmute toggle**: Toggle microphone mute state
- **Hold/Resume toggle**: Put call on hold / resume
- **Hang up button**: End current call
- **Status badge**: Shows "Idle", "In Call", or "On Hold"

### 2. Transcript Panel
- Scrollable transcript history
- Each entry shows:
  - Timestamp (HH:MM:SS)
  - Speaker label ("Agent" or "Customer")
  - Transcript text
  - Confidence percentage

### 3. Brain Status Panel
- Scrollable command history
- Shows for each command:
  - Timestamp
  - Command type (say, ui_steps, mode, stop)
  - Payload (say.text, etc.)
  - Flow ID if applicable
- **Debug mode toggle**: When enabled, shows full payload and decision metadata

### 4. Device Info Panel
- Device ID
- Connection status (connected/disconnected)
- Session ID when active

## Architecture

```
Renderer (index.html)
    │
    │ IPC (preload.ts)
    ▼
Electron Main (main.ts)
    │
    │ WebSocket
    ▼
KELEDON Cloud
  - Device Gateway (/ws/runtime): transcripts, call status
  - Agent Gateway (/agent): brain commands
```

## IPC Channels

| Channel | Direction | Payload |
|---------|-----------|---------|
| `media:onTranscript` | Main → Renderer | `{ text, speaker, confidence, timestamp }` |
| `media:onCallStatus` | Main → Renderer | `{ status, duration }` |
| `brain:onCommand` | Main → Renderer | `{ type, payload, flow_id, timestamp }` |
| `media:mute` | Renderer → Main | - |
| `media:unmute` | Renderer → Main | - |
| `media:hold` | Renderer → Main | - |
| `media:resume` | Renderer → Main | - |
| `media:hangup` | Renderer → Main | - |

## WebSocket Events

### From Device Gateway
- `transcript` → forward to renderer
- `call_status` → forward to renderer

### From Agent Gateway
- `command.{sessionId}` → forward to renderer as brain commands

## UI Layout

```
┌────────────────────────────────────────────┐
│  KELEDON Browser              ●●● ●     │
├────────────────────────────────────────────┤
│  [Device: xxx]  [Status: Connected]       │
├────────────────────────────────────────────┤
│  [🔇 Mute] [⏸ Hold] [📞 Hang Up]  ●Idle  │
├───────────────────────┬────────────────────┤
│  Transcript          │  Brain Status      │
│  ──────────────────  │  ─────────────────  │
│  12:01 Agent: Hi    │  12:01 say: Hi     │
│  12:01 Cust: Hola   │  12:02 ui_steps    │
│  12:02 Agent: How?  │  [Debug: OFF]      │
│                      │                    │
└───────────────────────┴────────────────────┘
```

## Implementation Files

1. `browser/renderer/index.html` - UI markup and styles
2. `browser/src/preload.ts` - Expose new APIs
3. `browser/src/main.ts` - WebSocket client, event forwarding

## Acceptance Criteria

- [ ] Call controls buttons work and update status
- [ ] Transcripts appear in real-time during calls
- [ ] Brain commands appear in scrollable history
- [ ] Debug toggle shows full payload when enabled
- [ ] Device info displays correctly
- [ ] WebSocket connects to cloud and receives events
