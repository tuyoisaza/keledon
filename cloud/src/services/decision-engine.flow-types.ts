export interface DecisionFlowStep {
  id?: string;
  type?: string;
  selector?: string;
  value?: string;
}

export interface DecisionFlowMatch {
  id: string;
  score?: number;
  description?: string;
  payload?: Record<string, unknown>;
  steps?: DecisionFlowStep[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function toDecisionFlowMatch(
  value: unknown,
): DecisionFlowMatch | undefined {
  if (!isRecord(value)) return undefined;

  const payload = isRecord(value.payload) ? value.payload : value;
  const id =
    typeof payload.id === 'string'
      ? payload.id
      : typeof value.id === 'string'
        ? value.id
        : undefined;
  if (!id) return undefined;

  const steps = Array.isArray(payload.steps)
    ? payload.steps.flatMap((candidate): DecisionFlowStep[] => {
        if (!isRecord(candidate)) return [];
        const step: DecisionFlowStep = {};
        if (typeof candidate.id === 'string') step.id = candidate.id;
        if (typeof candidate.type === 'string') step.type = candidate.type;
        if (typeof candidate.selector === 'string') {
          step.selector = candidate.selector;
        }
        if (typeof candidate.value === 'string') step.value = candidate.value;
        return [step];
      })
    : undefined;

  return {
    id,
    score: typeof value.score === 'number' ? value.score : undefined,
    description:
      typeof payload.description === 'string' ? payload.description : undefined,
    payload,
    steps,
  };
}
