# KELEDON BROWSER — V3 Canonical Specification

## Status
**LIVING DOCUMENT — V3 BROWSER**
Version: 0.1.0
Date: 2026-04-18

---

## 1. IDENTITY

### 1.1 What KELEDON Browser Is

KELEDON Browser is the **edge execution surface** of the KELEDON platform. It is an Electron-based desktop application that functions as a managed browser — receiving instructions from the Cloud Brain and executing them deterministically on vendor web portals.

> **"Chrome that receives prompts from the brain and executes RPA automatically."**

### 1.2 The Cloud/Browser Relationship

KELEDON is a **cloud/browser hybrid edge SaaS**. The system's intelligence lives entirely in the cloud. The browser is the last mile — the physical point of contact with vendor portals, customer-facing interfaces, and real-time voice interactions.

```
┌──────────────────────────────────────────────────────────┐
│                    KELEDON CLOUD                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐               │
│  │ Decision  │  │  RAG /   │  │  CRUD /  │               │
│  │  Engine   │  │  Vector  │  │  Admin   │               │
│  └─────┬────┘  └─────┬────┘  └──────────┘               │
│        │             │                                    │
│        └──────┬──────┘                                    │
│               │                                           │
│        ┌──────▼──────┐                                    │
│        │  WebSocket   │                                   │
│        │  Gateway     │                                   │
│        └──────┬──────┘                                    │
└───────────────┼──────────────────────────────────────────┘
                │
         HTTPS + WebSocket
                │
┌───────────────▼──────────────────────────────────────────┐
│              KELEDON BROWSER (Edge)                        │
│                                                           │
│  ┌────────┐ ┌───────────┐ ┌───────────┐ ┌────────────┐  │
│  │  Tabs  │ │ AutoBrowse│ │  Media    │ │ Escalation │  │
│  │ System │ │   RPA     │ │  Layer    │ │  System    │  │
│  └────────┘ └───────────┘ └───────────┘ └────────────┘  │
│       │           │             │              │          │
│       └───────────┴─────────────┴──────────────┘          │
│                         │                                 │
│                  ┌──────▼──────┐                          │
│                  │   Vendor    │                          │
│                  │   Portals   │                          │
│                  └─────────────┘                          │
└──────────────────────────────────────────────────────────┘
```

### 1.3 Why the Browser IS the Edge

Traditional SaaS runs entirely in the cloud. KELEDON cannot — because it must:

1. **Interact with vendor portals** that have no API (Genesys, Salesforce, proprietary CRMs)
2. **Capture and produce audio** for real-time voice conversations
3. **Execute DOM actions** on pages that require authenticated browser sessions
4. **Maintain vendor credentials** that cannot leave the customer's network perimeter

The browser is **primarily** an autonomous execution agent controlled by the cloud. However, it must also be **usable by a human operator** when manual intervention is required — the user experience must feel familiar and Chrome-like.

### 1.4 The Prime Law (Restated for Browser Context)

> **Cloud decides. Browser executes.**

The browser:
- ✅ Executes RPA steps issued by Cloud
- ✅ Captures audio and forwards transcripts to Cloud
- ✅ Plays TTS audio as commanded by Cloud
- ✅ Opens tabs and navigates as commanded
- ✅ Reports execution evidence back to Cloud
- ❌ Never decides what to do next
- ❌ Never selects intents or flows
- ❌ Never reasons about user input
- ❌ Never modifies Cloud instructions

---

## 2. CURRENT IMPLEMENTATION (v0.1.11)

### 2.1 Technology Stack

| Component | Technology | Purpose |
|-----------|------------|---------|
| Runtime | Electron 28 | Desktop app shell |
| Views | BrowserView | Tab-based web rendering |
| RPA | CDP (Chrome DevTools Protocol) | Browser automation |
| Sockets | socket.io-client | Cloud communication |
| STT | Web Speech API | Speech recognition (fallback) |
| TTS | Web Speech API | Speech synthesis (fallback) |
| Packaging | electron-forge + electron-builder | Windows distribution |
| Updates | electron-updater | Auto-update mechanism |
| Logging | electron-log | File + console logging |

### 2.2 Source File Map

```
browser/
├── src/
│   ├── main.ts                    # Main process (1325 lines)
│   │                               # - Window creation
│   │                               # - Tab management (BrowserView)
│   │                               # - Deep link protocol (keledon://)
│   │                               # - Device pairing flow
│   │                               # - WebSocket connections (device + agent)
│   │                               # - AutoBrowse initialization
│   │                               # - Vendor auto-login
│   │                               # - Escalation system
│   │                               # - All IPC handlers
│   │                               # - Media layer wiring
│   │                               # - Auto-updater
│   │
│   ├── preload.ts                 # Context bridge (204 lines)
│   │                               # Exposes window.keledon API:
│   │                               #   .device    (getInfo)
│   │                               #   .runtime   (connect, disconnect, sessions)
│   │                               #   .executor  (executeGoal, executeSteps, CDP)
│   │                               #   .evidence  (getLogs, getScreenshots, events)
│   │                               #   .media     (startCall, speak, mute, hold)
│   │                               #   .brain     (onCommand, debugMode)
│   │                               #   .launcher  (onLaunch deep links)
│   │                               #   .tabs      (create, list, switch, close)
│   │                               #   .escalation (onShow, action)
│   │
│   ├── autobrowse-bridge.ts       # RPA bridge (181 lines)
│   │                               # - CDP goal execution
│   │                               # - Screenshot capture
│   │                               # - Browser state queries
│   │
│   └── media/
│       ├── media-layer.ts         # Audio layer (231 lines)
│       │                           # - Web Speech API STT (continuous)
│       │                           # - Web Speech API TTS
│       │                           # - Call lifecycle (idle/in-call/on-hold)
│       │                           # - Mute/unmute, hold/resume
│       │
│       ├── transcript-monitor.ts  # Escalation detector (93 lines)
│       │                           # - Keyword matching against team triggers
│       │                           # - 30-second debounce
│       │
│       └── event-logger.ts        # Structured logger (147 lines)
│                                   # - Categorized events (1000 max)
│                                   # - Level filtering, stats
│
├── renderer/
│   └── index.html                 # Control panel UI (1188 lines)
│                                   # - Header with version
│                                   # - Status bar (device, session, connection)
│                                   # - Quick actions (call, mute, hold, hangup)
│                                   # - Tab bar
│                                   # - 4-panel layout: Activity | Transcript | Brain | EventLog
│                                   # - Connect panel (cloud URL, pairing code)
│                                   # - Execute panel (goal input)
│                                   # - Escalation modal (continue/fix/abort)
│
└── lib/autobrowse/                # AutoBrowse engine (git submodule)
    └── src/
        ├── worker/                # Goal execution engine
        ├── browser/               # CDP browser manager
        └── ai/                    # AI-powered element matching
```

### 2.3 Implemented Features

#### A. Tab System
- Create BrowserView tabs with name + URL
- Switch between tabs, close tabs
- Home tab loads built-in control panel
- Tabs resize with window
- Tab state broadcast to renderer

#### B. Deep Link Protocol (`keledon://`)
- Format: `keledon://launch?keledonId={id}&code={code}&userId={userId}&timestamp={ts}&signature={sig}&cloudUrl={url}`
- HMAC-SHA256 signature validation
- 60-second expiry on timestamps
- Auto-connect on valid launch
- Test mode: `keledon://test?instructions={text}`

#### C. Device Pairing
- `POST /api/devices/pair` with device_id, machine_id, pairing_code, platform, name, keledon_id
- Returns: auth_token, keledon_id, team config (including escalationTriggers), vendor list
- Supports manual connect (UI) and auto-connect (deep link + env vars)

#### D. WebSocket Communication
Two socket.io connections after pairing:

| Socket | Namespace | Direction | Events |
|--------|-----------|-----------|--------|
| Device | `/ws/runtime` | Bidirectional | `session:start`, `session:end`, `voice:transcript`, `goal_execute`, `goal:result`, `escalation:trigger`, `escalation:abort`, `escalation:response` |
| Agent | `/agent` | Cloud → Browser | `command:*` (forwarded to renderer as `brain:command`) |

#### E. AutoBrowse RPA
- Initializes CDP connection on app ready
- Cloud sends `goal_execute` via device socket
- Bridge executes goal via CDP (navigate, capture screenshot)
- Returns structured result: execution_id, status, goal_status, steps, duration, artifacts
- Also available via IPC: `executor:executeGoal`, `executor:executeSteps`

#### F. Vendor Auto-Login
- On pairing, cloud returns vendor list with encrypted credentials
- Browser opens vendor URL in new tab
- AutoBrowse executes login goal with decrypted credentials (AES-256-CBC)
- Login result sent to renderer

#### G. Escalation System
- **Keyword triggers**: Team-configurable word list (sue, lawyer, manager, etc.)
- **Failure triggers**: RPA step failures
- **Transcript monitoring**: Real-time STT output scanned against triggers (30s debounce)
- **Modal UI**: Continue (keep going), Fix (retry), Abort (end session, escalate to human)
- **Cloud notification**: Escalation events forwarded via device socket

#### H. Media Layer (Partial)
- Web Speech API for STT (continuous, interim + final results)
- Web Speech API for TTS (interruptible)
- Call lifecycle: idle → in-call → on-hold
- Mute/unmute, hold/resume
- Transcript events forwarded to cloud via device socket

---

## 3. OPERATIONAL REQUIREMENTS (Non-Negotiable)

### 3.1 Installer & Distribution

KELEDON Browser must ship with a **production-grade Windows installer** (NSIS) that:

1. **Installs the application** to a user-selectable directory (default: `C:\Program Files\KELEDON Browser`)
2. **Registers the `keledon://` protocol** in the Windows registry so deep links work immediately after install
3. **Creates desktop and Start Menu shortcuts**
4. **Provides a full uninstaller** (Add/Remove Programs compatible) that:
   - Removes all application files
   - Unregisters the `keledon://` protocol
   - Optionally preserves or deletes local logs and settings
5. **Generates installation logs** in the install directory:
   - `install.log` — Full NSIS installation trace
   - Written regardless of success or failure
   - Must capture: installer version, target path, registry changes, errors

#### Installer Artifacts
```
C:\Program Files\KELEDON Browser\
├── KELEDON Browser.exe
├── resources/
├── install.log              # NSIS install trace
├── logs/                    # Runtime logs directory
│   ├── keledon-browser.log  # Main process log (electron-log)
│   └── startup.log          # Early boot log (before Electron initializes)
└── uninstall.exe            # NSIS uninstaller
```

### 3.2 Local Diagnostic Logging

**Problem**: The KELEDON Browser sometimes fails to show a window, renders a black screen, or runs with no visible interface. When this happens, the user has no way to diagnose the issue or report it to the development team.

**Requirement**: The browser must produce **local log files in the installation directory** that survive crashes and can be copied to an AI development agent or support ticket.

#### Log Files (Mandatory)

| File | Written By | Purpose |
|------|-----------|----------|
| `logs/startup.log` | Early boot code (before Electron `ready`) | Captures process start, argv, environment, protocol registration, fatal errors |
| `logs/keledon-browser.log` | `electron-log` (after Electron `ready`) | Full runtime log: connections, tab events, RPA execution, errors |
| `logs/crash-{timestamp}.log` | Uncaught exception handler | Stack trace + system state at time of crash |

#### Logging Rules

1. **Log before anything else** — The first line of `main.ts` must write to `startup.log` with a timestamp. This is already partially implemented (`earlyLog`) but must write to the install directory, not `process.cwd()`.
2. **Log to a fixed, findable path** — Logs must be in `{install_dir}/logs/`, never in `%APPDATA%` or `%TEMP%` where users can't find them.
3. **Log system state on startup** — Record: Electron version, OS version, screen resolution, GPU info, argv, environment variables (sanitized).
4. **Log window creation** — Record: window dimensions, `did-finish-load` event, any `did-fail-load` errors, GPU process crashes.
5. **Rotate logs** — Keep last 5 log files, max 10MB each.
6. **Never silently swallow errors** — Every `catch` block must log the error with stack trace before proceeding.
7. **Provide a "Copy Logs" button** — The renderer must have a visible button that copies the full log file contents to clipboard, so users can paste them into a support channel or AI agent prompt.

#### Black Screen Diagnosis Checklist
When the browser shows a black screen or no window, the logs must answer:
- Did Electron start? (`startup.log` exists?)
- Did the main window create? (`BrowserWindow` constructor logged?)
- Did the renderer load? (`did-finish-load` event logged?)
- Did the renderer fail? (`did-fail-load` with error code?)
- Is the GPU process alive? (GPU crash logged?)
- Is the preload script loading? (Context bridge errors?)

### 3.3 Chrome-Like User Experience

**Principle**: Even though KELEDON Browser is an autonomous agent that follows Cloud-defined flows, **human operators sometimes need to step in and do manual click work**. The browser must feel familiar to anyone who uses Chrome.

#### Chrome Parity Requirements

| Feature | Chrome Behavior | KELEDON Browser Must |
|---------|----------------|---------------------|
| **Tab bar** | Tabs at the top with + button | ✅ Same visual pattern, same position |
| **Address bar** | URL visible and editable | ❌ Missing — must add read-only URL display per tab |
| **Navigation** | Back, Forward, Refresh buttons | ❌ Missing — must add standard nav controls |
| **Page loading** | Loading spinner in tab | ❌ Missing — must show loading state |
| **Right-click** | Standard context menu | Should work natively (Electron default) |
| **Keyboard shortcuts** | Ctrl+T, Ctrl+W, Ctrl+Tab, F5, Ctrl+L | ❌ Missing — must implement standard shortcuts |
| **DevTools** | F12 opens inspector | Should work (Electron default for BrowserViews) |
| **Zoom** | Ctrl+/-, Ctrl+0 | Partially — must work on active tab |
| **Downloads** | Download bar at bottom | ❌ Missing — must handle file downloads |
| **Find in page** | Ctrl+F | ❌ Missing — must implement find-in-page |
| **Scroll** | Smooth scrolling, scroll bars | Should work natively |
| **Favicon** | Tab shows site icon | ❌ Missing — must extract and display favicons |

#### The Dual-Mode Experience

The browser operates in two modes:

1. **Autonomous Mode** (default): Cloud sends RPA flows, browser executes them. The user watches. Tabs open, forms fill, buttons click — all automatically. The user sees a status overlay showing what the agent is doing.

2. **Manual Mode** (fallback): When the agent encounters something it can't handle, or the escalation system triggers, the user takes over. They click, type, navigate — exactly like Chrome. The browser reports manual actions back to Cloud for learning.

The transition between modes must be seamless. The user should never feel like they're using a "special" browser.

---

## 4. WHAT THE BROWSER SHOULD BECOME

### 4.0 Vision: The Autonomous Edge Agent

The KELEDON Browser should evolve from a manual-connect desktop app into a **fully autonomous edge execution node** that:

1. **Installs cleanly** with protocol registration, uninstaller, and installation logs
2. **Looks and feels like Chrome** so human operators can do manual work when needed
3. **Produces diagnostic logs** that survive crashes and can be shared with support
4. **Auto-launches and auto-pairs** on machine boot via Windows service
5. **Maintains persistent vendor sessions** across restarts
6. **Receives and executes complex multi-step RPA workflows** from the Cloud Brain
7. **Participates in live voice calls** via WebRTC, with the Cloud making all conversational decisions
8. **Runs headless** when no human operator is present
9. **Reports health, metrics, and evidence** continuously to Cloud
10. **Self-updates** without manual intervention

### 4.0.1 The Edge SaaS Model

```
┌─────────────────────────────────────────────────────────────────────┐
│                        CUSTOMER SITE (Edge)                          │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │                    KELEDON BROWSER                              │  │
│  │                                                                 │  │
│  │  ┌──────────┐  ┌───────────┐  ┌──────────┐  ┌──────────────┐ │  │
│  │  │ Vendor   │  │ Vendor    │  │ Vendor   │  │   WebRTC     │ │  │
│  │  │ Tab: CRM │  │ Tab: ERP  │  │ Tab: ...│  │  Call Tab    │ │  │
│  │  └──────────┘  └───────────┘  └──────────┘  └──────────────┘ │  │
│  │       ▲              ▲             ▲               ▲          │  │
│  │       └──────────────┴─────────────┴───────────────┘          │  │
│  │                           │                                    │  │
│  │                    AutoBrowse RPA                              │  │
│  │                    (CDP Engine)                                │  │
│  │                           │                                    │  │
│  │              ┌────────────┴────────────┐                      │  │
│  │              │     Session Manager     │                      │  │
│  │              │  (state, credentials,   │                      │  │
│  │              │   vendor sessions)      │                      │  │
│  │              └────────────┬────────────┘                      │  │
│  └───────────────────────────┼────────────────────────────────────┘  │
│                              │                                       │
└──────────────────────────────┼───────────────────────────────────────┘
                               │
                        Encrypted WebSocket
                               │
┌──────────────────────────────▼───────────────────────────────────────┐
│                        KELEDON CLOUD                                  │
│                                                                       │
│  Decision Engine ← RAG/Vector → Workflow Orchestrator → Command Emit │
│                                                                       │
└───────────────────────────────────────────────────────────────────────┘
```

The browser runs **at the customer's edge** because:
- Vendor portal cookies and sessions cannot leave the customer network
- Audio capture requires a real browser with microphone access
- DOM manipulation requires an authenticated browser context
- Some customers require data residency — the browser ensures PII never leaves their perimeter

The cloud runs **centrally** because:
- Decision logic must be consistent across all edge nodes
- Vector-grounded knowledge bases are shared resources
- Workflow definitions are managed centrally
- Observability and audit trails are aggregated

---

## 5. FUTURE IMPLEMENTATION ROADMAP

### Phase 0: Installer, Logging & Chrome UX (Priority: CRITICAL)

**Goal**: Fix the three operational gaps that block real-world usage.

#### 5.0.1 NSIS Installer
- Build NSIS installer via `electron-builder` (`nsis` target)
- Register `keledon://` protocol in HKCU registry
- Write `install.log` to install directory
- Include uninstaller that cleans registry entries
- Sign the installer (see `docs/WINDOWS_SIGNING_POLICY.md`)

#### 5.0.2 Diagnostic Logging
- Refactor `earlyLog()` to write to `{install_dir}/logs/startup.log` (not `process.cwd()`)
- Add system state dump on startup (Electron version, OS, GPU, screen, args)
- Add `did-fail-load` and GPU crash handlers to `createWindow()`
- Implement log rotation (5 files × 10MB)
- Ensure "Copy Logs" button in renderer works and copies full log content

#### 5.0.3 Chrome-Like Navigation
- Add URL bar (read-only, shows active tab URL)
- Add Back / Forward / Refresh buttons per tab
- Add loading indicator in tab header
- Implement keyboard shortcuts: Ctrl+T (new tab), Ctrl+W (close tab), Ctrl+Tab (next tab), F5 (refresh), Ctrl+L (focus URL bar)
- Extract and display favicons in tab headers
- Implement Ctrl+F find-in-page

---

### Phase 1: Robust RPA Engine (Priority: HIGH)

**Goal**: Replace the minimal CDP bridge with a production-grade AutoBrowse integration.

#### 4.1.1 Full CDP Automation
The current `autobrowse-bridge.ts` only does navigate + screenshot. It must support:

| Action | Description | Status |
|--------|-------------|--------|
| `navigate` | Go to URL | ✅ Implemented |
| `click` | Click element by CSS/XPath selector | ❌ Not implemented |
| `type` | Type text into input field | ❌ Not implemented |
| `select` | Select dropdown option | ❌ Not implemented |
| `wait` | Wait for element/condition | ❌ Not implemented |
| `scroll` | Scroll to element or position | ❌ Not implemented |
| `hover` | Hover over element | ❌ Not implemented |
| `screenshot` | Capture page screenshot | ✅ Implemented |
| `extract` | Extract text/value from element | ❌ Not implemented |
| `assert` | Validate element state/content | ❌ Not implemented |

#### 4.1.2 AI-Powered Element Resolution
When CSS selectors break (vendor portal updates), the browser must:
1. Use the `lib/autobrowse/src/ai/` matching engine
2. Fall back to visual/structural matching
3. Report selector failures to Cloud with DOM snapshots
4. Cloud can issue updated selectors or retrain matching

#### 4.1.3 Multi-Tab RPA Orchestration
Cloud may issue steps across multiple vendor tabs:
```json
{
  "workflow_id": "transfer-ticket-123",
  "steps": [
    { "tab": "genesys", "action": "click", "selector": "#accept-call" },
    { "tab": "crm", "action": "type", "selector": "#notes", "value": "Customer called about..." },
    { "tab": "genesys", "action": "click", "selector": "#transfer-btn" }
  ]
}
```

#### 4.1.4 Step Execution Evidence
Every RPA step must produce:
```json
{
  "step_id": "string",
  "action": "click",
  "selector": "#accept-call",
  "status": "success | failure",
  "screenshot_before": "base64",
  "screenshot_after": "base64",
  "dom_snapshot": "html_fragment",
  "duration_ms": 450,
  "timestamp": "ISO-8601"
}
```

---

### Phase 2: Voice / WebRTC Integration (Priority: HIGH)

**Goal**: Enable the browser to participate in live voice calls as a WebRTC participant.

#### 4.2.1 Architecture

```
Inbound Call (WebRTC/SIP)
         │
         ▼
┌─────────────────────┐
│   KELEDON BROWSER   │
│                     │
│  ┌───────────────┐  │
│  │  WebRTC       │  │     Audio Stream
│  │  Handler      │──┼──────────────────► Remote Caller Hears Agent
│  │               │◄─┼──────────────────  Agent Hears Remote Caller
│  └───────┬───────┘  │
│          │          │
│  ┌───────▼───────┐  │
│  │  STT Engine   │  │     text_input events
│  │  (VOSK)       │──┼──────────────────► Cloud Brain
│  └───────────────┘  │
│                     │
│  ┌───────────────┐  │     say commands
│  │  TTS Engine   │◄─┼──────────────────  Cloud Brain
│  │ (ElevenLabs)  │  │
│  └───────┬───────┘  │
│          │          │
│          ▼          │
│   Audio injected    │
│   into WebRTC       │
│   PeerConnection    │
└─────────────────────┘
```

#### 4.2.2 STT Integration (VOSK)
- Replace Web Speech API with VOSK WebSocket client
- Connect to VOSK server at `ws://{cloud}:9091`
- Send raw PCM audio (16kHz mono)
- Receive partial + final transcripts with confidence scores
- Forward final transcripts to Cloud as `text_input` events

#### 4.2.3 TTS Integration (ElevenLabs)
- Cloud sends `say` command with text
- Browser calls ElevenLabs API (or Cloud TTS endpoint `POST /tts/speak`)
- Receives audio stream (MP3/PCM)
- Plays through WebRTC media track (not local speakers)
- Supports interruptible mode (cancel on new input)

#### 4.2.4 WebRTC Media Injection
Per the canonical WebRTC spec (`v1_keledon_webrtc_agent_participation.md`):
- Override `navigator.mediaDevices.getUserMedia` at document_start
- Return MediaStream containing agent-controlled audio tracks
- Mix TTS audio into the WebRTC PeerConnection
- Remote participants hear the agent through the meeting's own audio pipeline
- Local playback alone is NOT participation

#### 4.2.5 Call Lifecycle
```
IDLE → RINGING → IN_CALL → ON_HOLD → IN_CALL → ENDED
                    │                              │
                    └──── ESCALATED ────────────────┘
```

---

### Phase 3: Persistent Session Management (Priority: MEDIUM)

**Goal**: Browser maintains state across restarts and manages vendor sessions autonomously.

#### 4.3.1 Credential Vault
- Encrypted local storage for vendor credentials
- Credentials received during pairing, stored with hardware-bound key
- Auto-decrypt at runtime for vendor login
- Credential rotation support (Cloud pushes new credentials)

#### 4.3.2 Vendor Session Keep-Alive
- Monitor vendor tab session cookies
- Detect session expiry (HTTP 401, login redirects)
- Auto-re-login using stored credentials
- Report session health to Cloud

#### 4.3.3 State Persistence
- Save runtime state to local encrypted file on shutdown
- Restore state on startup: connected keledon, team, vendors, tabs
- Resume WebSocket connections automatically
- Re-establish vendor sessions

---

### Phase 4: Headless & Service Mode (Priority: MEDIUM)

**Goal**: Browser can run without a visible window, controlled entirely by Cloud.

#### 4.4.1 Windows Service Mode
- Install as Windows service via NSIS installer
- Start on machine boot
- Run headless (no visible window)
- Auto-pair using stored credentials
- Cloud controls all tab/RPA/voice operations

#### 4.4.2 Health Reporting
Browser sends heartbeat to Cloud every 30 seconds:
```json
{
  "device_id": "string",
  "status": "healthy | degraded | error",
  "uptime_ms": 123456,
  "memory_mb": 512,
  "cpu_percent": 15,
  "active_tabs": 3,
  "vendor_sessions": [
    { "vendor": "genesys", "status": "authenticated", "last_activity": "ISO-8601" }
  ],
  "rpa_queue": 0,
  "call_status": "idle | in-call | on-hold",
  "version": "0.1.11"
}
```

#### 4.4.3 Remote Diagnostics
Cloud can request from any connected browser:
- Full event log dump
- Screenshot of any tab
- DOM snapshot of any tab
- Network HAR capture
- Memory/CPU profiling

---

### Phase 5: Observability & Evidence (Priority: MEDIUM)

**Goal**: Full audit trail for every action the browser takes.

#### 4.5.1 OpenTelemetry Integration
Browser emits spans for:
- `keledon.browser.rpa.execute` — RPA step execution
- `keledon.browser.rpa.evidence` — Evidence capture
- `keledon.browser.stt.transcribe` — STT transcription
- `keledon.browser.tts.speak` — TTS synthesis
- `keledon.browser.escalation.trigger` — Escalation detection
- `keledon.browser.vendor.login` — Vendor authentication

Each span includes `decision_id` and `trace_id` from Cloud command, enabling end-to-end trace correlation.

#### 4.5.2 Evidence Chain
Every Cloud decision → Browser execution must produce:
1. Cloud command with `decision_id` + `trace_id`
2. Browser execution with correlated IDs
3. Before/after screenshots
4. DOM state diffs
5. Timing data
6. Success/failure status

---

### Phase 6: Multi-Keledon Support (Priority: LOW)

**Goal**: Single browser instance can host multiple Keledon agents simultaneously.

- Each Keledon gets its own tab group
- Separate WebSocket connections per Keledon
- Independent vendor sessions per Keledon
- Escalation triggers scoped per Keledon's team
- Resource isolation between Keledons

---

## 6. IPC CONTRACT (Canonical)

### 5.1 Renderer → Main (via `window.keledon`)

| Namespace | Method | Purpose |
|-----------|--------|---------|
| `device` | `getInfo()` | Device ID, version, platform |
| `runtime` | `getStatus()` | Connection status |
| `runtime` | `connect(config)` | Pair with cloud |
| `runtime` | `disconnect()` | Disconnect |
| `runtime` | `startSession(id, teamId)` | Start session |
| `executor` | `executeGoal(goal, ctx)` | Execute RPA goal |
| `executor` | `executeSteps(steps)` | Execute RPA steps |
| `executor` | `getCDPUrl()` | Get CDP WebSocket URL |
| `executor` | `getCurrentUrl()` | Get active tab URL |
| `evidence` | `getLogs()` | Get file logs |
| `evidence` | `getEventLogs(filter)` | Get structured events |
| `evidence` | `clearEventLogs()` | Clear event buffer |
| `media` | `startCall(sessionId)` | Start voice call |
| `media` | `stopCall()` | End voice call |
| `media` | `speak(text, interruptible)` | TTS playback |
| `media` | `mute() / unmute()` | Mic control |
| `media` | `hold() / resume()` | Call hold |
| `tabs` | `create(name, url)` | Open new tab |
| `tabs` | `list()` | List all tabs |
| `tabs` | `switch(tabId)` | Switch active tab |
| `tabs` | `close(tabId)` | Close tab |
| `escalation` | `action(type, data)` | Respond to escalation |
| `brain` | `setDebugMode(bool)` | Toggle debug |

### 5.2 Main → Renderer (Events)

| Event | Data | Purpose |
|-------|------|---------|
| `keledon:launch` | `{keledonId, code, cloudUrl, action}` | Deep link received |
| `tabs:updated` | `Tab[]` | Tab list changed |
| `brain:command` | `{type, payload, flow_id}` | Cloud command |
| `media:transcript` | `{text, isFinal, timestamp}` | STT result |
| `media:callStatus` | `{status, duration}` | Call state change |
| `escalation:show` | `{type, data}` | Show escalation modal |
| `vendor:login` | `{vendorId, status}` | Vendor login result |

---

## 7. FORBIDDEN PATTERNS

- ❌ Browser-side intent detection or flow selection
- ❌ Browser making decisions about what to say to callers
- ❌ Storing unencrypted credentials on disk
- ❌ Executing RPA steps not issued by Cloud
- ❌ Silent fallbacks (if something fails, report it)
- ❌ Local playback as proof of WebRTC participation
- ❌ Bypassing the escalation system
- ❌ Running without Cloud connection in production

---

## 8. REFACTORING NEEDS

### 7.1 main.ts Decomposition
The current `main.ts` is 1325 lines and handles everything. It should be split into:

| Module | Responsibility |
|--------|---------------|
| `main.ts` | App lifecycle, window creation only |
| `tabs/tab-manager.ts` | Tab CRUD, BrowserView management |
| `connection/pairing.ts` | Device pairing, auth token management |
| `connection/websocket.ts` | Socket.io connections, event routing |
| `connection/deep-link.ts` | Protocol registration, URL validation |
| `rpa/autobrowse-bridge.ts` | CDP goal execution (existing) |
| `rpa/vendor-login.ts` | Vendor auto-login logic |
| `media/media-layer.ts` | STT/TTS (existing) |
| `media/transcript-monitor.ts` | Escalation detection (existing) |
| `escalation/escalation-manager.ts` | Escalation logic, modal triggers |
| `evidence/event-logger.ts` | Structured logging (existing) |
| `ipc/handlers.ts` | All IPC handler registrations |

### 7.2 Renderer Modernization
The current `renderer/index.html` is a 1188-line monolithic HTML file. It should become:
- React or Preact application
- Component-based UI
- Proper state management
- Shared types with main process

---

## 9. GOVERNANCE

### 8.1 Change Policy
Changes to this spec require:
- GitHub Issue
- Human approval
- Version bump

### 8.2 Relationship to Other Specs
- **v3_KELEDON_CANON.md** — Parent spec defining overall system
- **v1_keledon_canonical_contracts.md** — Communication contract shapes
- **v1_keledon_webrtc_agent_participation.md** — WebRTC participation rules

---

**End of KELEDON Browser V3 Specification**
