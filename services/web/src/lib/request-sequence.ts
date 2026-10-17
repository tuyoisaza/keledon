export interface RequestSequence {
  begin(): number;
  invalidate(): number;
  isCurrent(sequence: number): boolean;
}

export function createRequestSequence(): RequestSequence {
  let current = 0;
  return {
    begin: () => ++current,
    invalidate: () => ++current,
    isCurrent: (sequence) => sequence === current,
  };
}
