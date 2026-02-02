# 🧱 KELEDON — Repository Bootstrap & Canonical Push Prompt

## OBJECTIVE (NON‑NEGOTIABLE)

Create the **initial KELEDON repository** with:

1. A clean, intentional folder structure
2. The canonical documents committed as the source of truth
3. GitHub‑native coordination artifacts (Issues, PR flow, docs)
4. A first push that represents **governance**, not implementation

No demo code, no scaffolding features, no mock implementations.

---

## AUTHORITY & ORDER

This bootstrap step has **higher priority than coding**.

No agent may implement runtime features until:

- The repository exists
- The canonical documents are committed
- The folder structure is in place

---

## REPOSITORY STRUCTURE (MANDATORY)

Create the repository with **exactly** this top‑level structure:

```
keledon/
├── agent/                 # Browser agent (extension runtime)
├── cloud/                 # Cloud brain (backend)
├── contracts/             # Canonical schemas (source of truth)
├── docs/
│   ├── spec/              # Canonical specs (authoritative)
│   ├── pm/                # Planning & status reports
│   └── decisions/         # Explicit product decisions (A/B)
├── infra/                 # Deployment & IaC (empty for now)
├── tools/                 # Dev scripts (empty for now)
├── .github/
│   ├── ISSUE_TEMPLATE/
│   │   ├── task.md
│   │   └── decision.md
│   └── pull_request_template.md
├── README.md
└── .gitignore
```

Do **not** add implementation files yet.

---

## CANONICAL DOCUMENTS TO COMMIT (REQUIRED)

Create and commit the following files **exactly**:

### 1. `docs/specs/keledon_v1_canonical_technical_spec.md`

- Paste the **full content** of:
  **“KELEDON V1 — Canonical Technical Spec (Production)”**
- This file is the **technical source of truth**.

### 2. `docs/specs/keledon_canonical_autonomous_development_prompt.md`

- Paste the **full content** of:
  \*\*“KELEDON — Canonical Autonomous Development Prompt
- This file is the **governance constitution** for all agents.

### 3. `README.md`

The README must:

- State that KELEDON is an autonomous agent system
- Declare that `docs/spec/` is authoritative
- Explicitly forbid demo‑only implementations

Minimal README example:

```md
# KELEDON

KELEDON is an autonomous inbound agent system.

## Source of Truth
All architecture, contracts, and development rules live in `docs/spec/`.

No feature work is valid unless it complies with the canonical specs.
```

---

## GITHUB GOVERNANCE FILES

### Issue Template — Task (`.github/ISSUE_TEMPLATE/task.md`)

```md
## Objective

## Canonical Spec Reference

## Scope (IN)

## Out of Scope (OUT)

## Acceptance Criteria

## Assigned Agent
```

### Issue Template — Decision (`.github/ISSUE_TEMPLATE/decision.md`)

```md
## Decision Needed

## Options (A / B)

## Impact

## Blocking Areas
```

### Pull Request Template (`.github/pull_request_template.md`)

```md
## What This PR Does

## Canonical Spec Compliance

## Runtime Path Affected

## Acceptance Criteria Met

## Out of Scope Confirmation
```

---

## INITIAL COMMIT & PUSH

Steps to execute:

1. Initialize git repository
2. Create folder structure
3. Create all canonical documents
4. Commit with message:

```
chore: bootstrap KELEDON repo with canonical specs and governance
```

5. Push to GitHub main branch

No additional commits are allowed before this one.

---

## POST‑BOOTSTRAP RULE

After this push:

- All future work must start as GitHub Issues
- All PRs are reviewed against the canonical specs
- No agent may bypass the documents in `docs/spec/`

---

## SUCCESS CRITERIA

This task is complete only when:

- The repo exists on GitHub
- The structure matches exactly
- Canonical specs are committed and readable
- README clearly declares authority hierarchy

At this point, the system is ready for **real development**.

---

### END OF PROMPT

