/** Trust is provisioned with the client, never learned from a deep link. */
const configuredClouds = [process.env.CLOUD_URL, ...(process.env.KELEDON_TRUSTED_CLOUD_ORIGINS || '').split(',')].filter(Boolean);
const trustedOrigins = new Set(['https://keledon.tuyoisaza.com', 'https://keledonapi.tuyoisaza.com', ...configuredClouds.flatMap(value => {
  try { const url = new URL(value); return [url.origin]; } catch { return []; }
})]);
export function normalizeTrustedCloudUrl(value: string): string {
  const url = new URL(value);
  const loopback = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  if (url.username || url.password || (url.protocol !== 'https:' && !(url.protocol === 'http:' && loopback)) || !trustedOrigins.has(url.origin)) {
    throw new Error('Cloud origin is not trusted by this client');
  }
  return url.origin;
}
