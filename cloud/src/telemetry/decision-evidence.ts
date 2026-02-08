export type CanonicalDecisionType = 'RESPOND' | 'ASK' | 'ACT' | 'WAIT';

export interface DecisionEvidence {
  decision_id: string;
  policy_ids: string[];
  playbook_id: string;
  vector_collections: string[];
  vector_doc_ids: string[];
  confidence_score: number;
  decision_type: CanonicalDecisionType;
}

export const DECISION_EVIDENCE_ATTRS = {
  DECISION_ID: 'decision.id',
  POLICY_IDS: 'decision.policy_ids',
  PLAYBOOK_ID: 'decision.playbook_id',
  VECTOR_COLLECTIONS: 'decision.vector_collections',
  VECTOR_DOC_IDS: 'decision.vector_doc_ids',
  CONFIDENCE_SCORE: 'decision.confidence_score',
  DECISION_TYPE: 'decision.type',
} as const;

export const POLICY_CHECK_ATTRS = {
  DECISION_ID: 'policy.decision_id',
  POLICY_IDS: 'policy.ids',
  APPLIED: 'policy.applied',
  PLAYBOOK_ID: 'policy.playbook_id',
} as const;
