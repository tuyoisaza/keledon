# KELEDON End-to-End Test Scenarios

## Test Environment
- **Base URL**: https://keledon.example.com
- **Browser**: Chrome 120+ (headless for CI)
- **Timeout**: 30s per action

## Scenario 1: Escalation Flow

### Purpose
Verify escalation workflow from user to vendor representative

### Steps
1. **Login as User**
   - Navigate to `/login`
   - Enter credentials (test user)
   - Click login button
   - Expected: redirect to `/dashboard`

2. **Start Escalation Request**
   - Navigate to `/sessions`
   - Click "New Session" button
   - Enter escalation reason in modal
   - Click "Escalate"
   - Expected: session created, status = "escalated"

3. **Verify Vendor Notification**
   - Poll `/api/sessions/{id}` for vendor_assigned
   - Expected: vendor_assigned = true within 60s

### Selectors
- Login: `[data-testid="login-email"]`, `[data-testid="login-password"]`, `[data-testid="login-submit"]`
- Sessions: `[data-testid="new-session-btn"]`, `[data-testid="escalation-reason"]`, `[data-testid="escalate-btn"]`

### Test Data
- Test user: `escalation-user@test.keledon`
- Password: `TestPassword123!`

---

## Scenario 2: Vendor Login Flow

### Purpose
Verify vendor-facing login and session access

### Steps
1. **Navigate to Vendor Login**
   - Navigate to `/vendor/login`
   - Enter vendor credentials
   - Click login
   - Expected: redirect to `/vendor/dashboard`

2. **View Escalated Sessions**
   - Navigate to `/vendor/sessions`
   - Filter by: status = "escalated"
   - Expected: list loads, shows escalated session

3. **Accept Session**
   - Click first escalated session
   - Click "Accept" button
   - Expected: session status = "in_progress"

### Selectors
- Vendor login: `[data-testid="vendor-email"]`, `[data-testid="vendor-password"]`
- Accept button: `[data-testid="accept-session-btn"]`

### Test Data
- Vendor user: `vendor@test.keledon`
- Password: `VendorPass123!`

---

## Scenario 3: Pairing Flow (Browser Extension)

### Purpose
Verify extension can pair with cloud session

### Steps
1. **Create Cloud Session**
   - POST to `/api/sessions`
   - Extract session_id and pairing_token

2. **Launch Extension**
   - Open Chrome extension popup
   - Click "Pair" button
   - Enter pairing_token
   - Click confirm
   - Expected: status changes to "paired"

3. **Verify Bidirectional Communication**
   - Send test command from cloud: `{"type":"ping"}`
   - Wait for response: `{"type":"pong"}`
   - Expected: response received within 10s

### Selectors
- Extension: `[data-testid="pair-btn"]`, `[data-testid="pairing-input"]`
- Status indicator: `[data-testid="connection-status"]`

---

## Scenario 4: Landing Page Health Check

### Purpose
Verify landing page loads and displays correctly

### Steps
1. **Verify Page Load**
   - Navigate to `/`
   - Wait for content
   - Expected: no console errors

2. **Verify Key Sections Present**
   - Hero section visible
   - Download button visible
   - Navigation links work

3. **Verify Download Link**
   - Click download button
   - Expected: redirects to GitHub releases or triggers download

### Selectors
- Hero: `[data-testid="hero-section"]`
- Download: `[data-testid="download-btn"]`
- Navigation: `[data-testid="nav-links"]`

### Test Data
- Download URL format: `https://github.com/tuyoisaza/keledon/releases/latest`

---

## Production Readiness Checklist

- [ ] All scenarios pass on staging
- [ ] No console errors in CI
- [ ] Database connection stable
- [ ] WebSocket connections established within 5s
- [ ] All API endpoints return 200 or 401 (not 500)
- [ ] Landing page loads in <3s

---

## Last Updated
- 2026-04-17