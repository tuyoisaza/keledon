const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const ts = require('typescript');
const cors = require('cors');

const packageRoot = path.resolve(__dirname, '../..');
const configPath = path.join(packageRoot, 'src/config/runtime-tier.ts');
const compiled = ts.transpileModule(fs.readFileSync(configPath, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const configModule = { exports: {} };
new Function('exports', 'module', 'require', compiled)(
  configModule.exports,
  configModule,
  require,
);

const envKeys = [
  'KELEDON_ENV_TIER',
  'NODE_ENV',
  'KELEDON_CLOUD_CORS_ORIGINS',
  'CORS_ORIGINS',
  'KELEDON_ALLOW_ALL_CORS',
];
const previousEnv = Object.fromEntries(envKeys.map((key) => [key, process.env[key]]));
const exactOrigins = ['https://keledon.tuyoisaza.com', 'chrome-extension://uat-extension-id'];

function restoreEnvironment() {
  for (const key of envKeys) {
    if (previousEnv[key] === undefined) delete process.env[key];
    else process.env[key] = previousEnv[key];
  }
}

function corsHeaders(origin, origins) {
  return new Promise((resolve, reject) => {
    const headers = new Map();
    const req = { method: 'GET', headers: { origin } };
    const res = {
      getHeader: (name) => headers.get(name),
      setHeader: (name, value) => headers.set(name, value),
      end: () => resolve(headers),
    };
    cors({ origin: origins, credentials: true })(req, res, (error) => {
      if (error) reject(error);
      else resolve(headers);
    });
  });
}

async function main() {
  process.env.KELEDON_ENV_TIER = 'PRODUCTION_MANAGED';
  process.env.NODE_ENV = 'production';
  process.env.KELEDON_CLOUD_CORS_ORIGINS = exactOrigins.join(',');
  process.env.CORS_ORIGINS = '';
  process.env.KELEDON_ALLOW_ALL_CORS = 'true';

  try {
    const configuredOrigins = configModule.exports.resolveCorsOrigins('PRODUCTION_MANAGED');
    assert.deepEqual(configuredOrigins, exactOrigins, 'production CORS uses the configured exact origins');

    const sourceFiles = [
      'src/main.ts',
      'src/gateways/agent.gateway.ts',
      'src/gateways/dashboard.gateway.ts',
      'src/gateways/device.gateway.ts',
      'src/voice/voice.types.ts',
      'src/voice/voice.gateway.ts',
      'src/listening-sessions/listening.gateway.ts',
    ];
    for (const file of sourceFiles) {
      const source = fs.readFileSync(path.join(packageRoot, file), 'utf8');
      assert.doesNotMatch(source, /KELEDON_ALLOW_ALL_CORS/, `${file} cannot bypass the origin list`);
      assert.doesNotMatch(source, /origin\s*:\s*true\b/, `${file} cannot reflect arbitrary origins`);
    }
    assert.match(
      fs.readFileSync(path.join(packageRoot, 'src/main.ts'), 'utf8'),
      /app\.enableCors\(\{\s*origin:\s*corsOrigins/s,
      'HTTP CORS is wired to the production origin resolver',
    );

    const allowed = await corsHeaders(exactOrigins[0], configuredOrigins);
    const denied = await corsHeaders('https://attacker.invalid', configuredOrigins);
    assert.equal(allowed.get('Access-Control-Allow-Origin'), exactOrigins[0]);
    assert.equal(allowed.get('Access-Control-Allow-Credentials'), 'true');
    assert.equal(denied.get('Access-Control-Allow-Origin'), undefined);
    const repoRoot = execFileSync('git', ['rev-parse', '--show-toplevel'], { cwd: packageRoot, encoding: 'utf8' }).trim();
    const candidateCommit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repoRoot, encoding: 'utf8' }).trim();
    const evidenceDir = process.env.KELEDON_UAT_EVIDENCE_DIR
      ? path.resolve(process.env.KELEDON_UAT_EVIDENCE_DIR)
      : path.join(repoRoot, 'docs/phdk/lifecycle/20261014-0007-phdk-auto-completion/50-uat/evidence');
    fs.mkdirSync(evidenceDir, { recursive: true });
    fs.writeFileSync(path.join(evidenceDir, 'uat-092-cors-allowlist-api-5.1.82.json'), `${JSON.stringify({
      run_id: '20261014-0007-phdk-auto-completion',
      case: 'UAT-092',
      package: 'services/api',
      candidate_version: require(path.join(packageRoot, 'package.json')).version,
      candidate_commit: candidateCommit,
      target: 'isolated cors middleware invocation with synthetic origins; no listening socket',
      production_allowlist: exactOrigins,
      legacy_allow_all_flag_set: true,
      result: 'PASS',
      assertions: ['Configured exact origin receives Access-Control-Allow-Origin and credentials.', 'Unlisted origin receives no Access-Control-Allow-Origin.', 'HTTP and credentialed Socket.IO gateway source does not read the legacy allow-all flag.'],
      external_traffic: 'none',
      database_or_provider: 'not used',
    }, null, 2)}\n`);
    console.log('PASS CORS allowlist: configured origins are served; unrelated origins receive no CORS grant, even when the legacy bypass flag is set.');
  } finally {
    restoreEnvironment();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
