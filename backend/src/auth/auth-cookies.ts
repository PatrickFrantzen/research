import { randomBytes } from 'node:crypto';

// HttpOnly-Cookie für den Access-Token (JS kann ihn nicht lesen, schützt vor
// Diebstahl per XSS) + Double-Submit-CSRF-Cookie, siehe Issue #24.
export const ACCESS_TOKEN_COOKIE = 'accessToken';
export const CSRF_COOKIE = 'csrfToken';
export const CSRF_HEADER = 'x-csrf-token';

export function erzeugeCsrfToken(): string {
  return randomBytes(32).toString('hex');
}
