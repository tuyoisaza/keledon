# KELEDON

KELEDON is an autonomous inbound agent system designed to operate in real production environments.

It is **not a demo platform**, not a chatbot, and not a dashboard-first product.

KELEDON exists only if a real agent can:
- detect inbound calls
- reason in the cloud
- execute deterministic actions in the browser
- persist and replay everything it does

---

## Canonical Authority

This repository is governed by **canonical specifications**.

All architectural decisions, contracts, execution rules, and development governance live in:

```
docs/specs/
```

### Authoritative Documents

- `docs/specs/keledon_v1_canonical_technical_spec.md`  
  → **Technical source of truth**  
  Defines what “KELEDON works” means at runtime.

- `docs/specs/keledon_canonical_autonomous_development_prompt.md`  
  → **Governance constitution**  
  Defines how humans and AIs must plan, coordinate, and execute work.

If a change conflicts with these documents, **the change is invalid**.

---

## Non-Negotiable Principle

**Cloud decides. Agent executes.**

- No LLM touches the UI directly.
- UI actions are deterministic and auditable.
- Audio and UI execution live locally.
- Decisions, orchestration, and policies live in the Cloud.

Any violation of this principle must be rejected.

---

## Anti-Demo Policy

KELEDON does not accept demo-by-default behavior.

The following are **forbidden in production**:
- fake session IDs
- hardcoded AI responses
- random or generated data
- silent fallbacks that pretend the system is working

Mocks are allowed **only** when explicitly gated behind:

```
DEMO_MODE=true
```

If the Cloud is disconnected, the UI must show failure.

---

## Development Rules

- No feature work may begin before canonical documents are committed.
- All work must start as GitHub Issues.
- All changes must be reviewed against the canonical specs.
- Dashboards, analytics, and UI polish are secondary to the agent runtime loop.

If the agent loop is not real, the product does not exist.

---

## Repository Structure

The repository is intentionally structured to enforce separation of concerns:

```
agent/          # Browser agent (execution)
cloud/          # Cloud brain (decision & orchestration)
contracts/      # Canonical schemas (interfaces)
docs/specs/     # Canonical authority
docs/pm/        # Planning and status
docs/decisions/ # Explicit product decisions
```

---

## Final Note

This repository is designed to be worked on by **autonomous AI agents** and humans.

The repository state — not chat history — is the source of truth.

If something is unclear, open a decision issue.  
If something violates the canon, reject it.

**KELEDON must be real before it is pretty.**

