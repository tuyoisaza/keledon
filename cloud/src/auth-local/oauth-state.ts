import * as crypto from 'crypto';

const cookieName = 'keledon_oauth';
function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

export const oauthCookie = {
  name: cookieName,
  path: '/api/auth/google',
  httpOnly: true,
  sameSite: 'lax' as const,
  maxAge: 5 * 60 * 1000,
};
function secret() {
  const value = process.env.KELEDON_AUTH_SECRET;
  if (process.env.NODE_ENV === 'production' && !value)
    throw new Error('OAuth signing secret required');
  return value || 'keledon-dev-secret-do-not-use-in-production';
}
function sign(payload: string) {
  return crypto.createHmac('sha256', secret()).update(payload).digest('hex');
}
function equal(left: string, right: string) {
  return (
    left.length === right.length &&
    crypto.timingSafeEqual(Buffer.from(left), Buffer.from(right))
  );
}
export function createOAuthChallenge() {
  const state = crypto.randomBytes(32).toString('hex');
  const nonce = crypto.randomBytes(32).toString('hex');
  const payload = Buffer.from(
    JSON.stringify({
      state,
      nonce,
      expiresAt: Date.now() + oauthCookie.maxAge,
    }),
  ).toString('base64url');
  return { state, nonce, cookie: `${payload}.${sign(payload)}` };
}
export function validateOAuthChallenge(
  cookies: unknown,
  suppliedState: unknown,
): string | null {
  if (
    typeof cookies !== 'string' ||
    typeof suppliedState !== 'string' ||
    !/^[a-f0-9]{64}$/.test(suppliedState)
  )
    return null;
  const token = cookies
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(cookieName + '='))
    ?.slice(cookieName.length + 1);
  if (!token) return null;
  try {
    const [payload, signature, extra] = token.split('.');
    if (!payload || !signature || extra || !equal(sign(payload), signature))
      return null;
    const challenge = asRecord(
      JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')),
    );
    if (
      !challenge ||
      typeof challenge.state !== 'string' ||
      typeof challenge.nonce !== 'string' ||
      !/^[a-f0-9]{64}$/.test(challenge.nonce) ||
      typeof challenge.expiresAt !== 'number' ||
      !Number.isFinite(challenge.expiresAt) ||
      challenge.expiresAt <= Date.now() ||
      !equal(challenge.state, suppliedState)
    )
      return null;
    return challenge.nonce;
  } catch {
    return null;
  }
}
