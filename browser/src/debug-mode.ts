export function resolveDebugMode(isPackaged: boolean, override?: string): boolean {
  if (override === 'true') return true;
  if (override === 'false') return false;
  return !isPackaged;
}
