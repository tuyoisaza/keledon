# OTel Verification Proof (C07)

## Runtime Boot Proof

- Command: `PORT=3011 npx ts-node src/main.ts`
- Observed logs:
  - `[OTEL] Tracing started for keledon-cloud -> http://localhost:4318/v1/traces (Jaeger OTLP)`
  - `AgentGateway subscribed to the "brain_event" message`
  - `KELEDON Cloud Backend running on port 3011`

## Real Decision Flow Proof (WebSocket)

- Client command used a real Socket.IO connection to `/agent` and emitted:
  - `session.create`
  - `brain_event` with `event_type: text_input`
- Observed client output:
  - `session.created {"session_id":"1ed199a8-7cc9-4f70-976a-273e34b45e15", ...}`
  - `command {"type":"ui_steps", ... "metadata":{"decision_id":"3b7fdbd4-47a3-4aa3-91f5-51bed7482060", ... "trace_id":"4bf92f3577b34da6a3ce929d0e0e4736"}}`

## Jaeger Query Commands (Executed)

- `http://localhost:16686/api/traces?service=keledon-cloud&operation=keledon.vector.retrieve&limit=5`
- `http://localhost:16686/api/traces?service=keledon-cloud&operation=keledon.policy.check&limit=5`
- `http://localhost:16686/api/traces?service=keledon-cloud&operation=keledon.decide&limit=5`
- `http://localhost:16686/api/traces?service=keledon-cloud&operation=keledon.command.emit&limit=5`

## Single Trace Evidence (Trace ID: `4bf92f3577b34da6a3ce929d0e0e4736`)

- `keledon.vector.retrieve`
  - `vector.doc_ids = ["doc-1","doc-2"]`
- `keledon.policy.check`
  - `policy.decision_id = 3b7fdbd4-47a3-4aa3-91f5-51bed7482060`
  - `policy.ids = ["POLICY_VECTOR_GROUNDED_DECISION","POLICY_COMMAND_TYPE_ALLOWED","POLICY_ACTION_ALLOWED_BY_CLOUD"]`
  - `policy.playbook_id = playbook.browser.automation.v1`
- `keledon.decide`
  - `decision.id = 3b7fdbd4-47a3-4aa3-91f5-51bed7482060`
  - `decision.policy_ids = ["POLICY_VECTOR_GROUNDED_DECISION","POLICY_COMMAND_TYPE_ALLOWED","POLICY_ACTION_ALLOWED_BY_CLOUD"]`
  - `decision.playbook_id = playbook.browser.automation.v1`
  - `decision.vector_doc_ids = ["doc-1","doc-2"]`
  - `decision.type = ACT`
- `keledon.command.emit`
  - `command_type = ui_steps`
  - `session_id = 1ed199a8-7cc9-4f70-976a-273e34b45e15`
  - `decision.id = 3b7fdbd4-47a3-4aa3-91f5-51bed7482060`

## Runtime Caveats and Remediation

- Local DB initially had no `sessions`/`events` tables, so `session.create` failed.
- Remediation used for local proof only:
  - Created minimal `sessions` and `events` tables in `keledon-postgres` container.
- This remediation is environment bootstrap only; tracing instrumentation changes are in Cloud source code.
