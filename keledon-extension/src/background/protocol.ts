export type AgentEvent =
  | { type: "agent_hello"; agent_version: string; capabilities: string[] }
  | { type: "page_context"; url: string; platform: string | null }
  | { type: "incoming_call_detected"; platform: string; evidence?: any }
  | { type: "flow_step_result"; flow_run_id: string; step_id: string; status: "success" | "failed"; evidence?: any; error?: string }
  | { type: "flow_run_complete"; flow_run_id: string; status: "success" | "failed"; evidence?: any; error?: string };

export type CloudCommand =
  | { type: "run_flow"; flow_run_id: string; flow_id: string; version: string; variables: Record<string, any>; steps: FlowStep[] }
  | { type: "ping"; ts: number };

export type FlowStep =
  | { id: string; action: "click"; selector: Selector; expect?: Expectation; timeout_ms?: number }
  | { id: string; action: "fill"; selector: Selector; value: string; expect?: Expectation; timeout_ms?: number }
  | { id: string; action: "wait_visible"; selector: Selector; timeout_ms?: number }
  | { id: string; action: "assert_text"; selector: Selector; equals: string; timeout_ms?: number }
  | { id: string; action: "read_text"; selector: Selector; save_as: string; timeout_ms?: number };

export type Selector =
  | { kind: "css"; value: string }
  | { kind: "aria"; role: string; name: string };

export type Expectation =
  | { kind: "visible"; selector: Selector }
  | { kind: "text_equals"; selector: Selector; equals: string };
