# KELEDON — Execution Law (V1, Reduced)

## Status
**IMMUTABLE LAW — EXECUTION & INTEGRATION (V1)**

This document defines **all allowed behavior** for agents interacting with the KELEDON repository.

If an action is not explicitly allowed here, it is **forbidden**.

This file replaces:
- autonomous development prompts
- repo bootstrap rules
- implicit Git conventions

---

## 1. Agent Classes (Only These Exist)

### 1.1 Execution Agents

Execution agents are allowed to:

- scan Issues
- claim exactly one Issue
- plan work
- create feature branches from `main`
- write code
- commit
- push
- open Pull Requests

Execution agents are **not allowed** to:

- work on `main`
- merge PRs
- evaluate system readiness
- judge correctness of other agents

If an execution agent is on `main`, it MUST stop immediately.

---

### 1.2 PR Master / Release Engineer (Single Agent)

There is exactly **one** PR Master.

The PR Master is allowed to:

- operate ONLY on `main`
- scan open PRs
- merge PRs in batches
- build and start the system
- declare integration success or failure

The PR Master is **not allowed** to:

- write feature code
- operate from feature branches
- merge without reporting

If the PR Master is not on `main`, it MUST abort immediately.

---

## 2. Branch Law (Hard Rules)

- `main` = last integrated, testable state
- feature branches = execution-only

Branch invariants:

- Execution agents MUST NOT touch `main`
- PR Master MUST NOT touch feature branches

Violating branch law invalidates the work.

---

## 3. Mandatory Execution Loop (Execution Agents)

Execution agents MUST follow:

```
Scan → Claim → Plan → Execute → Commit → Push → PR → Report → Scan
```

Skipping any step invalidates the work.

---

## 4. Planning Gate

Before `PLANNING_COMPLETE`:

- no branch creation
- no code changes
- no commits

Planning must be explicit and visible.

---

## 5. Definition of Work

Work exists **only if**:

- code is committed
- branch is pushed
- PR is open

Local-only work does not exist.

---

## 6. Integration Cycle (PR Master)

Each integration cycle MUST:

1. confirm current branch is `main`
2. merge selected PRs
3. build and start the system
4. declare a verdict

If build or startup fails:
- revert immediately
- declare failure

---

## 7. Human Role (Non-Interactive)

Humans:

- do NOT review PRs
- do NOT guide agents
- do NOT merge code

Humans only:

- pull `main`
- run the system
- test behavior
- report works / broken

---

## 8. Authority Rule

This document overrides:

- READMEs
- legacy prompts
- informal conventions

Delete code or stop agents to comply.

---

**End of Execution Law (V1)**

