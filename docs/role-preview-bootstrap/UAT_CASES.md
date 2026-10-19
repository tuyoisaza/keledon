# Scoped production acceptance cases — 5.5.0

- BOOT: original operator creates an isolated synthetic selector-only session without changing real identity or fixture ownership; new tab shows synthetic superadmin and exact version.
- UI-USER / UI-AGENT / UI-ADMIN / UI-COORDINATOR: select each actual role, enter profile, verify banner/role/navigation and refresh, return to synthetic superadmin and verify role list returns.
- API: explicit finite in-product panel verifies four actual identities, reads, synthetic-only denied writes, Company Co B denial, forbidden switch/TTS, return, revoked credential and idempotent return; genuine operator expiry probe and final identity.
- CLEANUP: original operator retires owned fixtures; old operator and retained preview credential both return 401. Operator human identity remains unchanged.
- REUSE: optional second explicit bootstrap reuses fixture/identity IDs after retirement and still requires fresh grant; retire again.
- Responsive/keyboard: on connected browser use actual controls and inspect appropriate desktop/mobile layouts; restore temporary viewport.

Required source: b8a55ad4e434393645b137b6ae5b26f0f45835c9 / PR #280. No PASS until observed. These cases cover the current requested role selector; they do not claim product-wide UAT or unexecuted database role/membership-edit scenarios.
