const UAT_DATABASE = 'keledon_phdk_uat';
const LOOPBACK_HOSTS = new Set(['127.0.0.1', 'localhost', '::1']);

function validateUatPrepTarget(env = process.env) {
  const nodeEnv = String(env.NODE_ENV || '').trim().toLowerCase();
  const deployment = String(env.KELEDON_DEPLOYMENT_ENV || '').trim().toLowerCase();
  if (env.KELEDON_UAT_PREP_CONFIRM !== 'true') {
    throw new Error('Set KELEDON_UAT_PREP_CONFIRM=true for the dedicated local UAT database.');
  }
  if (nodeEnv === 'production' || !['development', 'test'].includes(deployment)) {
    throw new Error('UAT Prep accepts development/test only; production and staging are not seed targets.');
  }
  if (!env.DATABASE_URL) throw new Error('DATABASE_URL is required for the dedicated local UAT database.');

  let target;
  try {
    target = new URL(env.DATABASE_URL);
  } catch {
    throw new Error('DATABASE_URL is invalid.');
  }
  const hostname = target.hostname.replace(/^\[|\]$/g, '').toLowerCase();
  const database = decodeURIComponent(target.pathname.replace(/^\/+/, ''));
  if (!['postgres:', 'postgresql:'].includes(target.protocol)) {
    throw new Error('UAT Prep requires PostgreSQL.');
  }
  if (!LOOPBACK_HOSTS.has(hostname)) {
    throw new Error('UAT Prep refuses non-loopback database hosts.');
  }
  if (database !== UAT_DATABASE) {
    throw new Error(`UAT Prep only accepts the dedicated ${UAT_DATABASE} database.`);
  }
  if (target.searchParams.get('sslmode') === 'require') {
    throw new Error('UAT Prep refuses remote-style SSL database configuration.');
  }
  return { host: hostname, port: target.port || '5432', database };
}

module.exports = { UAT_DATABASE, validateUatPrepTarget };
