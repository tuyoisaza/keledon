const ALLOWED_TEST_PROFILE_ROLES = new Set(['user', 'admin', 'coordinator']);

const TEST_EMAIL_SUFFIXES = ['@example.invalid', '@test.invalid'];

export interface UatTestProfileEnvironment {
  KELEDON_ENABLE_UAT_TEST_PROFILES?: string;
  KELEDON_DEPLOYMENT_ENV?: string;
  KELEDON_UAT_TEST_PROFILE_IDS?: string;
  NODE_ENV?: string;
}

export function uatTestProfilesEnabled(
  env: UatTestProfileEnvironment = process.env,
): boolean {
  const deployment = env.KELEDON_DEPLOYMENT_ENV?.trim().toLowerCase();
  const explicitlyNonProduction =
    deployment === 'development' || deployment === 'staging';

  return (
    env.KELEDON_ENABLE_UAT_TEST_PROFILES === 'true' &&
    explicitlyNonProduction &&
    (deployment === 'staging' || env.NODE_ENV !== 'production') &&
    parseUatTestProfileIds(env.KELEDON_UAT_TEST_PROFILE_IDS).length > 0
  );
}

export function parseUatTestProfileIds(value?: string): string[] {
  if (!value) return [];
  return [
    ...new Set(
      value
        .split(',')
        .map((id) => id.trim())
        .filter(Boolean),
    ),
  ].slice(0, 50);
}

export function isPermittedUatTestProfile(user: {
  id: string;
  email: string;
  role: string;
  name?: string | null;
}): boolean {
  const email = user.email.trim().toLowerCase();
  return (
    Boolean(user.name?.trim()) &&
    ALLOWED_TEST_PROFILE_ROLES.has(user.role) &&
    TEST_EMAIL_SUFFIXES.some((suffix) => email.endsWith(suffix))
  );
}

export const UAT_TEST_PROFILE_TTL_MS = 10 * 60 * 1000;
export const UAT_TEST_PROFILE_AUDIT_ENTITY = 'UAT_TEST_PROFILE_SESSION';
