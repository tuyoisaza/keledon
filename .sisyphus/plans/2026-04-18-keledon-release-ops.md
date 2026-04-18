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

-## Phase 1: Branch Hygiene & Governance
- Deliverable: Branch Hygiene policy document and a one-time archive+delete run.
- QA Scenarios:
  - Scenario: Validate archive policy execution
    - What to verify: branches listed by activity, archive path created, subset archived, no active work lost
    - Tools: git, shell script
    - Steps:
      1. List branches with last activity and age
      2. Run archive/delete on selected branches
      3. Verify archive directory exists and that active branches remain untouched
    - Acceptance Criteria:
      - Archive policy is applied to a subset without affecting active work
      - A patch or script is generated to reproduce the policy

- Actions:
  1. List branches with last activity and age.
  2. Archive old, unused branches to archive/BRANCHNAME or delete as approved.
  3. Publish a short Governance document: what to archive, cadence, and how to request exceptions.
- Acceptance Criteria:
  - Archive policy created and applied to a subset of branches; no loss of active work.
  - A patch is created with the policy and a script to enact it.

-## Phase 2: Release Automation & Versioning
- Deliverable: A plan and minimal GitHub Actions skeleton for publishing vX.Y.Z releases with assets ZIP and NSIS EXE, plus landing update hooks.
- QA Scenarios:
  - Scenario: Dry-run release and verify artifacts
    - What to verify: version bump policy applied, assets ZIP and NSIS EXE created, landing patch updated
    - Tools: shell scripts, GitHub Actions runner, NSIS builder
    - Steps:
      1. Trigger a dry-run release workflow
      2. Check that assets contain ZIP and NSIS EXE for version X.Y.Z
      3. Verify landing page update URLs open in new tab
    - Acceptance Criteria:
      - Release skeleton runs without errors; assets present; landing patch references updated URLs
- Actions:
  1. Define version bump policy and ensure assets are published to both versioned tag and latest release.
  2. Create a landing patch that points to the latest version and a versioned URL, both opening in new tabs.
  3. Create a repo skeleton for a Release CI (build browser artifacts, publish to GitHub Releases).
- Acceptance Criteria:
  - Versioned release contains ZIP and EXE assets.
  - Landing page links updated to new URLs and opened in new tab.

-## Phase 3: Windows Signing Plan
- Deliverable: Signing policy document and gating rules for CI.
- QA Scenarios:
  - Scenario: Validate signing gating in CI
    - What to verify: policy document exists, CI gating triggers on build, unsigned binaries are blocked
    - Tools: CI environment, NSIS build, signing script
    - Steps:
      1. Ensure signing policy doc is present and referenced by CI
      2. Run a test build without signing to confirm gating blocks it
      3. Run a signed build and verify successful release artifact generation
    - Acceptance Criteria:
      - Gating prevents unsigned binaries from proceeding to release
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

-## Phase 5: Documentation Spine
- Deliverable: A consolidated docs plan, alignment to KELEDON_V3, and a runbook for releases.
- QA Scenarios:
  - Scenario: Validate docs alignment
    - What to verify: KELEDON_V3 alignment; cross-links between cloud, browser, and landing docs
    - Tools: Documentation repo browser, grep-like search
    - Steps:
      1. Open docs plan and verify sections present
      2. Check cross-link references point to correct docs versions
    - Acceptance Criteria:
      - At least 1-2 new docs created and cross-referenced
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

## Blocking Issues from Momus Review
- QA Scenarios missing for Phase 1, Phase 2, Phase 3 and Phase 5. Add explicit steps, tools, and expected outcomes per task.
- Ensure all tasks have explicit acceptance criteria tied to verifiable commands or outputs.
- Phase 1–3 QA coverage to be aligned with Phase 4 runbooks.
