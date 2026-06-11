import { API_URL } from './config';

/**
 * Get the current auth token from session storage.
 */
export function getAuthToken(): string | null {
  return sessionStorage.getItem('auth_token');
}

/**
 * Shared fetch wrapper that automatically attaches the auth token.
 * Use this instead of raw fetch() for all API calls.
 *
 * Usage:
 *   const data = await apiFetch('/api/flows');
 *   const res = await apiFetch('/api/flows', { method: 'POST', body: JSON.stringify(data) });
 */
export async function apiFetch(endpoint: string, options: RequestInit = {}): Promise<Response> {
  const token = getAuthToken();
  const url = endpoint.startsWith('http')
    ? endpoint
    : `${API_URL}${endpoint}`;
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
  const defaultHeaders = isFormData ? {} : { 'Content-Type': 'application/json' };

  return fetch(url, {
    ...options,
    headers: {
      ...defaultHeaders,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
}

/**
 * Like apiFetch but throws on non-OK responses and returns parsed JSON.
 */
export async function apiJson<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const res = await apiFetch(endpoint, options);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${res.status}: ${text || res.statusText}`);
  }
  return res.json() as Promise<T>;
}
