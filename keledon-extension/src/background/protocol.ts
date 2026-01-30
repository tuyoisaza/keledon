export type AgentEvent =
  | { type: "agent_hello"; agent_version: string; capabilities: string[] }
  | { type: "page_context"; url: string; platform: string | null }
  | { type: "incoming_call_detected"; platform: string; evidence?: any }
  | { type: "flow_step_result"; flow_run_id: string; step_id: string; status: "success" | "failed"; evidence?: any; error?: string }
  | { type: "flow_run_complete"; flow_run_id: string; status: "success" | "failed"; evidence?: any; error?: string }
  // RAG Events from Extension to Cloud
  | { type: "rag_retrieved"; query: string; results: RetrievedDocument[]; session_id?: string }
  | { type: "rag_evaluated"; score: number; confidence: string; suggestions: string[] }
  | { type: "rag_health_status"; status: any };

export type CloudCommand =
  | { type: "run_flow"; flow_run_id: string; flow_id: string; version: string; variables: Record<string, any>; steps: FlowStep[] }
  | { type: "ping"; ts: number }
  // RAG Commands
  | { type: "rag_retrieve"; query: string; session_id?: string; company_id?: string; options?: RAGOptions }
  | { type: "rag_evaluate"; session_id: string; original_query: string; response: string; used_context: string[] }
  | { type: "rag_record_pattern"; session_id: string; pattern: KnowledgePattern }
  | { type: "rag_get_context"; session_id: string }
  | { type: "rag_update_context"; session_id: string; context: any }
  | { type: "rag_health" };

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

// RAG Types
export type RAGOptions = {
  limit?: number;
  threshold?: number;
  categories?: string[];
  brand_id?: string;
  team_id?: string;
};

export type KnowledgePattern = {
  id: string;
  pattern: string;
  context: string;
  examples: string[];
  confidence: number;
};

// RAG Events from Cloud
export type RAGEvent = 
  | { type: "rag_retrieved"; query: string; results: RetrievedDocument[]; session_id?: string }
  | { type: "rag_evaluated"; score: number; confidence: string; suggestions: string[] }
  | { type: "rag_pattern_recorded"; pattern_id: string }
  | { type: "rag_context_updated"; session_id: string }
  | { type: "rag_health_status"; status: any };

export type RetrievedDocument = {
  id: string;
  content: string;
  relevance: number;
  source: string;
  metadata: {
    type: string;
    category: string;
    [key: string]: any;
  };
};
