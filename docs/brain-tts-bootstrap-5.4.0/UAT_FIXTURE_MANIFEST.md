# Production synthetic fixture manifest — 5.4.1

Status: NOT YET PROVISIONED. Use explicit Brain “Preparar cuentas sintéticas” with configured selected TTS team. Run ID prefix brain-tts-UUID, 3 generated .invalid accounts, 2 generated Company Co company/brand/team trees, no passwords/devices/provider credentials. No existing account or provider settings mutation. Maximum one active run, three runs/hour globally, 15-minute account TTL.

Provisioning and issuance audit: BRAIN_TTS_SYNTHETIC / TTS_SYNTHETIC_CREATED and TTS_SYNTHETIC_SESSIONS_ISSUED. Request events TTS_SYNTHETIC_REQUEST contain team only, no spoken text or tokens. Cleanup event TTS_SYNTHETIC_RETIRED. Exact IDs/outcomes pending actual execution; never infer provisioned from source.
