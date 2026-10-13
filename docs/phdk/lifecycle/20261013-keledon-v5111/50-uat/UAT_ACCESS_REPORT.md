# UAT access and provenance — KELEDON 5.1.12

Candidate `ca34792`; local production-built SPA served on loopback, Microsoft Edge headless through Playwright. The harness blocks external HTTP and WebSockets and intercepts API calls with synthetic Company Co/Other Co fixtures. Each role has a new browser context; synthetic session markers are not credentials. Browser and server close in test cleanup.

| Persona | Access method | State |
|---|---|---|
| Anonymous | Local `/login` and `/` in a clean context | Verified UI only |
| Guest | Synthetic `guest` fixture context; API intercepted | Frontend denial verified; backend contract separately covered by API regression |
| Coordinator, admin, superadmin | Separate synthetic contexts; APIs intercepted | Selected rendered journeys verified; no real authentication or persisted role |
| User, agent | No dedicated rendered context in this UAT | Backend isolated regression only; browser access unverified |

No accounts were provisioned, no credentials or MFA data were collected, and there are no cleanup obligations beyond automatic closure of the synthetic browser contexts. No database, production account, real provider, email, customer data, OAuth provider, or paid call was contacted. Native Electron/device/audio and deployed SEO/AEO acceptance were not run.
