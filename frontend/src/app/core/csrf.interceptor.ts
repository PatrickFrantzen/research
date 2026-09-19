import { HttpInterceptorFn } from '@angular/common/http';
import { istEigeneApi } from './eigene-api.js';

const SICHERE_METHODEN = new Set(['GET', 'HEAD', 'OPTIONS']);

// Das CSRF-Cookie ist bewusst nicht HttpOnly (siehe Backend
// auth.controller.ts), damit dieser Code es lesen und als Header
// mitschicken kann – das Double-Submit-Pattern beweist damit "eigenes JS,
// nicht eine fremde Seite" (Issue #24).
function leseCsrfCookie(): string | null {
  const treffer = /(?:^|; )csrfToken=([^;]*)/.exec(document.cookie);
  return treffer ? decodeURIComponent(treffer[1]) : null;
}

export const csrfInterceptor: HttpInterceptorFn = (req, next) => {
  if (SICHERE_METHODEN.has(req.method) || !istEigeneApi(req.url)) {
    return next(req);
  }
  const csrfToken = leseCsrfCookie();
  if (!csrfToken) {
    return next(req);
  }
  return next(req.clone({ setHeaders: { 'X-CSRF-Token': csrfToken } }));
};
