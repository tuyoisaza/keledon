import { isAccountActive, isAccountSessionCurrent } from './account-lifecycle.policy';

describe('synthetic account lifecycle boundary', () => {
  const now = Date.UTC(2026, 9, 18);
  it('keeps ordinary existing accounts active and denies missing accounts', () => {
    expect(isAccountActive({}, now)).toBe(true);
    expect(isAccountActive(null, now)).toBe(false);
  });
  it('requires an unexpired server-owned TTL for a fixture', () => {
    expect(isAccountActive({ uatFixtureRunId: 'run' }, now)).toBe(false);
    expect(isAccountActive({ uatFixtureRunId: 'run', uatFixtureExpiresAt: new Date(now) }, now)).toBe(false);
    expect(isAccountActive({ uatFixtureRunId: 'run', uatFixtureExpiresAt: new Date(now + 1) }, now)).toBe(true);
  });
  it('retirement overrides an unexpired TTL', () => {
    expect(isAccountActive({ uatFixtureRunId: 'run', uatFixtureExpiresAt: new Date(now + 1000), uatFixtureRetiredAt: new Date(now - 1) }, now)).toBe(false);
    expect(isAccountActive({ uatFixtureRunId: 'run', uatFixtureExpiresAt: new Date(NaN) }, now)).toBe(false);
  });
  it('does not revive an old bearer after restoring a fixture', () => {
    const account = { uatFixtureRunId: 'run', uatFixtureExpiresAt: new Date(now + 1000), uatFixtureAuthAfter: new Date(now - 10) };
    expect(isAccountSessionCurrent(account, undefined, now)).toBe(false);
    expect(isAccountSessionCurrent(account, now - 11, now)).toBe(false);
    expect(isAccountSessionCurrent(account, now - 10, now)).toBe(true);
    expect(isAccountSessionCurrent({}, undefined, now)).toBe(true);
  });
});
