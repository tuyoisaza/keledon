# KELEDON Decision Evidence Tracing (C07)

## Purpose

This document defines how `keledon.decide` is auditable using structured OpenTelemetry span attributes, without exposing free-text reasoning or chain-of-thought.

Canonical enforcement:

- Cloud decides.
- Browser executes.
- Vector retrieval is mandatory before decision.
- Policy check is mandatory before command emission.

## Decision Evidence Model

Source: `cloud/src/telemetry/decision-evidence.ts`

```ts
decision_id: string
policy_ids: string[]
playbook_id: string
vector_collections: string[]
vector_doc_ids: string[]
confidence_score: number
decision_type: RESPOND | ASK | ACT | WAIT
```

## Span Attachments

### `keledon.vector.retrieve`

Required attributes:

- `vector.collection`
- `topK`
- `latency_ms`
- `vector.results`
- `vector.doc_ids[]`

### `keledon.policy.check`

Required attributes:

- `policy.decision_id`
- `policy.ids[]`
- `policy.playbook_id`
- `policy.applied`

Failure behavior:

- If no policy applies, span status is `ERROR` and decision flow fails.

### `keledon.decide`

Required attributes:

- `decision.id`
- `decision.policy_ids[]`
- `decision.playbook_id`
- `decision.vector_collections[]`
- `decision.vector_doc_ids[]`
- `decision.confidence_score`
- `decision.type`

Failure behavior:

- If vector retrieval returns zero documents, `keledon.decide` is marked `ERROR` and command is not emitted.

### `keledon.command.emit`

Required attributes:

- `command_type`
- `session_id`
- `decision.id` (when decision-backed)

Propagation behavior:

- `decision_id` is copied into outbound WebSocket command metadata.
- `trace_id` is copied into outbound WebSocket command metadata.

## Jaeger Query Examples

Decision spans:

```text
http://localhost:16686/api/traces?service=keledon-cloud&operation=keledon.decide&limit=10
```

Policy spans:

```text
http://localhost:16686/api/traces?service=keledon-cloud&operation=keledon.policy.check&limit=10
```

Vector retrieval spans:

```text
http://localhost:16686/api/traces?service=keledon-cloud&operation=keledon.vector.retrieve&limit=10
```

Command emission spans:

```text
http://localhost:16686/api/traces?service=keledon-cloud&operation=keledon.command.emit&limit=10
```

## Audit Reconstruction Method

Auditors reconstruct one decision by joining on `decision.id`:

1. Find `keledon.decide` span and record `decision.id`.
2. Verify `decision.vector_doc_ids[]` and matching `keledon.vector.retrieve` span.
3. Verify `keledon.policy.check` has same `policy.decision_id` and `policy.applied=true`.
4. Verify `keledon.command.emit` contains same `decision.id`.
5. Verify outbound WebSocket payload metadata carries the same `decision_id` and `trace_id`.
