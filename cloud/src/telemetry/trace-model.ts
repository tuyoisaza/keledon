export const KELEDON_TRACE_SPANS = {
  LISTEN: 'keledon.listen',
  TRANSCRIBE: 'keledon.transcribe',
  VECTOR_RETRIEVE: 'keledon.vector.retrieve',
  POLICY_CHECK: 'keledon.policy.check',
  DECIDE: 'keledon.decide',
  COMMAND_EMIT: 'keledon.command.emit',
  AGENT_EXEC: 'keledon.agent.exec',
  RPA_EXECUTE: 'keledon.rpa.execute',
  RESPOND: 'keledon.respond',
  SPEAK: 'keledon.speak',
} as const;

export const KELEDON_AGENT_EVENTS = {
  EXECUTION_EVIDENCE: 'execution.evidence',
  EXECUTION_RESULT_ACK: 'AGENT_EXEC_RESULT',
} as const;

/*
Canonical runtime loop span model:
LISTEN -> TRANSCRIBE -> THINK (Cloud + Vector) -> DECIDE -> ACT (RPA) -> RESPOND -> SPEAK -> LOOP

Cloud-side instrumentation in this repository starts with:
- keledon.vector.retrieve
- keledon.policy.check
- keledon.decide
- keledon.command.emit
- keledon.agent.exec

The remaining span constants are defined here so the trace vocabulary is fixed
and consistent across future instrumentation work.
*/
