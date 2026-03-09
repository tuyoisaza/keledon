export type RuntimeTier = 'DEV_LOCAL' | 'CI_PROOF' | 'PRODUCTION_MANAGED';

type EndpointKey = 'cloudBaseUrl' | 'qdrantUrl' | 'otelExporterUrl';

interface EndpointSpec {
  key: EndpointKey;
  service: string;
  canonicalEnv: string;
  legacyEnv: string[];
  devLocalDefault: string;
}

const ENDPOINT_SPECS: EndpointSpec[] = [
  {
    key: 'cloudBaseUrl',
    service: 'Cloud Base URL',
    canonicalEnv: 'KELEDON_CLOUD_BASE_URL',
    legacyEnv: ['BACKEND_URL'],
    devLocalDefault: 'http://localhost:3001',
  },
  {
    key: 'qdrantUrl',
    service: 'Qdrant',
    canonicalEnv: 'KELEDON_QDRANT_URL',
    legacyEnv: ['QDRANT_URL'],
    devLocalDefault: 'http://localhost:6333',
  },
  {
    key: 'otelExporterUrl',
    service: 'OTel Exporter',
    canonicalEnv: 'KELEDON_OTEL_EXPORTER_OTLP_TRACES_ENDPOINT',
    legacyEnv: ['OTEL_EXPORTER_OTLP_TRACES_ENDPOINT'],
    devLocalDefault: 'http://localhost:4318/v1/traces',
  },
];

const LOCAL_CORS_ORIGINS = ['http://localhost:5173', 'http://localhost:3000'];

export function getRuntimeTier(): RuntimeTier {
  const rawTier = (process.env.KELEDON_ENV_TIER || '').trim().toUpperCase();

  if (rawTier === 'DEV_LOCAL' || rawTier === 'CI_PROOF' || rawTier === 'PRODUCTION_MANAGED') {
    return rawTier;
  }

  if (process.env.CI === 'true') {
    return 'CI_PROOF';
  }

  return process.env.NODE_ENV === 'production' ? 'PRODUCTION_MANAGED' : 'DEV_LOCAL';
}

export function isManagedProductionTier(tier: RuntimeTier = getRuntimeTier()): boolean {
  return tier === 'PRODUCTION_MANAGED';
}

function hasLoopbackHost(urlValue: string): boolean {
  try {
    const parsed = new URL(urlValue);
    const host = parsed.hostname.toLowerCase();
    return host === 'localhost' || host === '127.0.0.1' || host === '::1';
  } catch {
    return false;
  }
}

function parseOrigins(raw: string): string[] {
  return raw
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
}

function requireCanonicalEndpoint(spec: EndpointSpec, tier: RuntimeTier): string {
  const canonicalValue = (process.env[spec.canonicalEnv] || '').trim();

  if (canonicalValue) {
    return canonicalValue;
  }

  const legacyHit = spec.legacyEnv.find((legacyName) => (process.env[legacyName] || '').trim());

  if (isManagedProductionTier(tier) && legacyHit) {
    throw new Error(
      `[Config] ${spec.service} must use ${spec.canonicalEnv} in PRODUCTION_MANAGED (legacy ${legacyHit} is not allowed).`,
    );
  }

  if (legacyHit) {
    return String(process.env[legacyHit]).trim();
  }

  if (tier === 'DEV_LOCAL') {
    return spec.devLocalDefault;
  }

  throw new Error(`[Config] Missing required ${spec.canonicalEnv} for tier ${tier}.`);
}

function assertEndpointAllowed(spec: EndpointSpec, value: string, tier: RuntimeTier): void {
  if (isManagedProductionTier(tier) && hasLoopbackHost(value)) {
    throw new Error(
      `[Config] ${spec.service} in PRODUCTION_MANAGED cannot target localhost/loopback (${value}).`,
    );
  }
}

export function resolveServiceEndpoints(tier: RuntimeTier = getRuntimeTier()): Record<EndpointKey, string> {
  const entries = ENDPOINT_SPECS.map((spec) => {
    const value = requireCanonicalEndpoint(spec, tier);
    assertEndpointAllowed(spec, value, tier);
    return [spec.key, value] as const;
  });

  return Object.fromEntries(entries) as Record<EndpointKey, string>;
}

export function resolveCorsOrigins(tier: RuntimeTier = getRuntimeTier()): string[] {
  const configured = (process.env.KELEDON_CLOUD_CORS_ORIGINS || process.env.CORS_ORIGINS || '').trim();

  if (!configured) {
    if (tier === 'DEV_LOCAL' || tier === 'CI_PROOF') {
      return LOCAL_CORS_ORIGINS;
    }
    throw new Error('[Config] KELEDON_CLOUD_CORS_ORIGINS is required in PRODUCTION_MANAGED.');
  }

  const origins = parseOrigins(configured);
  if (!origins.length) {
    throw new Error('[Config] KELEDON_CLOUD_CORS_ORIGINS must include at least one origin.');
  }

  if (isManagedProductionTier(tier)) {
    for (const origin of origins) {
      if (hasLoopbackHost(origin)) {
        throw new Error(
          `[Config] PRODUCTION_MANAGED cannot allow localhost/loopback CORS origin (${origin}).`,
        );
      }
    }
  }

  return origins;
}

async function assertReachable(label: string, url: string, init?: RequestInit): Promise<void> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    await fetch(url, {
      method: 'GET',
      ...init,
      signal: controller.signal,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`[Config] ${label} unreachable at ${url}: ${message}`);
  } finally {
    clearTimeout(timeout);
  }
}

export async function assertManagedRuntimeDependencies(): Promise<void> {
  const tier = getRuntimeTier();
  if (!isManagedProductionTier(tier)) {
    return;
  }

  const databaseUrl = (process.env.DATABASE_URL || '').trim();
  if (!databaseUrl) {
    throw new Error('[Config] DATABASE_URL is required in PRODUCTION_MANAGED.');
  }

  const endpoints = resolveServiceEndpoints(tier);
  await assertReachable('Managed Qdrant', `${endpoints.qdrantUrl.replace(/\/$/, '')}/collections`);
  await assertReachable('OTel exporter', endpoints.otelExporterUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{"resourceSpans":[]}',
  });
}
