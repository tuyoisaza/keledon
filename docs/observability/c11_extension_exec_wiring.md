# C11 Extension Execution Evidence Wiring

## What was missing

C10 was blocked because real extension execution evidence did not reliably reach cloud with a real `decision_id` and `trace_id`.

Primary gaps:

- Extension runtime used a fixed cloud URL (`http://localhost:3001`) while proof runtime could run on another port.
- Extension evidence payload allowed placeholder values (`unknown`) for `decision_id` and `trace_id`.
- No explicit ACK channel (`AGENT_EXEC_RESULT`) for command execution status handoff.

## What was wired

### Extension side

- Added real execution ACK emission on command execution via Socket.IO event `AGENT_EXEC_RESULT`.
- ACK payload now includes:
  - `decision_id`
  - `trace_id`
  - `command_type`
  - `execution_status`
  - `execution_timestamp`
- Kept `execution.evidence` emission and aligned fields with ACK for backward compatibility.
- Enforced fail-fast behavior: extension now rejects evidence emission if command metadata lacks real `decision_id` or `trace_id`.
- Added configurable cloud runtime URL in side panel (`Backend Config`) wired to background service reconnect.

### Cloud side

- Gateway now accepts both:
  - `AGENT_EXEC_RESULT`
  - `execution.evidence`
- ACK payload is normalized to canonical execution evidence and processed by one validation path.
- Added strict validation:
  - required C10/C11 fields must exist
  - `decision_id` and `trace_id` cannot be placeholders (for example `unknown`)
- `keledon.agent.exec` span attributes include:
  - `decision.id`
  - `trace_id`
  - `command_type`
  - `tab_id`
  - `execution_result`
  - `execution_status`

### Proof checkpoint

- Manual checkpoint now prints explicit operator instruction:

`ACTION REQUIRED: Click START LISTENING in Chrome Extension`

- Proof also prints required cloud URL/port for the extension runtime.

## How this unblocks C10

C10 requires real extension runtime evidence correlated in Jaeger. C11 completes the missing wire so cloud can observe and validate real extension command execution with shared IDs.

When extension click -> cloud command -> extension execution -> ACK/evidence roundtrip succeeds, `keledon.agent.exec` becomes observable and correlates with:

- `keledon.vector.retrieve`
- `keledon.policy.check`
- `keledon.decide`
- `keledon.command.emit`

This preserves canonical boundaries: cloud decides, browser executes.
