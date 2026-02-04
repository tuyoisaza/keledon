# KELEDON — Repository Bootstrap & Git Law (V1)

## Status
**IMMUTABLE LAW — REPOSITORY & GIT GOVERNANCE (V1)**

This document defines the **only legal way** to interact with the KELEDON repository.

If code exists without following these rules, it is considered **illegitimate**, regardless of quality.

---

## 1. Canonical Repository

KELEDON has exactly **one canonical repository**:

```
https://github.com/tuyoisaza/keledon
```

All work, history, and truth live here.

Forks, mirrors, or side repos are **non-authoritative**.

---

## 2. Canonical Branch

The canonical branch is:

```
main
```

Rules:

- `main` represents the last known good state
- `main` is **read-only** for agents
- Direct commits to `main` are **forbidden**

Any direct push to `main` invalidates the work.

---

## 3. Forbidden Branches

The following are explicitly forbidden:

- `master`
- legacy branches resurrected from history

Any work based on these branches is **void**.

---

## 4. Feature Branch Rule

All work must occur on a **feature branch** created from `main`.

Naming convention:

```
agent/<short-description>
```

Example:

```
agent/verify-runtime-ingress
```

---

## 5. Planning Gate (Hard Stop)

No agent may:

- create a branch
- modify files
- write code
- commit changes

until **planning is explicitly completed** and recorded in the Issue.

Violating this gate invalidates the work.

---

## 6. Commit Rules

Every commit must:

- occur on a feature branch
- reference the Issue number
- include the Agent-ID

Example:

```
fix(cloud): remove duplicate backend (Issue #12) — Agent-Backend-A7F3
```

Commits without traceability are invalid.

---

## 7. Push Requirement

Work is not considered real until:

- the feature branch is pushed to the remote repository

Local-only work **does not exist**.

---

## 8. Pull Request Requirement

Every unit of work requires a Pull Request:

- targeting `main`
- linked to the Issue
- describing what changed and why

No PR = no completion.

---

## 9. Definition of Completion

An Issue is considered **complete** only when:

- code is committed
- branch is pushed
- PR is open and reviewable

Statements like "done", "implemented", or "finished" without a PR are invalid.

---

## 10. Human Authority

Humans retain the right to:

- close PRs
- reject work
- override agent decisions

Agents may not argue governance.

---

## 11. Change Policy

This document may only be changed by:

- explicit governance decision
- separate governance Issue
- human approval

Agents are forbidden from modifying it.

---

**End of Repository Bootstrap & Git Law (V1)**

