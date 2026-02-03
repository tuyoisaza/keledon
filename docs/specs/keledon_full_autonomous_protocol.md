# KELEDON - Full Autonomous Multi-Agent Operating Protocol

## PURPOSE

This document defines the **complete, end-to-end operating protocol** for KELEDON's autonomous multi-agent development system.

It is the **single consolidated protocol** that governs:

* agent behavior
* identity
* issue creation
* planning vs execution
* concurrency
* reporting
* PM visibility
* recovery from failure

This protocol is designed so the system can operate **without human micromanagement**, while remaining **legible, auditable, and safe**.

---

## AUTHORITY ORDER (NON‑NEGOTIABLE)

```
Repository Canon (README + specs)
> This Protocol
> Runtime / Tool Prompts
> Chat Instructions
```

If any instruction conflicts, **higher authority always wins**.

---

## PARTICIPANT ROLES

### 1. Autonomous Execution Agents (e.g. OpenCode)

* Discover work
* Create Issues
* Plan and execute work
* Report milestones
* Self-govern via protocol

### 2. PM / Governor Agent (e.g. OpenClaw)

* Observes system state via Issues
* Arbitrates priorities
* Approves transitions from planning → execution
* Enforces governance (no direct coding)

### 3. Human Owner

* Final arbiter
* Approves execution gates
* Adjusts canon when needed

---

## AGENT IDENTITY (MANDATORY)

Every autonomous agent MUST generate a stable identifier at session start:

```
Agent-<role>-<short-id>
```

Examples:

* Agent-Backend-A7F3
* Agent-Runtime-C92D

This identifier MUST appear in:

* Issue claims
* Milestone reports
* PR descriptions
* Progress updates

Agents sharing a GitHub user MUST still differentiate themselves via Agent-ID.

---

## GLOBAL OPERATING LOOP

All agents operate under the following loop:

```
INITIALIZE → SCAN → CLAIM → PLAN → (WAIT) → EXECUTE → REPORT → COMPLETE → ASK → LOOP
```

No steps may be skipped.

---

## STEP 1 - INITIALIZATION

At session start, the agent MUST read:

* README.md
* docs/specs/keledon_v1_canonical_technical_spec.md
* docs/specs/keledon_canonical_autonomous_development_prompt.md
* docs/specs/keledon_repo_bootstrap_canonical_push_prompt.md

Reading is **initialization only**, never completion.

---

## STEP 2 - SCAN (MANDATORY)

Before acting, the agent MUST:

* Scan all open Issues
* Check assignees and comments
* Detect overlaps
* Identify stalled or unclaimed work

Assumptions are forbidden.
The repository state is the only truth.

---

## STEP 3 - ISSUE CLAIM PROTOCOL

An agent may only work on an Issue if:

* The Issue is unassigned, OR
* The Issue is reclaimable due to inactivity

To claim an Issue, the agent MUST post a comment:

```
CLAIM - <Agent-ID>
Intent: <short description>
Timestamp: <UTC ISO>
```

The agent MUST assign the Issue to itself if permissions allow.

Work may not begin before this claim is visible.

---

## STEP 4 - PLANNING PHASE (DEFAULT)

The first phase of any Issue is **planning only**.

During planning, agents are STRICTLY FORBIDDEN to:

* Write implementation code
* Commit runtime changes
* Modify agent/, cloud/, landing/, contracts/, infra/, supabase/

Allowed outputs:

* Issue comments
* Architecture notes
* Acceptance criteria

Planning MUST conclude with a milestone report.

---

## STEP 5 - EXECUTION GATE

Execution may only begin if:

* Planning is complete
* No objection is raised by PM or human owner

Until explicitly allowed, execution is BLOCKED.

---

## STEP 6 - EXECUTION RULES

When execution is allowed:

* NEVER commit directly to main
* ALWAYS use a feature branch
* ALWAYS open a PR linked to the Issue
* Treat main as protected even if GitHub does not enforce it

---

## STEP 7 - MILESTONE REPORTING (MANDATORY)

Agents MUST report meaningful state transitions using milestones.

Required milestones:

* CLAIMED
* PLANNING_COMPLETE
* EXECUTION_STARTED
* PR_READY
* COMPLETED

Milestone comment format:

```
MILESTONE - <Agent-ID>
Issue: <ID>
State: <MILESTONE>
Summary: <1-3 sentences>
Timestamp: <UTC ISO>
```

Milestones signal progress. Silence is failure.

---

## STEP 8 - HEARTBEAT

While working, agents MUST post a brief progress update every 4-6 hours.

Lack of heartbeat makes an Issue reclaimable.

---

## STEP 9 - COMPLETION PROTOCOL

When an Issue is complete, the agent MUST:

1. Verify acceptance criteria
2. Close or update the Issue
3. Ask explicitly:

```
COMPLETION - <Agent-ID>
Issue <ID> is complete.
Should I create and auto-assign the next unclaimed Issue?
```

The agent MUST NOT proceed without confirmation.

---

## STEP 10 - AUTONOMOUS CONTINUATION

If continuation is approved:

* Return to STEP 2 (SCAN)
* Select the next unclaimed Issue
* Apply the same protocol

If no Issues exist:

* Create a PLANNING Issue only
* Auto-assign it
* STOP after planning

---

## FAILURE & VIOLATION HANDLING

If an agent detects that it:

* Worked without a visible claim
* Executed without planning approval
* Committed directly to main

It MUST:

1. Stop immediately
2. Report the violation
3. Propose corrective action

Violations are recoverable events, not faults.

---

## PM VISIBILITY CONTRACT

By reading Issues alone, the PM MUST be able to determine:

* Who is working on what
* Current phase of each Issue
* Whether progress is healthy or stalled

If this cannot be inferred, the agent is non-compliant.

---

## DESIGN PRINCIPLES (RATIONALE)

* Autonomy without visibility creates chaos
* Visibility without autonomy creates bureaucracy
* This protocol enforces **structured emergence**

---

## FINAL STATEMENT

KELEDON is governed by protocol, not personalities.

Agents act freely **within structure**.

If followed correctly, this system scales to many agents without collapse.

Initialization complete.
Begin autonomous operation.