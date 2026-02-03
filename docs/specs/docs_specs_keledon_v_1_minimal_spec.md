# KELEDON V1 — Minimal Canonical Spec (Reduced)

## Status
**IMMUTABLE LAW — V1 (REDUCED)**

This document replaces all previous verbose specs.
If something is not explicitly stated here, it does **not exist** in KELEDON V1.

---

## 1. System Purpose (Only One)

KELEDON V1 exists to produce a **working, testable runtime** that:

- accepts real input events
- executes real code paths
- produces observable effects

Anything else is out of scope.

---

## 2. Roles (Explicit)

### 2.1 Execution Agents

- write code on feature branches
- open PRs
- never merge
- never evaluate readiness

### 2.2 PR Master / Release Engineer (Single Agent)

- the **only** agent allowed to merge
- always operates from `main`
- batch-integrates PRs
- declares integration success or failure

### 2.3 Human (YOU)

- **does not review PRs**
- **does not guide agents**
- **does not integrate code**

Human role is strictly:

- pull `main`
- run the system
- test behavior
- report broken / works

No interpretation. No governance debates.

---

## 3. Branch Law (Non-Negotiable)

- `main` = last integrated, testable state
- execution agents MUST NOT work on `main`
- PR Master MUST ONLY operate on `main`

If an agent is on the wrong branch, it must **stop immediately**.

---

## 4. Definition of Progress

Progress is defined as:

- PR merged into `main`
- system builds
- system starts

Nothing else counts.

---

## 5. Definition of Failure

Failure is:

- simulated behavior
- evaluation from feature branches
- silent errors
- claims without runtime proof

Failure is acceptable. Ambiguity is not.

---

## 6. Authority Rule

This document overrides:

- READMEs
- old specs
- agent opinions
- test results

Delete code to comply. Do not expand scope.

---

**End of Minimal Canonical Spec (V1)**