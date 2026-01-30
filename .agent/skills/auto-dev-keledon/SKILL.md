---
name: auto-dev-keledon
description: Implements and stabilizes the KELEDON platform according to predefined architecture, contracts, and operational principles. Use for autonomous development tasks where determinism, auditability, and strict separation of concerns are required.
---

# AUTO-DEV-KELEDON Skill

This skill extends the agent with KELEDON-specific autonomous development behavior. It is intentionally conservative and architecture-driven. The agent must follow these instructions whenever working on KELEDON codebases.

## When to use this skill

Use this skill when:

*   Working on the KELEDON platform (Cloud, Browser Agent, Admin UI).
*   Implementing features derived from existing KELEDON architecture or journeys.
*   Resuming development based on KELEDON artifacts and logs.
*   Stabilizing, refactoring, or verifying KELEDON components.

Do not use this skill for generic SaaS or exploratory product development.

## Core invariants (non-negotiable)

The agent must enforce all of the following at all times:

1.  **Cloud decides, Agent executes**
    *   Decision logic, orchestration, RAG, and state machines live in Cloud.
    *   Browser/Desktop agents execute deterministic flows only.

2.  **No AI in execution layers**
    *   No LLMs, heuristics, computer vision, or auto-healing in agents.

3.  **Contracts are first-class**
    *   Cloud ↔ Agent contracts are explicit and versioned.
    *   Never change a contract silently.

4.  **Determinism over cleverness**
    *   Broken behavior must be fixed explicitly or re-recorded.
    *   Probabilistic execution paths are forbidden.

## Required artifacts

Before proceeding, verify the presence and consistency of these files:

*   `ARCHITECTURE.md`
*   `CONTRACTS.md`
*   `FLOWS.md`
*   `STAGE_1_DEVELOPMENT_LIST.md`
*   `PRODUCTION_GRADE_EXECUTION_LOG.md`
*   `FEATURES.md`

Execution logs are append-only. Never overwrite.

If required artifacts are missing or contradictory, stop and request clarification.

## How to work (step-by-step)

### 1. Initialization

*   Read architectural and journey documents.
*   Detect the existing stack and tooling.
*   Confirm no forbidden patterns exist (AI in agent, heuristic DOM logic).

### 2. Task selection

*   Select the next task from `STAGE_1_DEVELOPMENT_LIST.md`.
*   Ensure the task derives from architecture, contracts, or journeys.
*   If the task implies inventing behavior, mark it as BLOCKED.

### 3. Planning

*   Respect file size limits (≤ 600 lines).
*   Keep modules isolated.
*   Identify affected contracts and verify versioning.
*   Define explicit success criteria (build, tests, logs).

### 4. Execution

*   Implement exactly what is specified.
*   Do not refactor unrelated code.
*   Guard new behavior with feature flags (OFF by default).
*   Append a detailed entry to `PRODUCTION_GRADE_EXECUTION_LOG.md`.

### 5. Verification

*   Build and typecheck must pass.
*   Contract schemas must remain valid or be versioned.
*   Add or update tests at Cloud ↔ Agent boundaries.
*   If regressions occur, isolate or roll back. Do not patch blindly.

## UI rules

Every UI element must be in exactly one state:

*   **Functional** — implemented and wired.
*   **Explicit stub** — disabled, labeled, and linked to a task.
*   **Removed** — not present in production UI.

No UI element may silently imply functionality.

## RAG & knowledge constraints

*   Qdrant is used only for decision support (intent, policy, context).
*   Flows, selectors, and execution logic must never live in RAG.
*   Agent code must never query RAG.

## Stop conditions

Stop and request human input when:

*   Architectural documents conflict or are missing.
*   A task requires inventing product behavior.
*   A contract must change without a versioning plan.
*   Deterministic execution cannot be guaranteed.

## Guiding principle

This skill is intentionally conservative.

**AUTO-DEV-KELEDON does not invent. It implements.**
