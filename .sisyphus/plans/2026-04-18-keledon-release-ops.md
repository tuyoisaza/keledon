## Plan Title
- KELEDON Release & Ops Convergence (Phase 1: 1-5 focus)

## TL;DR
- Establish a concrete, auditable plan to (1) prune legacy branches, (2) implement a robust release automation for cloud+browser, (3) define a Windows signing strategy, (4) establish end-to-end testing, and (5) fortify the documentation spine.

## Context
- The project spans KELEDON Cloud, KELEDON Browser (desktop Electron app), and KELEDON Landing. We need ordered, repeatable workflows to ensure release reliability and governance, while reducing branch noise.

## Goals
- Remove dead branches and establish archive policy.
- Implement a minimal but solid release workflow for versioned artifacts and a latest alias.
- Define and begin implementing a Windows code-signing plan.
- Create a baseline for end-to-end testing and production-readiness verification.
- Strengthen documentation governance and ensure docs reflect the current state and plan.

## Scope Boundaries
- IN: Branch hygiene, release workflow, Windows signing plan, testing framework plan, documentation governance.
- OUT: Full implementation of CI/CD pipelines (Phase 2) and production-grade code signing pipelines (Phase 3).

## Phase 1: Branch Hygiene & Governance
- Deliverable: Branch Hygiene policy document and a one-time archive+delete run.
- Actions:
  1. List branches with last activity and age.
  2. Archive old, unused branches to archive/BRANCHNAME or delete as approved.
  3. Publish a short Governance document: what to archive, cadence, and how to request exceptions.
- Acceptance Criteria:
  - Archive policy created and applied to a subset of branches; no loss of active work.
  - A patch is created with the policy and a script to enact it.

## Phase 2: Release Automation & Versioning
- Deliverable: A plan and minimal GitHub Actions skeleton for publishing vX.Y.Z releases with assets ZIP and NSIS EXE, plus landing update hooks.
- Actions:
  1. Define version bump policy and ensure assets are published to both versioned tag and latest release.
  2. Create a landing patch that points to the latest version and a versioned URL, both opening in new tabs.
  3. Create a repo skeleton for a Release CI (build browser artifacts, publish to GitHub Releases).
- Acceptance Criteria:
  - Versioned release contains ZIP and EXE assets.
  - Landing page links updated to new URLs and opened in new tab.

## Phase 3: Windows Signing Plan
- Deliverable: Signing policy document and gating rules for CI.
- Actions:
  1. Decide Azure Trusted Signing vs EV cert.
  2. Draft the signing workflow and updates to the NSIS build pipeline.
- Acceptance Criteria:
  - Signing plan documented and approved.
  - A webhook/gate exists to require signed binaries before release (in future steps).

## Phase 4: Testing & Production Readiness
- Deliverable: Cloud+Browser end-to-end testing plan and runbooks.
- Actions:
  1. Define end-to-end test scenarios covering escalation, vendor login, pairing, and landing health checks.
  2. Create QA scenarios in plan templates (with explicit selectors and data).
- Acceptance Criteria:
  - At least one end-to-end test scenario is defined and assigned.
  - A runbook exists for production readiness checks.

## Phase 5: Documentation Spine
- Deliverable: A consolidated docs plan, alignment to KELEDON_V3, and a runbook for releases.
- Actions:
  1. Update docs/specs with a Release & Governance appendix.
  2. Create cross-linking index between cloud, browser, and landing docs.
- Acceptance Criteria:
  - 1–2 new docs prepared and linked; cross-referenced in the index.

## Risks and Mitigations
- Risk: Release automation complexity grows; mitigation: implement in iterative waves with a minimal viable workflow.
- Risk: Signing costs and process delays; mitigation: start with a policy and a pilot signing plan.
- Risk: Branch pruning mistakes; mitigation: archive-first approach with a reversible patch, and a review step.

## Ownership & Timeline
- Owner: Prometheus (Planner) with collaboration from Cloud, Browser, and Landing subteams.
- Target: complete Phase 1 milestones within 2 weeks; Phase 2+ on a rolling cadence.

Plan saved to: .sisyphus/plans/2026-04-18-keledon-release-ops.md
