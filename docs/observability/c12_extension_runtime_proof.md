# C12 Automated Real Extension Runtime Proof

## One Command

Run from `cloud`:

```bash
npm run proof:c12:local
```

## What It Launches

- Cloud backend on an available local proof port.
- Chromium via Puppeteer.
- Real unpacked MV3 extension from `agent/dist`.
- Extension runtime is configured automatically with `chrome.storage.local` key `KELEDON_BACKEND_URL`.
- Extension trigger is executed automatically through extension runtime messaging (`C10_START_LISTENING`).

## Expected Proof Output

Successful run includes these lines (values vary):

```text
[C12-PROOF][SUCCESS] Real extension runtime proof automation completed.
[C12-PROOF] session_id=<uuid>
[C12-PROOF] decision_id=<uuid>
[C12-PROOF] trace_id=<trace-id>
[C12-PROOF] jaeger_query=http://localhost:16686/api/traces?service=keledon-cloud&operation=keledon.command.emit&limit=50
```

## PASS Criteria

PASS only if Jaeger contains correlated spans for the same decision/trace:

- `keledon.vector.retrieve` (with `doc-1,doc-2,doc-3`)
- `keledon.policy.check`
- `keledon.decide`
- `keledon.command.emit`
- `keledon.agent.exec` (`agent.exec.end` with `execution_status=success`)

## BLOCKED Criteria

BLOCKED if any required span is missing, IDs are not correlated, or runtime evidence is not observed before timeout.
