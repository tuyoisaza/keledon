/**
 * CRUD Helpers - Shared utilities for CRUD operations
 *
 * Provides an error buffer and console.error interception for auditing
 * runtime errors across all CRUD service operations.
 */

/** In-memory ring buffer for captured error messages */
export const errorBuffer: string[] = [];
const MAX_ERRORS = 50;

/** Append a timestamped entry to the error ring buffer */
export function captureError(msg: string): void {
  const entry = `${new Date().toISOString()} | ${msg}`;
  errorBuffer.push(entry);
  if (errorBuffer.length > MAX_ERRORS) {
    errorBuffer.shift();
  }
}

/** Intercept console.error to buffer errors for diagnostics */
const originalConsoleError = console.error;
console.error = (...args: any[]): void => {
  const msg = args
    .map((a: any) => (typeof a === 'object' ? JSON.stringify(a) : String(a)))
    .join(' ');
  captureError(msg);
  originalConsoleError.apply(console, args);
};
