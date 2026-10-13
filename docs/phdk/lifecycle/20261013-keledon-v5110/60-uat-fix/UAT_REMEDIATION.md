# UAT remediation — 20261012-keledon-four-fronts

## UAT-FIX-001 — detail dialog keyboard containment
Initial local browser UAT FAILED at local-uat.test.cjs:91: Tab from the only close control did not remain inside the native dialog. This failure is preserved here; no PASS inferred from HTMLDialogElement.
Root cause: relying solely on native modal inertness did not establish desired Tab wrapping.
Fix: explicit first/last focus wrapping on Tab/Shift+Tab; retain native Escape/close and opener restoration.
Retest: pending exact rebuilt v5.0.54 candidate. Other completed assertions before failure: diagnostic dimensions, copy success/revert/failure, owned state reset, mobile login and public mount.

## UAT-HARNESS-001 — provider loading transition
Second run passed dialog containment/focus for all three manager roles, then the test predicate dereferenced an input temporarily absent during legitimate config reload. Fixed predicate to await element reappearance; no provider behavior weakened. Retest pending.

## UAT-FIX-001 — Browser permission auto-grant (5.1.10)

Finding: the Electron main process granted every permission request without user consent. This allowed a customer tab to request device capabilities outside the approved diagnostic/voice experience.

Fix: introduced an isolated permission policy. Only HTTPS getUserMedia requests in the Browser media context can proceed to an explicit native consent dialog. The dialog identifies requester and top-level site; consent lasts for the session and is checked against the current page after the prompt. Navigation races, non-secure origins, and every unrelated permission are denied. Development skips updater network checks.

Retest: PASS for source-policy tests (5 cases) and full Browser regression (24/24); TypeScript build passes. After owner authorization, Electron 44.7.0 launched and the v5.1.10 renderer loaded. Windows app control was unavailable, so the native permission dialog and microphone/audio acceptance remain untested.

## PHDK line-limit remediation — 5.1.10

Source Check identified six API files at/above the 600-line cap. Extracted gateway contracts, device escalation handlers, voice WebRTC handlers, TTS HTTP providers, database backup storage, and the approved management-policy test harness into focused modules. Added backup lifecycle and mocked HTTP-provider regression coverage. A fresh inventory scanned 1,086 application/test source files and found zero at/above 600 lines. API build and 14/14 regression suites pass.
