import type { Request } from 'express';
import { CSRF_COOKIE, CSRF_HEADER } from './auth-cookies.js';

const SICHERE_METHODEN = new Set(['GET', 'HEAD', 'OPTIONS']);

// Double-Submit-Cookie-Check: der Browser schickt das CSRF-Cookie bei jedem
// Request automatisch mit, aber nur eigenes JS (same-origin) kann den Wert
// auch als Header setzen – eine fremde Seite kennt den Cookie-Wert nicht
// (Issue #24). Nur für state-changing Requests relevant.
export function csrfIstGueltig(req: Pick<Request, 'method' | 'cookies' | 'headers'>): boolean {
  if (SICHERE_METHODEN.has(req.method)) {
    return true;
  }
  const cookieToken = req.cookies?.[CSRF_COOKIE];
  const headerToken = req.headers[CSRF_HEADER];
  return (
    typeof cookieToken === 'string' &&
    cookieToken.length > 0 &&
    typeof headerToken === 'string' &&
    cookieToken === headerToken
  );
}
