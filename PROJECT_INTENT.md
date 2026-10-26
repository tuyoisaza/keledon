## Current implementation boundary — 5.9.0 / 2026-10-26
The Windows interaction-agent intent remains unchanged. This slice adds an explicitly armed, foreground automatic cycle with a two-minute non-renewing lease, at most twelve actions and four planner steps per objective. Incoming signal configuration requires interface confirmation; optional acoustic evidence currently comes from Meet remote audio, not universal Windows loopback. Configured read-only search/navigation and mapped accept/end-call controls are permitted; record writes are not. Missing policies default to observation only.
Voice identity, language/region, speed and genuinely provider-supported style are configurable per team with company-owned profiles. Spanish OS voices are not the final voice dependency. No provider is changed by this delivery. Real remote hearing, interruption, second interaction and client CRM evidence remain a separate explicitly requested UAT.

---

# KELEDON project intent
Status: brownfield baseline; current owner-directed Windows Meet + Salesforce MVP, 2026-10-18.

## Current owner intent — Windows interaction agent, 2026-10-18
An agent waits on a Windows workstation, perceives an incoming interaction (including an acoustic alert), confirms the interface/context, converses using the Cloud Brain's script and knowledge, operates the configured CRM, reports observed results and returns to standby. The interlocutor can interrupt generated speech. Business objectives and observations, rather than a fixed click script for every customer, drive the workflow; provider-specific capabilities still require adapters and actual evidence.

Start with real Google Meet and Salesforce using fictitious cases. No simulated telephony/CRM replacement. Meet proves conversation/audio, not Genesys-style ACD call offering; acoustic activation requires interface confirmation. Genesys is available for a later detection/answering proof and is not universal.

The owner explicitly reopens executor architecture: evaluate Electron against a standard browser plus a Windows component, with native accessibility where necessary. Retaining Electron is no longer a constraint for this MVP. Preserve Cloud business authority, tenant/security policies and useful working components; do not perform a wholesale rewrite merely from a hypothesis. This current decision supersedes older preserve-Electron/no-architecture-reevaluation wording for this experiment. Historical docs/specs remain unchanged; target departure is tracked in ADR-MVP-001.

See [feature intent](docs/intents/windows-meet-salesforce-mvp-intent.md) and [MVP plan / five PIAs](docs/mvp/meet-salesforce/README.md). Owner supplied a private Meet link and confirmed a second-device interlocutor; Salesforce URL/session, fictitious cases and existing Brain/provider readiness remain prerequisites. Neither documentation nor host inventory proves live audio.

## Owner-confirmed security and integration decisions — 2026-10-14
New email/Google accounts receive the `user` role. Only an existing superadmin may grant elevated roles or company assignments. Admin/coordinator may administer only their own company and cannot elevate roles or delete companies. API actors and tenant scope are resolved from current database state; normal responses never return stored secrets, and configured credentials are replaced without being returned. Each client selects its own call platform and CRM. Client-configured private/local CRM origins are permitted only after URL validation and tenant-scoped origin allowlisting. The 2026-10-14 scope focused on source conformance and client-agnostic contracts; the current MVP scope is defined above. No CRM vendor is universal.
## Purpose / ethos
INT-001: autonomous inbound contact-center assistance with cloud-governed policy and verified execution through interchangeable Windows/browser adapters.
INT-002: operators understand readiness/failures/outcomes from truthful sanitized evidence.
INT-003: tenant administrators manage permitted resources without exposing other tenants or secrets.
## Problem, users and jobs
Operators need reliable voice/CRM assistance; administrators safe configuration; owners traceable delivery rather than stale reports. Launch/pair, prepare configured vendors, handle voice turns, execute approved CRM actions, summarize/dispose and recover to standby. Manage company/team/user/provider resources with least privilege.
## Objectives / success measures
Preserve the four commitments while prioritizing the owner-directed MVP: remote caller heard and audible TTS returned, effective interruption, exact fictitious-case lookup, grounded spoken reply, recovery and standby. Success requires real-platform production acceptance and verified source delivery; source review is not functional acceptance. Timing targets are proposed experimental criteria, never claimed measurements.
## Principles / constraints
Cloud decides business actions; authorized adapters execute and report evidence. Preserve React/Vite, NestJS, Prisma and useful contracts; Electron is a candidate. Existing tenant/role/secret/origin policies remain. docs/specs/ are historical canonical material retained unchanged; record the new target and owner provenance in architecture decisions. No local application tests/build/lint. Real Meet/Salesforce testing uses the provided environments, fictitious records and owner-authenticated sessions; no customer data, unapproved paid usage, CRM mutations, provider writes, driver installation, schedules, forced updates or parallel floor restoration.
## Non-goals
No wholesale platform rewrite, fake telephony/CRM, Mac/AppleScript-first solution, CRM writes, bot restoration or unsupported universal-provider/live-call claims. Architecture experiments and the scoped MVP roadmap are explicitly authorized.
## Risks / tensions
Legacy/current trees, stale task/version/workflow instructions, unavailable live vendor/media prerequisites. Material new security policy needs concrete review.
## Evidence / provenance
Owner 'PHDK auto' then 'Los cuatro, en ese orden'; docs/specs/v4_KELEDON_CANON.md and v4_KELEDON_BROWSER.md establish intent; source/Dockerfiles establish implementation, not live behavior.
## Open questions
No repeated intent interview needed. Execution inputs: Salesforce URL/session, two fictitious cases and expected states, existing tenant/Brain/provider readiness and observed audio capabilities. Meet link and second-endpoint participation are supplied privately. See the MVP runbook; do not store meeting links or authentication material in Git.
