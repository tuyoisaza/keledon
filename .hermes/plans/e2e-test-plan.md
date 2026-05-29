# KELEDON v0.3.0 E2E Test Plan

## Scope
Test the full end-to-end call loop from both sides:
1. **Cloud API** — endpoints, auth, command queue, knowledge CRUD
2. **Browser (simulated)** — HTTP command polling, RPA flow execution logic
3. **Full loop** — simulate a call lifecycle via API commands

## Environment
- API: keledon-api-production.up.railway.app
- Web: keledon.tuyoisaza.com
- Browser: local WSL (npm run build + TypeScript verification)

## Test Sequence
1. Health & readiness
2. Auth challenge (401 expected, endpoint exists)
3. Knowledge CRUD endpoints
4. Call orchestration endpoints
5. Browser command queue (POST command, poll, retrieve result)
6. RPA flow execution (unit-level, simulated)
7. Full call loop simulation (call_start → call_transcript → call_decide → rpa_flow → call_close)
