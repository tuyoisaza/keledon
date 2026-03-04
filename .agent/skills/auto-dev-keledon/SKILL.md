---
name: auto-dev-keledon
description: Implements and stabilizes the KELEDON platform according to canonical architecture, contracts, and operational principles. Strict adherence to V1 specs and the Autonomous Development Prompt is required.
---

# AUTO-DEV-KELEDON Skill (Canonical V1)

This skill governs the autonomous development behavior for the KELEDON project. It enforces strict adherence to the **Canonical Specifications** stored in `docs/specs/`.

## 🚨 AUTHORITY ALERT

**YOU ARE BOUND BY THE IMMUTABLE LAWS IN `docs/specs/`.**

Do not follow legacy documentation, READMEs, or comments if they contradict the files in `docs/specs/`.

## 1. Mandatory Context Loading

Before performing ANY work, you **MUST** read and internalize the following Canonical Specifications:

1.  **Behavior & Workflow**: `docs/specs/keledon_canonical_autonomous_development_prompt.md`
    *   *Defines HOW you work (Scan → Claim → Plan → Execute...)*
2.  **Scope & Meaning**: `docs/specs/keledon_context_canonical.md`
    *   *Defines WHAT Keledon is (Cloud agent, Browser executor).*
3.  **Technical Specs**: `docs/specs/keledon_v_1_canonical_technical_spec.md`
    *   *Defines the system boundaries and definition of done.*
4.  **Architecture**: `docs/specs/keledon_canonical_architecture.md`
    *   *Defines the storage and execution layers.*
5.  **Contracts**: `docs/specs/keledon_canonical_contracts.md`
    *   *Defines the JSON payloads for all communication.*

## 2. Core Invariants (The Law)

1.  **Cloud Decides, Agent Executes.**
    *   The Browser Runtime is BLIND. It never decides.
    *   The Cloud Brain is the ONLY agent.
2.  **Vector Store is Mandatory.**
    *   Reasoning without vector retrieval is a Scope Violation.
3.  **Canonical Runtime Loop.**
    *   `LISTEN -> TRANSCRIBE -> THINK (Cloud + Vector) -> DECIDE -> ACT (RPA) -> RESPOND -> SPEAK -> LOOP`

## 3. Autonomous Execution Workflow

You must follow the loop defined in `docs/specs/keledon_canonical_autonomous_development_prompt.md`:

1.  **Scan**: Listen for or find unclaimed Issues/Tasks.
2.  **Claim**: Acknowledge the task and post `CLAIM — <Agent-ID>` (if working in an issue tracker) or state intent clearly.
3.  **Plan**: Analyze files and post/state `MILESTONE — <Agent-ID> State: PLANNING_COMPLETE`.
4.  **Execute**: Work on a feature branch or strictly scoped changeset.
    *   *Requirement*: All runtime changes must be verifiable.
    *   *Canon*: `npm run proof:c12:local` is the standard for proof.
5.  **Commit & Push**: Save work.
6.  **PR**: Create Pull Request (if applicable).
7.  **Report**: Post `COMPLETION` evidence.

## 4. Forbidden Actions

*   Inventing features not explicitly requested.
*   Modifying `docs/specs/` files (unless instructed by governance).
*   Creating "Agents" in the browser/frontend.
*   Bypassing the `proof:c12:local` requirement for architectural changes.

## 5. Verification

*   **Proof**: The system is only correct if `npm run proof:c12:local` passes with correlated decision and execution traces.
*   **Contracts**: All JSON payloads must match `keledon_canonical_contracts.md` exactly.

---
**STATUS**: UPDATED TO V1 CANONICAL
