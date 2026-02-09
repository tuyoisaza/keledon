const http = require('http');

const port = Number(process.env.OBS_PROXY_PORT || 3014);
const grafanaUrl = process.env.OBS_GRAFANA_URL || 'http://keledon-grafana:3000';
const jaegerUrl = process.env.OBS_JAEGER_URL || 'http://keledon-jaeger:16686';
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseUrlInternal = process.env.SUPABASE_URL_INTERNAL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const requiredRole = process.env.OBS_REQUIRED_ROLE || 'ROLE_SUPERADMIN_OBSERVER';

const allowedMethods = new Set(['GET', 'HEAD', 'OPTIONS']);

function writeJson(res, statusCode, payload) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(payload));
}

function extractBearerToken(req) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return null;
  }

  return header.slice('Bearer '.length).trim();
}

async function verifySupabaseToken(token) {
  const authBaseUrl = supabaseUrlInternal || supabaseUrl;
  let response;
  try {
    response = await fetch(`${authBaseUrl}/auth/v1/user`, {
      method: 'GET',
      headers: {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${token}`,
      },
    });
  } catch (_error) {
    return { valid: false, error: 'auth_source_unreachable' };
  }

  if (!response.ok) {
    return { valid: false, error: `supabase_status_${response.status}` };
  }

  const user = await response.json();
  return { valid: true, user };
}

function extractUserRole(user) {
  const appRoles = Array.isArray(user?.app_metadata?.roles) ? user.app_metadata.roles : [];
  if (appRoles.length > 0) {
    return appRoles[0];
  }

  if (typeof user?.app_metadata?.role === 'string') {
    return user.app_metadata.role;
  }

  if (typeof user?.user_metadata?.role === 'string') {
    return user.user_metadata.role;
  }

  if (typeof user?.role === 'string') {
    return user.role;
  }

  return null;
}

function hasRequiredRole(user, roleName) {
  const appRoles = Array.isArray(user?.app_metadata?.roles) ? user.app_metadata.roles : [];
  const candidates = new Set([
    ...appRoles,
    user?.app_metadata?.role,
    user?.user_metadata?.role,
    user?.role,
  ].filter(Boolean));

  return candidates.has(roleName);
}

function resolveTarget(reqUrl) {
  const url = new URL(reqUrl, `http://localhost:${port}`);

  if (url.pathname.startsWith('/grafana')) {
    const upstreamPath = url.pathname.replace('/grafana', '') || '/';
    return `${grafanaUrl}${upstreamPath}${url.search}`;
  }

  if (url.pathname.startsWith('/jaeger')) {
    const upstreamPath = url.pathname.replace('/jaeger', '') || '/';
    return `${jaegerUrl}${upstreamPath}${url.search}`;
  }

  return `${grafanaUrl}${url.pathname}${url.search}`;
}

function dashboardIdFromPath(reqUrl) {
  const url = new URL(reqUrl, `http://localhost:${port}`);
  const normalizedPath = url.pathname.startsWith('/grafana')
    ? url.pathname.replace('/grafana', '') || '/'
    : url.pathname;

  if (normalizedPath.startsWith('/d/')) {
    return normalizedPath.split('/')[2] || 'keledon-superadmin-otel';
  }

  return 'keledon-superadmin-otel';
}

function auditAccessEvent({ userId, role, dashboardId, path, method, allowed, reason }) {
  const event = {
    event: 'superadmin.dashboard.access',
    user_id: userId || 'unknown',
    role: role || 'unknown',
    timestamp: new Date().toISOString(),
    dashboard_id: dashboardId,
    path,
    method,
    allowed,
    access: allowed ? 'allow' : 'deny',
    reason,
  };

  console.log(`[C16-TELEMETRY] ${JSON.stringify(event)}`);
}

async function proxyRequest(req, res, upstreamUrl) {
  const upstreamResponse = await fetch(upstreamUrl, {
    method: req.method,
    headers: {
      accept: req.headers.accept || '*/*',
    },
  });

  const body = Buffer.from(await upstreamResponse.arrayBuffer());
  const headers = {};

  upstreamResponse.headers.forEach((value, key) => {
    if (key.toLowerCase() === 'transfer-encoding') {
      return;
    }
    headers[key] = value;
  });

  res.writeHead(upstreamResponse.status, headers);
  res.end(body);
}

function assertConfig() {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('SUPABASE_URL and SUPABASE_ANON_KEY are required for RBAC enforcement.');
  }
}

async function handleRequest(req, res) {
  const requestPath = new URL(req.url || '/', `http://localhost:${port}`).pathname;
  const requestMethod = req.method || 'UNKNOWN';

  if (!allowedMethods.has(req.method || '')) {
    auditAccessEvent({
      userId: null,
      role: null,
      dashboardId: dashboardIdFromPath(req.url || '/'),
      path: requestPath,
      method: requestMethod,
      allowed: false,
      reason: 'method_not_allowed',
    });
    writeJson(res, 405, { error: 'read_only_observability_methods_only' });
    return;
  }

  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,HEAD,OPTIONS',
      'Access-Control-Allow-Headers': 'Authorization,Content-Type',
    });
    res.end();
    return;
  }

  const dashboardId = dashboardIdFromPath(req.url || '/');
  const token = extractBearerToken(req);
  if (!token) {
    auditAccessEvent({
      userId: null,
      role: null,
      dashboardId,
      path: requestPath,
      method: requestMethod,
      allowed: false,
      reason: 'missing_bearer_token',
    });
    writeJson(res, 401, { error: 'missing_bearer_token' });
    return;
  }

  const verification = await verifySupabaseToken(token);
  if (!verification.valid) {
    auditAccessEvent({
      userId: null,
      role: null,
      dashboardId,
      path: requestPath,
      method: requestMethod,
      allowed: false,
      reason: verification.error || 'invalid_token',
    });
    writeJson(res, 401, { error: 'invalid_token' });
    return;
  }

  const user = verification.user;
  const role = extractUserRole(user);
  const authorized = hasRequiredRole(user, requiredRole);

  if (!authorized) {
    auditAccessEvent({
      userId: user?.id,
      role,
      dashboardId,
      path: requestPath,
      method: requestMethod,
      allowed: false,
      reason: 'missing_required_role',
    });
    writeJson(res, 403, { error: 'forbidden_role_required', required_role: requiredRole });
    return;
  }

  const upstreamUrl = resolveTarget(req.url || '/');
  auditAccessEvent({
    userId: user?.id,
    role,
    dashboardId,
    path: requestPath,
    method: requestMethod,
    allowed: true,
    reason: 'authorized',
  });

  await proxyRequest(req, res, upstreamUrl);
}

async function main() {
  assertConfig();

  const server = http.createServer((req, res) => {
    handleRequest(req, res).catch((error) => {
      console.error('[C16-RBAC][FAIL]', error.message);
      writeJson(res, 500, { error: 'observability_proxy_failure' });
    });
  });

  server.listen(port, () => {
    console.log(`[C16-RBAC] Observability RBAC proxy listening on ${port}`);
    console.log(`[C16-RBAC] Required role: ${requiredRole}`);
  });
}

main().catch((error) => {
  console.error('[C16-RBAC][BOOTSTRAP_FAIL]', error.message);
  process.exit(1);
});
