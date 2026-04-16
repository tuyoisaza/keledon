# KELEDON V3 — Canonical Specification

## Status
**IMMUTABLE LAW — V3**
Version: 0.1.0
Date: 2026-04-16

This document is the **single source of truth** for KELEDON V3.
It documents the current implementation AND defines the future roadmap.

---

## 1. IDENTITY

### 1.1 What KELEDON Is

KELEDON is a **desktop-first autonomous voice agent system** that operates through an Electron application with embedded browser views.

Its purpose is:
1. **Desktop Agent** - Electron-based desktop application with Chrome-like tab system
2. **Cloud Brain** - Centralized decision engine in the cloud
3. **RPA Automation** - AutoBrowse-based browser automation for vendor portals
4. **Voice Agent** (Future) - Real-time voice conversations via WebRTC

### 1.2 User Vision

> "Keledon Browser = Chrome that receives prompts from brain and executes RPA automatically"

### 1.3 Architecture Summary

```
┌─────────────────────────────────────────────────────────────┐
│                     KELEDON CLOUD                            │
│   (NestJS + PostgreSQL + Prisma)                            │
│   - CRUD for Keledons, Teams, Vendors                        │
│   - Device pairing & authentication                          │
│   - Decision engine (future: with vector grounding)         │
└──────────────────────────┬──────────────────────────────────┘
                           │
                    HTTPS + WebSocket
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                 KELEDON DESKTOP AGENT                        │
│   (Electron + BrowserView)                                  │
│   - Tab management (create/switch/close)                   │
│   - AutoBrowse RPA engine via CDP                           │
│   - Escalation system (triggers, modal)                     │
│   - Vendor auto-login                                       │
│   - Voice/WebRTC (stubbed, future impl)                    │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. SYSTEM COMPONENTS

### 2.1 Cloud Backend (`cloud/`)

| Component | Technology | Purpose |
|-----------|------------|---------|
| Backend | NestJS | REST API, WebSocket server |
| Database | PostgreSQL + Prisma | Persistent data |
| Auth | JWT + Google OAuth | User authentication |
| Deployment | Railway | Auto-deploy on git push |

#### Database Schema (Prisma)

**Core Entities:**
- `Company` - Organization
- `Brand` - Company brand
- `Team` - Team with escalation triggers
- `User` - Users with roles
- `Device` - Desktop agent devices
- `Keledon` - AI agent configuration
- `Vendor` - Vendor portal credentials

**Workflow Entities:**
- `Flow` - RPA flow definitions
- `FlowStep` - Individual steps
- `Workflow` - Trigger-based workflows
- `FlowRun` - Execution records

**Session Entities:**
- `Session` - Conversation sessions
- `Event` - Session events

### 2.2 Desktop Agent (`browser/`)

```
browser/
├── src/
│   ├── main.ts          # Main process (Electron)
│   ├── preload.ts       # Context bridge (IPC)
│   ├── autobrowse-bridge.ts  # AutoBrowse integration
│   └── renderer/
│       └── index.html   # UI (tab bar, escalation modal)
├── lib/
│   └── autobrowse/      # RPA engine
│       └── src/
│           ├── worker/     # Goal execution
│           ├── browser/    # CDP browser manager
│           └── ai/         # AI matching
└── package.json
```

### 2.3 Landing (`landing/`)

- React + Vite Admin UI
- Login page with version display
- Dashboard for managing Keledons, Teams, Vendors

---

## 3. CURRENT IMPLEMENTATION

### 3.1 Tab System

**Technology:** Electron BrowserView

**Features:**
- Create tabs with name + URL
- Switch between tabs
- Close tabs
- Home tab (file://renderer/index.html)
- Tab bar UI in renderer

**Implementation:**
- `main.ts:createTab()` - Creates BrowserView
- `main.ts:showTab()` - Switches active view
- `main.ts:closeTab()` - Removes view
- `preload.ts:tabs.*` - IPC bridge

### 3.2 Deep Link Protocol

**Scheme:** `keledon://`

**URL Format:**
```
keledon://launch?keledonId={id}&code={code}&userId={userId}&timestamp={ts}&signature={sig}&cloudUrl={url}
```

**Validation:**
- Timestamp max 60 seconds old
- HMAC-SHA256 signature validation
- Auto-connect on valid launch

### 3.3 Device Pairing

**Flow:**
1. Cloud generates pairing code (`POST /api/crud/keledons/{id}/pairing-code`)
2. Desktop opens deep link with code
3. Desktop calls `POST /api/devices/pair`
4. Cloud returns auth_token + config
5. WebSocket connection established

**Response Includes:**
- `auth_token` - JWT for API auth
- `keledon_id` - Linked Keledon
- `team` - Team config including escalationTriggers
- `vendors` - Vendor list for auto-login

### 3.4 Escalation System

**Trigger Types:**
1. **Keyword Trigger** - User says escalation keywords
2. **Failure Trigger** - RPA step fails

**Trigger Keywords (Default):**
```
sue, lawsuit, court, lawyer, attorney, complain, manager, supervisor, media, news, journalist, social media
```

**Team Configurable:**
- Stored in `Team.escalationTriggers` (String[])
- Configurable per team via Admin UI

**Modal Actions:**
- `continue` - Proceed with session
- `fix` - Retry the failed action
- `abort` - End session, escalate to human

### 3.5 Vendor Auto-Login

**Flow:**
1. On successful pairing, cloud returns vendor list
2. Desktop auto-opens vendor URL in NEW TAB
3. AutoBrowse executes login goal (username/password or API key)
4. Login status sent to renderer

**Security:**
- Credentials decrypted at runtime
- Encryption key from environment variable

### 3.6 AutoBrowse RPA

**Integration:**
- CDP (Chrome DevTools Protocol) mode
- Goal-based execution via orchestrator
- Steps: navigate, click, type, select, wait, scroll

**IPC:**
- `executor:executeGoal(goal, context)` - Execute goal
- `executor:executeSteps(steps, context)` - Execute predefined steps
- `executor:getCDPUrl()` - Get CDP WebSocket URL
- `executor:getUrl()` - Get current browser URL

### 3.7 WebSocket Communication

**Device Socket:** `device` namespace
- Events: escalation alerts, status updates
- Two-way: device ↔ cloud

**Agent Socket:** `agent` namespace
- Commands from cloud
- Forwarded to renderer

---

## 4. FUTURE ROADMAP

### 4.1 Voice/WebRTC Implementation

**Current State:** Stubbed (media layer is no-op)

**Target Architecture:**
```
┌─────────────────────────────────────────────────────────────┐
│                   DESKTOP AGENT                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐    │
│  │  WebRTC     │  │  STT        │  │  TTS            │    │
│  │  Handler    │─▶│  (VOSK)     │─▶│  (ElevenLabs)   │    │
│  └─────────────┘  └─────────────┘  └─────────────────┘    │
└─────────────────────────────────────────────────────────────┘
         │                   │                   │
         ▼                   ▼                   ▼
      Remote            Cloud Brain         Audio Output
      Caller              via WS              to Caller
```

**STT Providers:**
| Priority | Provider | Type | Cost |
|----------|----------|------|------|
| 1 | VOSK Server | Local | Free |
| 2 | Web Speech API | Browser | Free |
| 3 | Deepgram | Cloud | Paid |

**TTS Providers:**
| Priority | Provider | Type | Cost |
|----------|----------|------|------|
| 1 | ElevenLabs | Cloud | Paid |
| 2 | Web Speech API | Browser | Free |

### 4.2 Vector Store Integration

**Purpose:** Cloud brain grounding

**Target:** Qdrant (vector database)

**Flow:**
1. User text → Cloud receives via WebSocket
2. Cloud queries Qdrant for context
3. LLM generates response with context
4. Cloud sends command + optional RPA steps

### 4.3 Transcript Monitoring

**Implementation:**
- Monitor all STT output for escalation keywords
- Real-time check against team.escalationTriggers
- Trigger modal on match

---

## 5. API CONTRACTS

### 5.1 Device Pairing

**Generate Pairing Code:**
```
POST /api/crud/keledons/{keledonId}/pairing-code
Response: { pairingCode: string, expiresAt: string }
```

**Pair Device:**
```
POST /api/devices/pair
Body: {
  device_id: string,
  machine_id: string,
  pairing_code: string,
  platform: string,
  name: string,
  keledon_id: string
}
Response: {
  auth_token: string,
  keledon_id: string,
  team: { id, name, escalationTriggers: string[] },
  vendors: Vendor[]
}
```

### 5.2 Launch Keledon

```
POST /api/crud/keledons/{keledonId}/launch
Body: { userId: string }
Response: { url: string } // Deep link URL
```

### 5.3 Health Check

```
GET /health
Response: { status: string, version: string }
```

---

## 6. DEPLOYMENT

### 6.1 Railway Deployment

**Rule:** Push-based only. No CLI deployment.

**Flow:**
1. Commit version bump
2. Push to `main`
3. Railway auto-deploys (~7 min)
4. Verify: `curl https://keledon.tuyoisaza.com/health`

### 6.2 Version Management

**Files to Update:**
- `cloud/package.json`
- `browser/package.json`
- `landing/package.json`
- `VERSION.txt`

**Format:** `v0.1.{N}`

---

## 7. DEPRECATED

### 7.1 V1/V2 Specs

The following specs are now deprecated:
- `KELEDON_CANON_V2.md` - Chrome extension architecture
- `keledon_v_1_canonical_technical_spec.md` - Original voice agent spec
- `keledon_canonical_architecture.md` - Extension-based architecture

### 7.2 Technology Decisions

| Deprecated | Replacement |
|------------|-------------|
| Chrome Extension MV3 | Electron Desktop App |
| Supabase | Prisma + PostgreSQL |
| SQLite | PostgreSQL (Railway) |
| VOSK as primary (V1) | VOSK for STT (future) |

---

## 8. GOVERNANCE

### 8.1 Version

This spec: **0.1.0**

### 8.2 Change Policy

Changes require:
- GitHub Issue
- Human approval
- Version bump

---

**End of KELEDON V3 Canonical Specification**