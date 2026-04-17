# KELEDON End-to-End Testing Plan

## Overview
This document defines QA scenarios and acceptance criteria for verifying KELEDON Cloud and Browser work end-to-end.

## Test Scope
- **Cloud**: Health, REST APIs, WebSocket, escalation, session persistence
- **Browser**: Launching, pairing, tab management, vendor auto-login, escalation UI
- **Landing**: UI load, health/status integration

## High-Priority QA Scenarios

### 1. Cloud Health Check
**Purpose**: Verify cloud backend is operational.

**Steps**:
```bash
curl -s https://keledon.tuyoisaza.com/health | jq .
```

**Acceptance**:
- HTTP 200
- JSON response with `status: "ok"`
- `versions` field present

### 2. Escalation Flow
**Purpose**: Verify escalation triggers, logs, and resolves end-to-end.

**Steps**:
1. Trigger escalation via WebSocket or REST (simulate keyword trigger)
2. Check `GET /api/escalations/stats`
3. Acknowledge escalation via `POST /api/escalations/:id/acknowledge`
4. Resolve escalation via `POST /api/escalations/:id/resolve`

**Acceptance**:
- Escalation created with correct status
- Stats endpoint returns count
- Acknowledge updates status to `acknowledged`
- Resolve updates status to `resolved`

### 3. Browser Launch & Pairing
**Purpose**: Verify browser can receive a launch URL and connect.

**Steps**:
1. Generate pairing code via `POST /api/crud/keledons/:id/pairing-code`
2. Launch browser with `keledon://launch?...` deep link
3. Verify WebSocket connection to cloud

**Acceptance**:
- Pairing code returned
- Browser connects and receives team config

### 4. Vendor Auto-Login
**Purpose**: Verify vendor credentials flow and login executes.

**Steps**:
1. Pair browser with team that has vendor credentials
2. Verify vendor URL opens in new tab
3. Check login steps execute (via CDP or logs)

**Acceptance**:
- Vendor URL loaded
- Login steps execute without error

### 5. Landing Health Integration
**Purpose**: Verify landing shows correct health status.

**Steps**:
1. Load landing dashboard
2. Check agent status indicators

**Acceptance**:
- UI loads without error
- Status reflects actual cloud state

## Runbook

### Prerequisites
- Cloud deployed and accessible (`https://keledon.tuyoisaza.com`)
- Browser built and extracted
- Landing deployed
- `jq` installed for JSON inspection

### Execution
```bash
# 1. Health check
curl -s https://keledon.tuyoisaza.com/health | jq .

# 2. Escalation stats
curl -s https://keledon.tuyoisaza.com/api/escalations/stats | jq .

# 3. Cloud version
curl -s https://keledon.tuyoisaza.com/health | jq '.versions'
```

## Test Artifacts
- **Evidence**: JSON output, screenshots, logs
- **Storage**: `docs/runbooks/e2e-tests/` folder

---
**End of Testing Plan**