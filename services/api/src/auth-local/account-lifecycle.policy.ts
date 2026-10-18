/** Normal accounts remain unrestricted; synthetic accounts have a server-owned TTL. */
export function isAccountActive(account: {
  uatFixtureRunId?: string | null;
  uatFixtureExpiresAt?: Date | null;
  uatFixtureRetiredAt?: Date | null;
} | null | undefined, now = Date.now()): boolean {
  if (!account) return false;
  if (!account.uatFixtureRunId) return true;
  return !account.uatFixtureRetiredAt &&
    account.uatFixtureExpiresAt instanceof Date &&
    account.uatFixtureExpiresAt.getTime() > now;
}

/** Restoring an account must never resurrect a bearer issued before retirement. */
export function isAccountSessionCurrent(account: {
  uatFixtureRunId?: string | null;
  uatFixtureExpiresAt?: Date | null;
  uatFixtureRetiredAt?: Date | null;
  uatFixtureAuthAfter?: Date | null;
} | null | undefined, issuedAt: unknown, now = Date.now()): boolean {
  if (!isAccountActive(account, now)) return false;
  if (!account.uatFixtureRunId) return true;
  return typeof issuedAt === 'number' && Number.isFinite(issuedAt) &&
    issuedAt <= now && account.uatFixtureAuthAfter instanceof Date &&
    issuedAt >= account.uatFixtureAuthAfter.getTime();
}
