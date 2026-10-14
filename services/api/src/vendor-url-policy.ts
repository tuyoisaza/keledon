const MAX_VENDOR_URL_LENGTH = 2048;
const MAX_VENDOR_ORIGINS = 32;

function parseWebUrl(value: unknown): URL {
  if (typeof value !== 'string' || value.length > MAX_VENDOR_URL_LENGTH) {
    throw new Error('Vendor URL must be a valid HTTP(S) address.');
  }
  const candidate = value.trim();
  const containsControlCharacter = [...candidate].some((character) => {
    const code = character.charCodeAt(0);
    return code <= 0x1f || code === 0x7f;
  });
  if (!candidate || containsControlCharacter) {
    throw new Error('Vendor URL must be a valid HTTP(S) address.');
  }
  let url: URL;
  try {
    url = new URL(candidate);
  } catch {
    throw new Error('Vendor URL must be a valid HTTP(S) address.');
  }
  if (
    !['http:', 'https:'].includes(url.protocol) ||
    !url.hostname ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  ) {
    throw new Error(
      'Vendor URLs must use HTTP(S) and cannot include credentials, query strings, or fragments.',
    );
  }
  return url;
}

export function normalizeVendorBaseUrl(value: unknown): string | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  return parseWebUrl(value).toString();
}

function parseOrigin(value: unknown): string {
  const url = parseWebUrl(value);
  if (url.pathname !== '/') {
    throw new Error(
      'Allowed vendor destinations must be origins without a path.',
    );
  }
  return url.origin;
}

export function normalizeVendorAllowedOrigins(
  baseUrl: unknown,
  configuredOrigins: unknown,
): string[] {
  const base = normalizeVendorBaseUrl(baseUrl);
  const origins = new Set<string>();
  if (base) origins.add(new URL(base).origin);
  if (configuredOrigins === undefined || configuredOrigins === null) {
    return [...origins];
  }
  if (
    !Array.isArray(configuredOrigins) ||
    configuredOrigins.length > MAX_VENDOR_ORIGINS
  ) {
    throw new Error(
      `Configure no more than ${MAX_VENDOR_ORIGINS} vendor destinations.`,
    );
  }
  for (const candidate of configuredOrigins)
    origins.add(parseOrigin(candidate));
  if (origins.size > MAX_VENDOR_ORIGINS) {
    throw new Error(
      `Configure no more than ${MAX_VENDOR_ORIGINS} vendor destinations.`,
    );
  }
  return [...origins].sort();
}

/** Read a persisted tenant allowlist fail-closed, always retaining only its base origin. */
export function getVendorAllowedOrigins(
  baseUrl: unknown,
  configuredOrigins: unknown,
): string[] {
  const origins = new Set<string>();
  try {
    const base = normalizeVendorBaseUrl(baseUrl);
    if (base) origins.add(new URL(base).origin);
  } catch {
    return [];
  }
  if (!Array.isArray(configuredOrigins)) return [...origins];
  for (const candidate of configuredOrigins.slice(0, MAX_VENDOR_ORIGINS)) {
    try {
      origins.add(parseOrigin(candidate));
    } catch {
      // A corrupt legacy entry does not expand the runtime allowlist.
    }
  }
  while (origins.size > MAX_VENDOR_ORIGINS) {
    const base = normalizeVendorBaseUrl(baseUrl);
    const baseOrigin = base ? new URL(base).origin : undefined;
    const last = [...origins].at(-1);
    if (last === baseOrigin || !last) break;
    origins.delete(last);
  }
  return [...origins].sort();
}

export function isAllowedVendorDestination(
  value: string,
  allowedOrigins: unknown,
): boolean {
  try {
    const url = parseWebUrl(value);
    return Array.isArray(allowedOrigins) && allowedOrigins.includes(url.origin);
  } catch {
    return false;
  }
}
