const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const ts = require('typescript');
class HttpError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}
const decorator = () => () => {};
function load(file, adapters = {}) {
  const module = { exports: {} };
  const code = ts.transpileModule(
    fs.readFileSync(path.join(__dirname, '../../src', file), 'utf8'),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2020,
        experimentalDecorators: true,
      },
    },
  ).outputText;
  vm.runInNewContext(code, {
    module,
    exports: module.exports,
    process,
    Buffer,
    Date,
    console,
    require: (name) =>
      name === 'crypto'
        ? crypto
        : name.startsWith('@nestjs/')
          ? new Proxy(
              { HttpException: HttpError },
              { get: (obj, key) => obj[key] || decorator },
            )
          : adapters[name] || {},
  });
  return module.exports;
}
const challenge = load('auth-local/oauth-state.ts');
const { AuthAttemptGuard } = load('guards/auth-attempt.guard.ts');
let expectedNonce, idPayload, generatedOptions;
class FakeOAuthClient {
  generateAuthUrl(options) {
    generatedOptions = options;
    return 'https://provider.example.invalid';
  }
  async getToken() {
    return {
      tokens: { access_token: 'isolated-access', id_token: 'isolated-id' },
    };
  }
  setCredentials() {}
  async verifyIdToken() {
    return { getPayload: () => idPayload };
  }
}
const { GoogleOAuthService } = load('auth-local/google-oauth.service.ts', {
  'google-auth-library': { OAuth2Client: FakeOAuthClient },
});
const { LocalAuthController } = load('auth-local/auth-local.controller.ts', {
  './oauth-state': challenge,
  '../guards/auth-attempt.guard': { AuthAttemptGuard },
  '../guards/public.decorator': { Public: decorator },
});
async function main() {
  process.env.KELEDON_AUTH_SECRET = 'isolated-oauth-secret';
  const issued = challenge.createOAuthChallenge();
  assert.notEqual(issued.state, issued.nonce);
  const cookie = challenge.oauthCookie.name + '=' + issued.cookie;
  assert.equal(
    challenge.validateOAuthChallenge(cookie, issued.state),
    issued.nonce,
  );
  assert.equal(challenge.validateOAuthChallenge(undefined, issued.state), null);
  assert.equal(challenge.validateOAuthChallenge(cookie, '0'.repeat(64)), null);
  assert.equal(
    challenge.validateOAuthChallenge(cookie + 'tamper', issued.state),
    null,
  );
  const payload = JSON.parse(
    Buffer.from(issued.cookie.split('.')[0], 'base64url').toString(),
  );
  payload.expiresAt = Date.now() - 1;
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', process.env.KELEDON_AUTH_SECRET)
    .update(encoded)
    .digest('hex');
  assert.equal(
    challenge.validateOAuthChallenge(
      challenge.oauthCookie.name + '=' + encoded + '.' + signature,
      issued.state,
    ),
    null,
  );
  const google = new GoogleOAuthService({ get: () => 'isolated-client-id' });
  google.getAuthUrl(issued.state, issued.nonce);
  assert.equal(generatedOptions.state, issued.state);
  assert.equal(generatedOptions.nonce, issued.nonce);
  idPayload = {
    sub: 'provider-id',
    email: 'fixture@example.invalid',
    email_verified: true,
    nonce: 'wrong',
  };
  await assert.rejects(() => google.verifyCode('fake-code', issued.nonce));
  idPayload.nonce = issued.nonce;
  idPayload.email_verified = false;
  await assert.rejects(() => google.verifyCode('fake-code', issued.nonce));
  idPayload.email_verified = true;
  assert.equal(
    (await google.verifyCode('fake-code', issued.nonce)).email,
    'fixture@example.invalid',
  );
  let verified = 0,
    status,
    redirected,
    cleared;
  const controller = new LocalAuthController(
    {
      findOrCreateGoogleUser: async () => ({
        id: 'u-a',
        email: 'fixture@example.invalid',
        role: 'user',
        name: 'Fixture',
      }),
      generateToken: () => 'isolated-user-token',
    },
    {
      verifyCode: async (_code, nonce) => {
        verified++;
        expectedNonce = nonce;
        return { id: 'provider-id', email: 'fixture@example.invalid' };
      },
    },
    { get: () => 'isolated-client' },
  );
  const res = {
    clearCookie: (name) => {
      cleared = name;
    },
    status: (code) => {
      status = code;
      return res;
    },
    json: (value) => value,
    redirect: (value) => {
      redirected = value;
    },
  };
  await controller.googleCallback(
    'fake-code',
    issued.state,
    { headers: {} },
    res,
  );
  assert.equal(status, 400);
  assert.equal(verified, 0);
  await controller.googleCallback(
    'fake-code',
    issued.state,
    { headers: { cookie } },
    res,
  );
  assert.equal(verified, 1);
  assert.equal(expectedNonce, issued.nonce);
  assert.equal(cleared, challenge.oauthCookie.name);
  assert.equal(redirected.startsWith('/login?token='), true);
  const throttle = new AuthAttemptGuard();
  const context = (ip) => ({
    getHandler: () => ({ name: 'pairDevice' }),
    switchToHttp: () => ({ getRequest: () => ({ ip }) }),
  });
  for (let i = 0; i < 20; i++)
    assert.equal(throttle.canActivate(context('isolated-ip')), true);
  assert.throws(
    () => throttle.canActivate(context('isolated-ip')),
    (error) => error.status === 429,
  );
  assert.equal(throttle.canActivate(context('second-ip')), true);
  for (let i = 0; i < 2100; i++) throttle.canActivate(context('fixture-' + i));
  assert.equal(throttle.attempts.size <= 2048, true);
  console.log(
    'PASS OAuth/abuse: callback browser binding/state/signature/expiry/nonce/verified-email negatives, safe valid callback, wired guard finite per-IP limit and bounded memory. No OAuth/provider request executed.',
  );
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
