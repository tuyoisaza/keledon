# OTel Verification Proof (C07 Reproducibility Lock)

## Single Repro Command

Run exactly one command from `cloud`:

```bash
npm run proof:c07:local
```

This command is the only supported local proof path. It is DEV-ONLY and fails fast in production mode.

## What the Command Does

1. Verifies local DEV prerequisites (`keledon-jaeger`, `keledon-postgres` containers).
2. Runs explicit DEV-ONLY local DB bootstrap for `sessions` and `events` tables.
3. Builds and starts Cloud on port `3011`.
4. Executes real websocket flow (`session.create` -> `brain_event` -> `command.<session_id>`).
5. Validates Jaeger traces for:
   - `keledon.vector.retrieve`
   - `keledon.policy.check`
   - `keledon.decide`
   - `keledon.command.emit`

## Expected Success Output

The command must end with these lines (IDs vary):

```text
[C07-PROOF][SUCCESS] Deterministic local proof completed.
[C07-PROOF] session_id=<uuid>
[C07-PROOF] decision_id=<uuid>
[C07-PROOF] trace_id=<trace-id>
[C07-PROOF] jaeger_query=http://localhost:16686/api/traces?service=keledon-cloud&operation=keledon.command.emit&limit=5
```

## Auditor Verification

Use the printed `jaeger_query` URL and verify the returned trace includes:

- `keledon.vector.retrieve` with `vector.doc_ids`
- `keledon.policy.check` with `policy.decision_id` and `policy.ids`
- `keledon.decide` with `decision.id`, `decision.policy_ids`, `decision.vector_doc_ids`
- `keledon.command.emit` with matching `decision.id`

## C09 E2E Proof Command

Run exactly one command from `cloud`:

```bash
npm run proof:c09:local
```

This command is the canonical C09 end-to-end proof path and must emit browser execution evidence.

### Additional C09 Guarantees

- Deterministic Qdrant seed with `doc-1,doc-2,doc-3`.
- Mandatory spans:
  - `keledon.vector.retrieve`
  - `keledon.policy.check`
  - `keledon.decide`
  - `keledon.command.emit`
  - `keledon.agent.exec`
- Correlation by `decision.id` across all required spans.
- Returned `trace_id` and `decision_id` from browser execution evidence to cloud.

## C10 Real Extension Runtime Proof Command

Run exactly one command from `cloud`:

```bash
npm run proof:c10:local
```

This command requires the real MV3 extension runtime and a manual checkpoint click.

### Additional C10 Guarantees

- Browser evidence must come from real extension runtime (no socket harness path).
- Manual checkpoint is required: click `START LISTENING (C10)` in extension side panel.
- `keledon.agent.exec` must include:
  - `agent.exec.event` (`agent.exec.start|agent.exec.end|agent.exec.error`)
  - `decision.id`
  - `trace_id`
  - `command_type`
  - `tab_id`
  - `execution_result`
- Proof fails if extension evidence is not observed before timeout.

## C12 Automated Real Extension Runtime Proof Command

Run exactly one command from `cloud`:

```bash
npm run proof:c12:local
```

This command launches Chromium and the real extension runtime automatically (no manual click checkpoint).

### Additional C12 Guarantees

- Real extension loaded from `agent/dist` in Chromium with extension runtime active.
- Backend URL configured automatically via extension storage key `KELEDON_BACKEND_URL`.
- Required correlated spans:
  - `keledon.vector.retrieve`
  - `keledon.policy.check`
  - `keledon.decide`
  - `keledon.command.emit`
  - `keledon.agent.exec`
- Proof fails fast if automation cannot launch extension, cannot discover extension ID, cannot set backend URL, or cannot observe `keledon.agent.exec` before timeout.

## Why C12 Exists and What It Prevents

C12 exists to prevent false readiness created by manual checkpoints and environment drift.

It prevents:

- manual-click dependence for extension runtime evidence
- backend URL/port mismatch between proof runtime and extension runtime
- claims of extension participation without correlated `keledon.agent.exec` evidence
- regressions where decision spans exist but real extension execution evidence is absent
